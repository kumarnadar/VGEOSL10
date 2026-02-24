'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

const DETAIL_FIELDS = [
  { key: 'location', label: 'Location' },
  { key: 'prospect_value', label: 'Value' },
  { key: 'pipeline_status', label: 'Pipeline Status' },
  { key: 'key_decision_maker', label: 'Key Decision Maker' },
  { key: 'weekly_action', label: 'Weekly Action' },
  { key: 'obstacles', label: 'Obstacles' },
  { key: 'resources_needed', label: 'Resources Needed' },
  { key: 'strategy', label: 'Strategy' },
]

interface FocusItemSummary {
  id: string
  priority: string | null
  company_subject: string
  prospect_value: number | null
  pipeline_status: string | null
  location: string | null
  key_decision_maker: string | null
  weekly_action: string | null
  obstacles: string | null
  resources_needed: string | null
  strategy: string | null
}

interface UserSnapshot {
  userName: string
  groupName?: string
  items: FocusItemSummary[]
}

interface Top10ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  snapshots: UserSnapshot[]
}

export function Top10ReviewDialog({ open, onOpenChange, title, snapshots }: Top10ReviewDialogProps) {
  const [selectedItem, setSelectedItem] = useState<FocusItemSummary | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<string>('')

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setSelectedItem(null)
      setSelectedOwner('')
    }
    onOpenChange(isOpen)
  }

  // Group snapshots by group name if multiple groups
  const hasMultipleGroups = new Set(snapshots.map(s => s.groupName).filter(Boolean)).size > 1
  const groupedByGroup: Record<string, UserSnapshot[]> = {}
  snapshots.forEach(snap => {
    const key = snap.groupName || 'Group'
    if (!groupedByGroup[key]) groupedByGroup[key] = []
    groupedByGroup[key].push(snap)
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {selectedItem ? (
          /* Detail View */
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItem(null)}
              className="gap-1 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{selectedOwner}</p>
              <h3 className="text-lg font-semibold">{selectedItem.company_subject}</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {DETAIL_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </label>
                  <p className="text-sm break-words whitespace-pre-wrap min-h-[24px]">
                    {field.key === 'prospect_value'
                      ? (selectedItem[field.key as keyof FocusItemSummary] != null
                          ? `$${Number(selectedItem[field.key as keyof FocusItemSummary]).toLocaleString()}`
                          : <span className="text-muted-foreground">-</span>)
                      : (selectedItem[field.key as keyof FocusItemSummary] || <span className="text-muted-foreground">-</span>)
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-6">
            {Object.entries(groupedByGroup).map(([groupName, userSnaps]) => (
              <div key={groupName}>
                {hasMultipleGroups && (
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                    {groupName}
                  </h3>
                )}
                {userSnaps.map((snap) => (
                  <div key={snap.userName} className="mb-4">
                    <h4 className="font-semibold text-sm mb-2 border-b pb-1">{snap.userName}</h4>
                    {snap.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-1">No items</p>
                    ) : (
                      <div className="table-striped">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1.5 font-medium w-12">#</th>
                              <th className="text-left py-1.5 font-medium">Company / Subject</th>
                              <th className="text-right py-1.5 font-medium">$ Amount</th>
                              <th className="text-left py-1.5 font-medium pl-4">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snap.items.map((item, idx) => (
                              <tr
                                key={item.id}
                                className="border-b hover:bg-muted/50 cursor-pointer"
                                onClick={() => {
                                  setSelectedItem(item)
                                  setSelectedOwner(snap.userName)
                                }}
                              >
                                <td className="py-1.5">
                                  <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center text-xs">
                                    {item.priority || idx + 1}
                                  </Badge>
                                </td>
                                <td className="py-1.5 font-medium">{item.company_subject}</td>
                                <td className="py-1.5 text-right">
                                  {item.prospect_value != null
                                    ? `$${Number(item.prospect_value).toLocaleString()}`
                                    : '-'}
                                </td>
                                <td className="py-1.5 pl-4">{item.pipeline_status || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {snapshots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No Top 10 data for this week.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
