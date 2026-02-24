'use client'

import { createClient } from '@/lib/supabase/client'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'

export default function AdminQuartersPage() {
  const supabase = createClient()
  const [label, setLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: quarters } = useSWR('admin-quarters', async () => {
    const { data } = await supabase.from('quarters').select('*').order('start_date', { ascending: false })
    return data || []
  })

  async function handleCreate() {
    await supabase.from('quarters').insert({ label, start_date: startDate, end_date: endDate })
    setLabel('')
    setStartDate('')
    setEndDate('')
    mutate('admin-quarters')
  }

  async function setCurrentQuarter(id: string) {
    await supabase.from('quarters').update({ is_current: true }).eq('id', id)
    mutate('admin-quarters')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Quarters</h1>
        </div>
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

      <Table>
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
              <TableCell className="font-medium">{q.label}</TableCell>
              <TableCell>{q.start_date}</TableCell>
              <TableCell>{q.end_date}</TableCell>
              <TableCell>
                {q.is_current ? <Badge>Current</Badge> : <Badge variant="outline">Past</Badge>}
              </TableCell>
              <TableCell>
                {!q.is_current && (
                  <Button variant="ghost" size="sm" onClick={() => setCurrentQuarter(q.id)}>
                    Set Current
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
