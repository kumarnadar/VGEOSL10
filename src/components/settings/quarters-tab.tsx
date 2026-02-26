'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { toast } from 'sonner'

export function QuartersTab() {
  const supabase = createClient()
  const [label, setLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: quarters } = useSWR('admin-quarters', async () => {
    const { data } = await supabase.from('quarters').select('*').order('start_date', { ascending: false })
    return data || []
  })

  async function handleCreate() {
    const { error } = await supabase.from('quarters').insert({ label, start_date: startDate, end_date: endDate })
    if (error) {
      toast.error('Failed to create quarter')
      return
    }
    toast.success('Quarter created')
    setLabel('')
    setStartDate('')
    setEndDate('')
    mutate('admin-quarters')
  }

  async function setCurrentQuarter(id: string) {
    const { error } = await supabase.from('quarters').update({ is_current: true }).eq('id', id)
    if (error) {
      toast.error('Failed to set current quarter')
      return
    }
    toast.success('Current quarter updated')
    mutate('admin-quarters')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Quarters</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Quarter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Quarter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Q2 2026" />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead>Quarter</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quarters?.map((q: any) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium whitespace-nowrap">{q.label}</TableCell>
                <TableCell className="whitespace-nowrap">{q.start_date}</TableCell>
                <TableCell className="whitespace-nowrap">{q.end_date}</TableCell>
                <TableCell>
                  {q.is_current ? <Badge>Current</Badge> : <Badge variant="outline">Past</Badge>}
                </TableCell>
                <TableCell>
                  {!q.is_current && (
                    <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => setCurrentQuarter(q.id)}>
                      Set Current
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
