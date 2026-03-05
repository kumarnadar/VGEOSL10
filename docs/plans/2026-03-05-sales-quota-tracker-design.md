# Sales Quota Tracker -- Design Document

**Date:** 2026-03-05
**Status:** Approved

## Problem

The Zoho CRM dashboard shows weekly activity metrics and year-to-date revenue, but there is no way to see how each sales team member is tracking against their quarterly quota. Leadership needs a per-user view of quota vs pipeline vs closed deals to evaluate sales performance during meetings.

## Solution

Add a 3rd section to the Zoho dashboard tab: a horizontal bar chart showing each user's quota attainment for the selected quarter, with pipeline and won deals visualized against their quota target.

## Layout

**Position:** Below "CRM Revenue -- Year to Date" on the Zoho tab

**Sections on Zoho tab (top to bottom):**
1. CRM Weekly Metrics (2 rows of cards)
2. CRM Revenue -- Year to Date (bar chart + stat cards)
3. **Sales Quota Tracker (new)** -- horizontal bar chart per user

## Design

### Header
- Title: "Sales Quota -- Q1 2026"
- Quarter dropdown: Q1/Q2/Q3/Q4 of current year (defaults to current quarter)

### Chart: Horizontal Stacked Bar
- One row per user (from Zoho, mapped via profiles.zoho_user_id)
- User name label on left
- Gray dashed vertical line at quota amount (the target)
- Green bar = closed won value (deals won in selected quarter)
- Blue bar = pipeline value (open deals with closing date in selected quarter)
- Green bar renders first (from 0), blue bar stacks on top of it
- Dollar labels on X-axis, tooltip on hover showing exact quota/pipeline/won values
- Users sorted by % of quota achieved (highest first)
- Users without a Zoho quota (e.g., Lee) show "No quota set" with just pipeline/won bars (no target line)
- If a user exceeds quota, bar extends past the target line (natural overflow)

### Click Behavior
- Clicking a user's bar opens a Sheet drilldown
- Sheet has two collapsible sections:
  - **Won Deals** (green accent) -- deals closed won in selected quarter
  - **Pipeline Deals** (blue accent) -- open deals with closing date in selected quarter
- Table columns: Deal, Account, Amount, Stage, Close Date
- Consistent with existing drilldown patterns in weekly metrics and CRM revenue sections

## Data Sources

### Quota
- **Source:** EOS app database (`user_quotas` table)
- **Reason:** Zoho Targets API requires `ZohoCRM.modules.Forecasts.READ` scope (not currently authorized). Quotas stored locally with plan to pull from Zoho in a future iteration.
- **Table:** `user_quotas (user_id, quarter, year, amount)` -- admins manage via Settings UI
- **Fallback:** If no quota exists for a user, show pipeline + won bars without a quota target

### Pipeline + Won Deals
- **Source:** Zoho CRM Deals module (same as existing revenue API)
- **Filter:** Closing_Date within selected quarter + Stage filtering
- Pipeline = deals NOT in Closed Won or Closed Lost
- Won = deals in Closed Won stage with Closing_Date in the quarter

## API

### New Endpoint: `/api/zoho/quota-tracker`

**Query params:**
- `quarter` (required): Q1, Q2, Q3, Q4
- `year` (optional): defaults to current year

**Response:**
```json
{
  "quarter": "Q1",
  "year": 2026,
  "users": [
    {
      "name": "Shree Sannabhadti",
      "zohoUserId": "90150000000034005",
      "quota": 200000,
      "pipeline": 145000,
      "won": 220000,
      "pipelineDeals": [
        {
          "name": "Deal Name",
          "account": "Account Name",
          "amount": 50000,
          "stage": "Presenting Proposal",
          "closingDate": "2026-03-15"
        }
      ],
      "wonDeals": [
        {
          "name": "Deal Name",
          "account": "Account Name",
          "amount": 75000,
          "stage": "Closed Won",
          "closingDate": "2026-02-10"
        }
      ]
    }
  ],
  "lastUpdated": "2026-03-05T14:30:00.000Z"
}
```

## Component

### New: `ZohoQuotaTracker`
- **File:** `src/components/zoho-quota-tracker.tsx`
- **Props:** `{ groupId?: string }`
- **State:** `selectedQuarter` (defaults to current), `activeUser` (for drilldown Sheet)
- **Data fetching:** SWR with key `/api/zoho/quota-tracker?quarter=Q1&year=2026`
- **Chart library:** Recharts (already in use) -- `BarChart` with horizontal layout (`layout="vertical"`)
- **Drilldown:** Reuses Sheet + collapsible UserSection pattern from existing components

### Integration
- Rendered inside `ZohoCrmSection` below the existing CRM Revenue card
- Passed `groupId` prop for consistency

## Edge Cases
- User with no Zoho quota: show bars without target line, label "No quota set"
- User with $0 pipeline and $0 won: show empty bar with just the quota target line
- Quarter with no deals: show all users at $0 with their quota targets
- Zoho Targets API unavailable/error: show chart without quota lines, note "Quota data unavailable"

## Dependencies
- Zoho OAuth scope: `ZohoCRM.Settings.ALL` (already configured)
- Recharts (already installed)
- profiles.zoho_user_id (already populated for 5 of 6 users)
