'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntryDetails } from '@/hooks/use-scorecard'
import { formatCurrencyFull } from '@/lib/scorecard-utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { mutate } from 'swr'

interface DetailLineItemsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryId: string | null
  measureName: string
  entryValue: number | null
  dataType: string
  weekEnding: string
  readOnly?: boolean
}

export function DetailLineItemsPanel({
  open,
  onOpenChange,
  entryId,
  measureName,
  entryValue,
  dataType,
  weekEnding,
  readOnly = false,
}: DetailLineItemsPanelProps) {
  const supabase = createClient()
  const { data: details, isLoading } = useEntryDetails(entryId)
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Calculate sum of line items
  const lineItemSum = details?.reduce((sum: number, d: any) => sum + (Number(d.line_value) || 0), 0) || 0
  const hasMismatch = entryValue != null && details && details.length > 0 && Math.abs(lineItemSum - entryValue) > 0.01

  const addLineItem = useCallback(async () => {
    if (!entryId || !newName.trim()) return
    const value = newValue ? parseFloat(newValue.replace(/[$,]/g, '')) : null

    await supabase.from('scorecard_entry_details').insert({
      entry_id: entryId,
      line_name: newName.trim(),
      line_value: isNaN(value as number) ? null : value,
      notes: newNotes.trim() || null,
      display_order: (details?.length || 0) + 1,
    })

    setNewName('')
    setNewValue('')
    setNewNotes('')
    mutate(`entry-details-${entryId}`)
  }, [entryId, newName, newValue, newNotes, details, supabase])

  const deleteLineItem = useCallback(async (detailId: string) => {
    await supabase.from('scorecard_entry_details').delete().eq('id', detailId)
    mutate(`entry-details-${entryId}`)
  }, [entryId, supabase])

  const updateLineItem = useCallback(async (detailId: string, field: string, value: any) => {
    await supabase
      .from('scorecard_entry_details')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', detailId)
    mutate(`entry-details-${entryId}`)
  }, [entryId, supabase])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{measureName}</SheetTitle>
          <SheetDescription>
            Week ending {weekEnding} &middot; Total: {formatCurrencyFull(entryValue)}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* Sum mismatch warning */}
          {hasMismatch && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Line items sum ({formatCurrencyFull(lineItemSum)}) does not match entry value ({formatCurrencyFull(entryValue)})
              </span>
            </div>
          )}

          {/* Existing line items */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : details && details.length > 0 ? (
            <div className="space-y-2">
              {details.map((detail: any) => (
                <div key={detail.id} className="flex items-start gap-2 p-2 rounded-md border bg-card">
                  <div className="flex-1 min-w-0">
                    {readOnly ? (
                      <p className="text-sm font-medium">{detail.line_name}</p>
                    ) : (
                      <Input
                        defaultValue={detail.line_name}
                        onBlur={(e) => {
                          if (e.target.value !== detail.line_name) {
                            updateLineItem(detail.id, 'line_name', e.target.value)
                          }
                        }}
                        className="h-7 text-sm font-medium"
                      />
                    )}
                    {detail.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{detail.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {readOnly ? (
                      <Badge variant="outline" className="text-xs">
                        {dataType === 'currency' ? formatCurrencyFull(detail.line_value) : detail.line_value}
                      </Badge>
                    ) : (
                      <Input
                        defaultValue={detail.line_value ?? ''}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value.replace(/[$,]/g, ''))
                          if (!isNaN(val) && val !== detail.line_value) {
                            updateLineItem(detail.id, 'line_value', val)
                          }
                        }}
                        className="h-7 w-24 text-sm text-right"
                      />
                    )}
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteLineItem(detail.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Sum row */}
              <div className="flex justify-between items-center pt-2 border-t text-sm">
                <span className="font-medium">Line Items Total</span>
                <span className="font-medium">
                  {dataType === 'currency' ? formatCurrencyFull(lineItemSum) : lineItemSum}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No line items yet.</p>
          )}

          {/* Add new line item */}
          {!readOnly && entryId && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Add Line Item</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Acme Corp proposal"
                    className="h-8"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Optional"
                      className="h-8"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={addLineItem}
                  disabled={!newName.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {!entryId && !readOnly && (
            <p className="text-sm text-muted-foreground">
              Enter a value in the scorecard grid first, then add line item details here.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
