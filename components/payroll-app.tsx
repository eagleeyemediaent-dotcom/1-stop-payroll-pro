'use client'
import { useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { createClient } from '@/lib/supabase-browser'
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
type Worker = { id: string; owner_id: string; name: string; paid: boolean; phone?: string | null; active?: boolean }
type PayWeek = { id: string; owner_id: string; week_label: string; notes?: string | null; created_at?: string }
type WorkEntry = { id: string; pay_week_id: string; worker_id: string; day_name: string; location?: string | null; work_done?: string | null; pay_amount?: number | null }
type Adjustment = { id: string; pay_week_id: string; worker_id: string; label?: string | null; amount?: number | null }
export default function PayrollApp({ userId, initialWorkers, initialWeeks, initialEntries, initialAdjustments }:{ userId:string; initialWorkers:Worker[]; initialWeeks:PayWeek[]; initialEntries:WorkEntry[]; initialAdjustments:Adjustment[] }) {
  const supabase = createClient()
  const [workers, setWorkers] = useState(initialWorkers)
  const [weeks, setWeeks] = useState(initialWeeks)
  const [entries, setEntries] = useState(initialEntries)
  const [adjustments, setAdjustments] = useState(initialAdjustments)
  const [workerName, setWorkerName] = useState('')
  const [weekLabel, setWeekLabel] = useState('')
  const [selectedWeekId, setSelectedWeekId] = useState(initialWeeks[0]?.id || '')
  const [saving, setSaving] = useState(false)
  const selectedWeek = weeks.find((w) => w.id === selectedWeekId)
  const totalForWeek = useMemo(() => {
    if (!selectedWeekId) return 0
    const entryTotal = entries.filter((e) => e.pay_week_id === selectedWeekId).reduce((sum, e) => sum + Number(e.pay_amount || 0), 0)
    const adjustmentTotal = adjustments.filter((a) => a.pay_week_id === selectedWeekId).reduce((sum, a) => sum + Number(a.amount || 0), 0)
    return entryTotal + adjustmentTotal
  }, [entries, adjustments, selectedWeekId])
  function getEntry(workerId: string, dayName: string) { return entries.find((e) => e.worker_id === workerId && e.pay_week_id === selectedWeekId && e.day_name === dayName) }
  function workerTotal(workerId: string) {
    const entryTotal = entries.filter((e) => e.worker_id === workerId && e.pay_week_id === selectedWeekId).reduce((sum, e) => sum + Number(e.pay_amount || 0), 0)
    const adjustmentTotal = adjustments.filter((a) => a.worker_id === workerId && a.pay_week_id === selectedWeekId).reduce((sum, a) => sum + Number(a.amount || 0), 0)
    return entryTotal + adjustmentTotal
  }
  async function addWorker() {
    if (!workerName.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('workers').insert({ owner_id: userId, name: workerName.trim(), paid: false }).select().single()
    if (!error && data) { setWorkers((prev) => [data, ...prev]); setWorkerName('') }
    setSaving(false)
  }
  async function addWeek() {
    if (!weekLabel.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('pay_weeks').insert({ owner_id: userId, week_label: weekLabel.trim() }).select().single()
    if (!error && data) { setWeeks((prev) => [data, ...prev]); setSelectedWeekId(data.id); setWeekLabel('') }
    setSaving(false)
  }
  async function saveDay(workerId: string, dayName: string, field: 'location' | 'work_done' | 'pay_amount', value: string) {
    if (!selectedWeekId) return
    const existing = entries.find((e) => e.worker_id === workerId && e.pay_week_id === selectedWeekId && e.day_name === dayName)
    if (existing) {
      const payload = { [field]: field === 'pay_amount' ? Number(value || 0) : value }
      const { data, error } = await supabase.from('work_entries').update(payload).eq('id', existing.id).select().single()
      if (!error && data) setEntries((prev) => prev.map((item) => (item.id === existing.id ? data : item)))
    } else {
      const payload = { pay_week_id: selectedWeekId, worker_id: workerId, day_name: dayName, location: field === 'location' ? value : '', work_done: field === 'work_done' ? value : '', pay_amount: field === 'pay_amount' ? Number(value || 0) : 0 }
      const { data, error } = await supabase.from('work_entries').insert(payload).select().single()
      if (!error && data) setEntries((prev) => [...prev, data])
    }
  }
  async function togglePaid(workerId: string, nextPaid: boolean) {
    const { data, error } = await supabase.from('workers').update({ paid: nextPaid }).eq('id', workerId).select().single()
    if (!error && data) setWorkers((prev) => prev.map((w) => (w.id === workerId ? data : w)))
  }
  async function addAdjustment(workerId: string) {
    if (!selectedWeekId) return
    const label = window.prompt('Adjustment reason') || ''
    const amount = Number(window.prompt('Amount. Use negative for deduction.') || '0')
    const { data, error } = await supabase.from('adjustments').insert({ pay_week_id: selectedWeekId, worker_id: workerId, label, amount }).select().single()
    if (!error && data) setAdjustments((prev) => [...prev, data])
  }
  function exportCsv() {
    if (!selectedWeek) return
    const rows:string[][] = [['Week Label', selectedWeek.week_label || ''], ['Notes', selectedWeek.notes || ''], [], ['Worker Name','Paid Status','Day','Location','Work Done','Daily Pay','Worker Total']]
    workers.forEach((worker) => {
      DAYS.forEach((day, index) => {
        const entry = getEntry(worker.id, day)
        rows.push([worker.name || '', worker.paid ? 'Paid' : 'Unpaid', day, entry?.location || '', entry?.work_done || '', String(entry?.pay_amount || 0), index === 0 ? String(workerTotal(worker.id).toFixed(2)) : ''])
      })
    })
    const csv = rows.map((row) => row.map((cell) => `\"${String(cell).replace(/"/g, '""')}\"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `${(selectedWeek.week_label || 'payroll-week').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  function exportPdf() {
    if (!selectedWeek) return
    const doc = new jsPDF(); let y = 20
    doc.setFontSize(18); doc.text('1 Stop Payroll Pro', 14, y); y += 8
    doc.setFontSize(11); doc.text(`Week: ${selectedWeek.week_label}`, 14, y); y += 8
    workers.forEach((worker) => {
      doc.setFontSize(12); doc.text(`${worker.name} - ${worker.paid ? 'Paid' : 'Unpaid'} - Total: $${workerTotal(worker.id).toFixed(2)}`, 14, y); y += 6
      DAYS.forEach((day) => {
        const entry = getEntry(worker.id, day)
        if (entry) { doc.setFontSize(10); doc.text(`${day}: ${entry.location || ''} | ${entry.work_done || ''} | $${Number(entry.pay_amount || 0).toFixed(2)}`, 18, y); y += 5; if (y > 275) { doc.addPage(); y = 20 } }
      })
      y += 6
    })
    doc.save(`${(selectedWeek.week_label || 'payroll-week').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
  }
  async function signOut() { await supabase.auth.signOut(); window.location.href = '/login' }
  return (
    <main className="min-h-screen p-4 md:p-6 bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-800 to-amber-500 p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div><div className="text-xs uppercase tracking-[0.22em] text-amber-200 font-bold">1 Stop Turnover Specialist LLC</div><h1 className="text-3xl font-bold mt-2">1 Stop Payroll Pro</h1><p className="mt-2 text-sm text-slate-200">Cloud save, login, CSV export, and PDF reports.</p></div>
            <button onClick={signOut} className="rounded-2xl border border-slate-300/30 bg-white/10 px-4 py-2">Sign Out</button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow"><h2 className="font-bold">Add Worker</h2><input className="mt-3 w-full rounded-2xl border px-4 py-3" placeholder="Worker name" value={workerName} onChange={(e) => setWorkerName(e.target.value)} /><button onClick={addWorker} disabled={saving} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-white">Add Worker</button></div>
          <div className="rounded-3xl bg-white p-5 shadow"><h2 className="font-bold">Add Pay Week</h2><input className="mt-3 w-full rounded-2xl border px-4 py-3" placeholder="Week of March 16, 2026" value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} /><button onClick={addWeek} disabled={saving} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-white">Add Week</button></div>
          <div className="rounded-3xl bg-white p-5 shadow"><h2 className="font-bold">Week Total</h2><div className="mt-4 text-4xl font-bold">${totalForWeek.toFixed(2)}</div><select className="mt-4 w-full rounded-2xl border px-4 py-3" value={selectedWeekId} onChange={(e) => setSelectedWeekId(e.target.value)}><option value="">Select week</option>{weeks.map((week) => <option key={week.id} value={week.id}>{week.week_label}</option>)}</select><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={exportCsv} className="rounded-2xl border border-slate-300 px-4 py-3">Export CSV</button><button onClick={exportPdf} className="rounded-2xl border border-slate-300 px-4 py-3">Export PDF</button></div></div>
        </div>
        {selectedWeek ? <div className="space-y-6">{workers.map((worker) => <div key={worker.id} className="rounded-3xl bg-white p-5 shadow"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="text-2xl font-bold">{worker.name}</h3><p className="text-sm text-slate-500">Weekly total: ${workerTotal(worker.id).toFixed(2)}</p></div><div className="flex gap-2 flex-wrap"><button onClick={() => togglePaid(worker.id, !worker.paid)} className="rounded-2xl border px-4 py-2">{worker.paid ? 'Mark Unpaid' : 'Mark Paid'}</button><button onClick={() => addAdjustment(worker.id)} className="rounded-2xl bg-amber-500 px-4 py-2 text-white">Add Adjustment</button></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{DAYS.map((day) => { const entry = getEntry(worker.id, day); return <div key={day} className="rounded-2xl border p-4"><h4 className="font-bold">{day}</h4><input className="mt-3 w-full rounded-xl border px-3 py-2" placeholder="Location" defaultValue={entry?.location || ''} onBlur={(e) => saveDay(worker.id, day, 'location', e.target.value)} /><textarea className="mt-3 min-h-24 w-full rounded-xl border px-3 py-2" placeholder="Work done" defaultValue={entry?.work_done || ''} onBlur={(e) => saveDay(worker.id, day, 'work_done', e.target.value)} /><input type="number" step="0.01" className="mt-3 w-full rounded-xl border px-3 py-2" placeholder="Pay" defaultValue={entry?.pay_amount || 0} onBlur={(e) => saveDay(worker.id, day, 'pay_amount', e.target.value)} /></div> })}</div></div>)}</div> : <div className="rounded-3xl bg-white p-6 shadow text-slate-600">Add a pay week to get started.</div>}
      </div>
    </main>
  )
}
