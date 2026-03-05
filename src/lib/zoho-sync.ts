// src/lib/zoho-sync.ts
//
// Core Zoho -> Scorecard sync logic, shared by:
//   - POST /api/zoho/sync-scorecard  (admin-triggered, one group/week)
//   - GET  /api/cron/sync-scorecard  (Vercel Cron, all groups, last week)

import { SupabaseClient } from '@supabase/supabase-js'
import { searchRecords, getReportingWindowForDate, ZohoRecord } from '@/lib/zoho'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SyncResult {
  weeksProcessed: number
  entriesUpserted: number
  unmappedZohoUsers: string[]
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ZohoUserRef {
  id: string
  name: string
}

interface MeasureRow {
  id: string
  name: string
  zoho_field_mapping: string
  section_id: string
}

interface SectionRow {
  id: string
  name: string
  template_id: string
}

interface ProfileRow {
  id: string
  zoho_user_id: string
  team_region: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the Zoho user reference from a record's owner field. */
function extractUser(record: ZohoRecord, field: string): ZohoUserRef | null {
  const raw = record[field] as { id?: string; name?: string } | null
  if (!raw?.id) return null
  return { id: raw.id, name: raw.name || 'Unknown' }
}

/**
 * Given the weekEnding date string (YYYY-MM-DD), compute a reference date
 * that falls within that week.  We subtract one day from weekEnding so that
 * getReportingWindowForDate can anchor the window correctly regardless of
 * the meeting_day setting.
 */
function refDateForWeekEnding(weekEnding: string): Date {
  const d = new Date(`${weekEnding}T12:00:00Z`) // noon UTC avoids DST edge cases
  d.setUTCDate(d.getUTCDate() - 1)
  return d
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Sync Zoho CRM data into scorecard_entries for one group across N weeks.
 *
 * @param supabase  - A Supabase client with sufficient privileges (service role for cron,
 *                    anon+cookie for API route after auth check).
 * @param groupId   - UUID of the group to sync.
 * @param weekEnding - ISO date string (YYYY-MM-DD) of the most recent week to sync.
 * @param weeks     - How many consecutive weeks to sync going backwards (default 1).
 */
export async function syncZohoToScorecard(
  supabase: SupabaseClient,
  groupId: string,
  weekEnding: string,
  weeks = 1,
): Promise<SyncResult> {
  // ------------------------------------------------------------------
  // 1. Load group settings (meeting_day)
  // ------------------------------------------------------------------
  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .select('id, meeting_day')
    .eq('id', groupId)
    .single()

  if (groupErr || !group) {
    throw new Error(`Group ${groupId} not found: ${groupErr?.message}`)
  }

  const meetingDay: number = group.meeting_day ?? 4 // default Thursday

  // ------------------------------------------------------------------
  // 2. Load scorecard template + sections + measures with Zoho mappings
  // ------------------------------------------------------------------
  const { data: template, error: tmplErr } = await supabase
    .from('scorecard_templates')
    .select('id')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .single()

  if (tmplErr || !template) {
    throw new Error(`No active scorecard template for group ${groupId}: ${tmplErr?.message}`)
  }

  const { data: sections, error: secErr } = await supabase
    .from('scorecard_sections')
    .select('id, name, template_id')
    .eq('template_id', template.id)

  if (secErr || !sections?.length) {
    throw new Error(`No sections found for template ${template.id}: ${secErr?.message}`)
  }

  const sectionIds = sections.map((s: SectionRow) => s.id)

  const { data: allMeasures, error: measErr } = await supabase
    .from('scorecard_measures')
    .select('id, name, zoho_field_mapping, section_id')
    .in('section_id', sectionIds)
    .not('zoho_field_mapping', 'is', null)

  if (measErr) {
    throw new Error(`Failed to load measures: ${measErr.message}`)
  }

  const measures: MeasureRow[] = allMeasures || []

  if (!measures.length) {
    // Nothing mapped — return without error
    return { weeksProcessed: weeks, entriesUpserted: 0, unmappedZohoUsers: [] }
  }

  // Build section lookup: sectionId -> section name
  const sectionById: Record<string, SectionRow> = {}
  for (const s of sections as SectionRow[]) {
    sectionById[s.id] = s
  }

  // Build measure lookup: zoho_field_mapping -> list of measures (one per section/region)
  const measuresByMapping: Record<string, MeasureRow[]> = {}
  for (const m of measures) {
    if (!measuresByMapping[m.zoho_field_mapping]) {
      measuresByMapping[m.zoho_field_mapping] = []
    }
    measuresByMapping[m.zoho_field_mapping].push(m)
  }

  // ------------------------------------------------------------------
  // 3. Load EOS profiles that have a zoho_user_id set
  // ------------------------------------------------------------------
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, zoho_user_id, team_region')
    .not('zoho_user_id', 'is', null)

  if (profErr) {
    throw new Error(`Failed to load profiles: ${profErr.message}`)
  }

  // zohoUserId -> ProfileRow
  const profileByZohoId: Record<string, ProfileRow> = {}
  for (const p of (profiles || []) as ProfileRow[]) {
    if (p.zoho_user_id) {
      profileByZohoId[p.zoho_user_id] = p
    }
  }

  // ------------------------------------------------------------------
  // 4. Iterate weeks
  // ------------------------------------------------------------------
  let totalUpserted = 0
  const unmappedSet = new Set<string>()

  // Build list of weekEnding dates to process (most recent first)
  const weekEndingDates: string[] = []
  const baseDate = new Date(`${weekEnding}T12:00:00Z`)
  for (let i = 0; i < weeks; i++) {
    const d = new Date(baseDate)
    d.setUTCDate(baseDate.getUTCDate() - i * 7)
    weekEndingDates.push(d.toISOString().slice(0, 10))
  }

  for (const currentWeekEnding of weekEndingDates) {
    const refDate = refDateForWeekEnding(currentWeekEnding)
    const win = getReportingWindowForDate(meetingDay, refDate)

    // ----------------------------------------------------------------
    // 4a. Fetch all 4 Zoho result sets for this window in parallel
    // ----------------------------------------------------------------
    const [contacts, events, newDeals, proposalDeals] = await Promise.all([
      searchRecords(
        'Contacts',
        'Full_Name,Created_By,Created_Time',
        `(Created_Time:between:${win.start},${win.end})`,
      ).catch(() => [] as ZohoRecord[]),

      searchRecords(
        'Events',
        'Event_Title,Created_By,Start_DateTime,First_Time_Meeting',
        `((First_Time_Meeting:equals:true)and(Start_DateTime:between:${win.start},${win.end}))`,
      ).catch(() => [] as ZohoRecord[]),

      searchRecords(
        'Deals',
        'Deal_Name,Created_By,Created_Time',
        `(Created_Time:between:${win.start},${win.end})`,
      ).catch(() => [] as ZohoRecord[]),

      searchRecords(
        'Deals',
        'Deal_Name,Amount,Owner,Stage,Modified_Time',
        `((Stage:equals:Prepare Proposal)or(Stage:equals:Presenting Proposal))and(Modified_Time:between:${win.start},${win.end})`,
      ).catch(() => [] as ZohoRecord[]),
    ])

    // ----------------------------------------------------------------
    // 4b. Aggregate counts and amounts per Zoho user
    // ----------------------------------------------------------------

    // Helper: count records per zoho user id (using Created_By)
    function countByCreatedBy(records: ZohoRecord[]): Record<string, number> {
      const out: Record<string, number> = {}
      for (const r of records) {
        const u = extractUser(r, 'Created_By')
        if (!u) continue
        out[u.id] = (out[u.id] || 0) + 1
      }
      return out
    }

    const contactsByUser = countByCreatedBy(contacts)
    const eventsByUser = countByCreatedBy(events)
    const newDealsByUser = countByCreatedBy(newDeals)

    // Proposals: count and sum Amount, grouped by Owner
    const proposalCountByUser: Record<string, number> = {}
    const proposalValueByUser: Record<string, number> = {}
    for (const r of proposalDeals) {
      const u = extractUser(r, 'Owner')
      if (!u) continue
      proposalCountByUser[u.id] = (proposalCountByUser[u.id] || 0) + 1
      proposalValueByUser[u.id] = (proposalValueByUser[u.id] || 0) + (Number(r.Amount) || 0)
    }

    // Collect all distinct Zoho user IDs seen across all result sets
    const allZohoUserIds = new Set<string>([
      ...Object.keys(contactsByUser),
      ...Object.keys(eventsByUser),
      ...Object.keys(newDealsByUser),
      ...Object.keys(proposalCountByUser),
    ])

    // ----------------------------------------------------------------
    // 4c. Map Zoho user -> EOS profile -> measure, then upsert
    // ----------------------------------------------------------------

    // metric key -> per-user value map
    const metricData: Record<string, Record<string, number>> = {
      'zoho:contacts': contactsByUser,
      'zoho:firstTimeMeetings': eventsByUser,
      'zoho:newPotentials': newDealsByUser,
      'zoho:proposalsCount': proposalCountByUser,
      'zoho:proposalsValue': proposalValueByUser,
    }

    const entriesToUpsert: {
      measure_id: string
      user_id: string
      week_ending: string
      value: number
      source: string
    }[] = []

    for (const zohoUserId of allZohoUserIds) {
      const profile = profileByZohoId[zohoUserId]

      if (!profile) {
        unmappedSet.add(zohoUserId)
        continue
      }

      // Determine which section name matches this user's team_region
      // team_region 'India' -> section name contains 'India'
      // team_region 'US' (or null/other) -> section name contains 'US'
      const regionLabel = profile.team_region === 'India' ? 'India' : 'US'

      for (const [mappingKey, userValueMap] of Object.entries(metricData)) {
        const value = userValueMap[zohoUserId]
        if (value === undefined) continue // this user has no data for this metric

        // Find the measure whose section matches this user's region
        const candidateMeasures = measuresByMapping[mappingKey] || []
        const measure = candidateMeasures.find((m) => {
          const sectionName = sectionById[m.section_id]?.name || ''
          return sectionName.includes(regionLabel)
        })

        if (!measure) continue // no mapped measure for this region

        entriesToUpsert.push({
          measure_id: measure.id,
          user_id: profile.id,
          week_ending: currentWeekEnding,
          value,
          source: 'zoho',
        })
      }
    }

    // ----------------------------------------------------------------
    // 4d. Upsert entries in a single batch
    // ----------------------------------------------------------------
    if (entriesToUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('scorecard_entries')
        .upsert(entriesToUpsert, {
          onConflict: 'measure_id,user_id,week_ending',
          ignoreDuplicates: false, // always overwrite with latest Zoho value
        })

      if (upsertErr) {
        throw new Error(
          `Failed to upsert scorecard_entries for week ${currentWeekEnding}: ${upsertErr.message}`,
        )
      }

      totalUpserted += entriesToUpsert.length
    }
  }

  return {
    weeksProcessed: weeks,
    entriesUpserted: totalUpserted,
    unmappedZohoUsers: Array.from(unmappedSet),
  }
}
