'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEK_ENDING_STORAGE_KEY = 'one-stop-week-ending'
const FILL_IN_BLANK_OPTION = '➕ Fill In Blank'

const PROPERTY_OPTIONS = [
  '125 Governor St, Providence',
  'Charles Place Apartments',
  'Copley Chambers 206 Broad Street',
  'Copley Chambers 220 Broad Street',
  'Copley Chambers 228 Broad Street',
  'MAPLE GARDENS',
  'OMNI POINT 322 Friendship St.',
  'Phoenix Renaissance 102 Linwood Av.',
  'Riverstone Apartments',
  'Spring Villa Apartments',
  'Four Sisters Apartments',
  'HDC Properties (322 Friendship St.)',
  'Joseph Caffey Apartment',
  'TURNING POINT (1380 Broad St)',
  'Tanglewood Village Apartments',
  'Valley Apartments',
  'Waterview Apartments',
]

type WorkerDay = {
  day: string
  location: string
  job: string
  pay: string
  advance: string
  advanceNote: string
}

type Worker = {
  id: string
  name: string
  phone: string
  notes: string
  paid: boolean
  weekending: string
  days: WorkerDay[]
}

type WorkerTab = 'payroll' | 'notes' | 'admin'

type PayrollWeek = {
  id: string
  week_ending: string
  is_locked: boolean
}

function getDefaultWeekEnding() {
  const today = new Date()
  const day = today.getDay()
  const daysUntilSaturday = (6 - day + 7) % 7
  const saturday = new Date(today)
  saturday.setDate(today.getDate() + daysUntilSaturday)
  return saturday.toISOString().slice(0, 10)
}

function getDayDateFromWeekEnding(weekEnding: string, dayName: string) {
  if (!weekEnding) return ''

  const end = new Date(`${weekEnding}T12:00:00`)
  const offsets: Record<string, number> = {
    Monday: -5,
    Tuesday: -4,
    Wednesday: -3,
    Thursday: -2,
    Friday: -1,
    Saturday: 0,
  }

  const d = new Date(end)
  d.setDate(end.getDate() + offsets[dayName])

  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function normalizeDays(days: any[]): WorkerDay[] {
  return DAYS.map((dayName) => {
    const existing = Array.isArray(days)
      ? days.find((d) => d?.day === dayName)
      : undefined

    return {
      day: dayName,
      location: existing?.location || '',
      job: existing?.job || '',
      pay: existing?.pay || '',
      advance: existing?.advance || '',
      advanceNote: existing?.advanceNote || '',
    }
  })
}

export default function HomePage() {
  const supabase = createClient()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [weeks, setWeeks] = useState<PayrollWeek[]>([])
  const [workerName, setWorkerName] = useState('')
  const [weekEnding, setWeekEnding] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [openWorkerId, setOpenWorkerId] = useState<string | null>(null)
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({})
  const [workerTabs, setWorkerTabs] = useState<Record<string, WorkerTab>>({})
  const [customLocationMode, setCustomLocationMode] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const saved = localStorage.getItem(WEEK_ENDING_STORAGE_KEY)
    setWeekEnding(saved || getDefaultWeekEnding())
  }, [])

  useEffect(() => {
    if (!weekEnding) return

    localStorage.setItem(WEEK_ENDING_STORAGE_KEY, weekEnding)

    ;(async () => {
      await ensureWeekExists(weekEnding)
      await loadWeeks()
      await loadWorkers(weekEnding)
    })()
  }, [weekEnding])

  async function ensureWeekExists(targetWeekEnding: string) {
    const { data } = await supabase
      .from('payroll_weeks')
      .select('*')
      .eq('week_ending', targetWeekEnding)
      .maybeSingle()

    if (!data) {
      await supabase.from('payroll_weeks').insert({
        week_ending: targetWeekEnding,
        is_locked: false,
      })
    }
  }

  async function loadWeeks() {
    const { data } = await supabase
      .from('payroll_weeks')
      .select('*')
      .order('week_ending', { ascending: false })

    if (data) {
      setWeeks(data)
    }
  }

  async function loadWorkers(targetWeekEnding: string) {
    setLoading(true)

    const { data, error } = await supabase
      .from('payroll_workers')
      .select('*')
      .eq('weekending', targetWeekEnding)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const list: Worker[] = data.map((w) => ({
        id: w.id,
        name: w.name || '',
        phone: w.phone || '',
        notes: w.notes || '',
        paid: !!w.paid,
        weekending: w.weekending || targetWeekEnding,
        days: normalizeDays(w.days),
      }))

      setWorkers(list)

      const tabs: Record<string, WorkerTab> = {}
      const customModes: Record<string, boolean> = {}

      list.forEach((w) => {
        tabs[w.id] = 'payroll'
        w.days.forEach((d) => {
          const key = `${w.id}-${d.day}`
          customModes[key] =
            !!d.location && !PROPERTY_OPTIONS.includes(d.location)
        })
      })

      setWorkerTabs(tabs)
      setCustomLocationMode(customModes)
    } else {
      setWorkers([])
    }

    setLoading(false)
  }

  const currentWeek = useMemo(() => {
    return weeks.find((w) => w.week_ending === weekEnding) || null
  }, [weeks, weekEnding])

  const isLocked = !!currentWeek?.is_locked

  async function addWorker() {
    if (!workerName.trim() || isLocked) return

    const newWorker = {
      name: workerName.trim(),
      phone: '',
      notes: '',
      paid: false,
      weekending: weekEnding,
      days: DAYS.map((d) => ({
        day: d,
        location: '',
        job: '',
        pay: '',
        advance: '',
        advanceNote: '',
      })),
    }

    const { data, error } = await supabase
      .from('payroll_workers')
      .insert(newWorker)
      .select()
      .single()

    if (!error && data) {
      const worker: Worker = {
        id: data.id,
        name: data.name || '',
        phone: data.phone || '',
        notes: data.notes || '',
        paid: !!data.paid,
        weekending: data.weekending || weekEnding,
        days: normalizeDays(data.days),
      }

      setWorkers((prev) => [...prev, worker])
      setWorkerTabs((prev) => ({ ...prev, [worker.id]: 'payroll' }))
      setWorkerName('')
    }
  }

  async function updateWorker(workerId: string, nextWorker: Worker) {
    if (isLocked) return

    setWorkers((prev) =>
      prev.map((w) => (w.id === workerId ? nextWorker : w))
    )

    await supabase
      .from('payroll_workers')
      .update({
        name: nextWorker.name,
        phone: nextWorker.phone,
        notes: nextWorker.notes,
        paid: nextWorker.paid,
        weekending: nextWorker.weekending,
        days: nextWorker.days,
      })
      .eq('id', workerId)
  }

  async function updateWorkerField(
    workerId: string,
    field: 'name' | 'phone' | 'notes',
    value: string
  ) {
    const worker = workers.find((w) => w.id === workerId)
    if (!worker || isLocked) return

    const nextWorker = {
      ...worker,
      [field]: value,
    }

    await updateWorker(workerId, nextWorker)
  }

  async function updateDay(
    workerId: string,
    dayName: string,
    field: keyof WorkerDay,
    value: string
  ) {
    const worker = workers.find((w) => w.id === workerId)
    if (!worker || isLocked) return

    const nextWorker: Worker = {
      ...worker,
      days: worker.days.map((d) =>
        d.day === dayName ? { ...d, [field]: value } : d
      ),
    }

    await updateWorker(workerId, nextWorker)
  }

  async function togglePaid(worker: Worker) {
    if (isLocked) return
    const nextWorker = { ...worker, paid: !worker.paid }
    await updateWorker(worker.id, nextWorker)
  }

  async function deleteWorker(workerId: string) {
    if (isLocked) return

    const ok = window.confirm('Delete this worker?')
    if (!ok) return

    await supabase.from('payroll_workers').delete().eq('id', workerId)
    setWorkers((prev) => prev.filter((w) => w.id !== workerId))
    if (openWorkerId === workerId) setOpenWorkerId(null)
  }

  async function toggleWeekLock() {
    if (!currentWeek) return

    const nextLocked = !currentWeek.is_locked

    await supabase
      .from('payroll_weeks')
      .update({ is_locked: nextLocked })
      .eq('id', currentWeek.id)

    setWeeks((prev) =>
      prev.map((w) =>
        w.id === currentWeek.id ? { ...w, is_locked: nextLocked } : w
      )
    )
  }

  function workerGross(worker: Worker) {
    return worker.days.reduce((sum, d) => sum + Number(d.pay || 0), 0)
  }

  function workerAdvanceTotal(worker: Worker) {
    return worker.days.reduce((sum, d) => sum + Number(d.advance || 0), 0)
  }

  function workerNet(worker: Worker) {
    return workerGross(worker) - workerAdvanceTotal(worker)
  }

  const grandTotal = useMemo(() => {
    return workers.reduce((sum, w) => sum + workerNet(w), 0)
  }, [workers])

  const filteredWorkers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return workers

    return workers.filter((w) => {
      return (
        w.name.toLowerCase().includes(term) ||
        w.phone.toLowerCase().includes(term) ||
        w.notes.toLowerCase().includes(term)
      )
    })
  }, [workers, search])

  function toggleWorker(id: string) {
    setOpenWorkerId((prev) => (prev === id ? null : id))
    setOpenDays({})
  }

  function toggleDay(workerId: string, day: string) {
    const key = `${workerId}-${day}`
    setOpenDays((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  function isDayOpen(workerId: string, day: string) {
    return !!openDays[`${workerId}-${day}`]
  }

  function setTab(workerId: string, tab: WorkerTab) {
    setWorkerTabs((prev) => ({
      ...prev,
      [workerId]: tab,
    }))
  }

  function printWorkerSlip(worker: Worker) {
    const rows = worker.days
      .map((d) => {
        const pay = Number(d.pay || 0)
        const advance = Number(d.advance || 0)
        const net = pay - advance

        return `
          <tr>
            <td style="padding:8px;border:1px solid #ccc;">${d.day}</td>
            <td style="padding:8px;border:1px solid #ccc;">${getDayDateFromWeekEnding(weekEnding, d.day)}</td>
            <td style="padding:8px;border:1px solid #ccc;">${d.location || ''}</td>
            <td style="padding:8px;border:1px solid #ccc;">${d.job || ''}</td>
            <td style="padding:8px;border:1px solid #ccc;">$${pay.toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #ccc;">$${advance.toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #ccc;">${d.advanceNote || ''}</td>
            <td style="padding:8px;border:1px solid #ccc;">$${net.toFixed(2)}</td>
          </tr>
        `
      })
      .join('')

    const html = `
      <html>
        <head>
          <title>${worker.name} Payroll Slip</title>
        </head>
        <body style="font-family:Arial,sans-serif;padding:24px;">
          <h1>1 Stop Turnover Specialist LLC Pro</h1>
          <h2>Payroll Slip</h2>
          <p><strong>Worker:</strong> ${worker.name}</p>
          <p><strong>Phone:</strong> ${worker.phone || ''}</p>
          <p><strong>Week Ending:</strong> ${weekEnding}</p>
          <p><strong>Status:</strong> ${worker.paid ? 'PAID' : 'UNPAID'}</p>

          <table style="border-collapse:collapse;width:100%;margin-top:16px;">
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #ccc;">Day</th>
                <th style="padding:8px;border:1px solid #ccc;">Date</th>
                <th style="padding:8px;border:1px solid #ccc;">Property</th>
                <th style="padding:8px;border:1px solid #ccc;">Job</th>
                <th style="padding:8px;border:1px solid #ccc;">Pay</th>
                <th style="padding:8px;border:1px solid #ccc;">Advance</th>
                <th style="padding:8px;border:1px solid #ccc;">Reason</th>
                <th style="padding:8px;border:1px solid #ccc;">Net</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top:24px;">
            <p><strong>Gross Pay:</strong> $${workerGross(worker).toFixed(2)}</p>
            <p><strong>Total Advances:</strong> $${workerAdvanceTotal(worker).toFixed(2)}</p>
            <p><strong>Net Payout:</strong> $${workerNet(worker).toFixed(2)}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-slate-900 p-6 text-white">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="logo"
              className="h-16 w-16 rounded-xl bg-white object-contain p-1"
            />

            <div>
              <h1 className="text-3xl font-bold">
                1 Stop Turnover Specialist LLC Pro
              </h1>
              <p className="text-sm text-slate-300">
                Owner Control Center
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-xs uppercase text-slate-400">
                Week Ending
              </div>

              <input
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-black"
              />

              {weeks.length > 0 && (
                <select
                  value={weekEnding}
                  onChange={(e) => setWeekEnding(e.target.value)}
                  className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-black"
                >
                  {weeks.map((w) => (
                    <option key={w.id} value={w.week_ending}>
                      {w.week_ending} {w.is_locked ? '🔒' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-xs uppercase text-slate-400">
                Total Payroll
              </div>

              <div className="mt-2 text-4xl font-bold">
                ${grandTotal.toFixed(2)}
              </div>

              <div className="mt-3 text-sm font-semibold">
                {isLocked ? '🔒 Week Locked' : '🔓 Week Open'}
              </div>

              <button
                onClick={toggleWeekLock}
                className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-white"
              >
                {isLocked ? 'Unlock Week' : 'Lock Week'}
              </button>
            </div>

            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-sm font-semibold">
                Add Worker
              </div>

              <input
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                placeholder="Worker name"
                disabled={isLocked}
                className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-black disabled:bg-slate-200"
              />

              <button
                onClick={addWorker}
                disabled={isLocked}
                className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-white disabled:opacity-50"
              >
                Add Worker
              </button>
            </div>

            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-sm font-semibold">
                Search Worker
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or notes"
                className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-black"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-4">
            Loading...
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="rounded-2xl bg-white p-4">
            No workers found.
          </div>
        ) : (
          filteredWorkers.map((worker) => {
            const open = openWorkerId === worker.id
            const tab = workerTabs[worker.id] || 'payroll'

            return (
              <div
                key={worker.id}
                className="rounded-3xl bg-white p-5 shadow"
              >
                <button
                  onClick={() => toggleWorker(worker.id)}
                  className="flex w-full items-center justify-between"
                >
                  <div className="text-left">
                    <div className="text-2xl font-bold text-black">
                      {worker.name}
                    </div>

                    <div
                      className={`text-sm font-semibold ${
                        worker.paid ? 'text-green-600' : 'text-amber-600'
                      }`}
                    >
                      {worker.paid ? 'PAID' : 'UNPAID'}
                    </div>
                  </div>

                  <div className="text-2xl text-slate-600">
                    {open ? '−' : '+'}
                  </div>
                </button>

                {open && (
                  <div className="mt-5">
                    <div className="mb-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-slate-100 p-4">
                        <div className="text-sm text-slate-500">
                          Gross Pay
                        </div>
                        <div className="mt-1 text-2xl font-bold text-black">
                          ${workerGross(worker).toFixed(2)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-100 p-4">
                        <div className="text-sm text-slate-500">
                          Advance Summary
                        </div>
                        <div className="mt-1 text-2xl font-bold text-red-600">
                          -${workerAdvanceTotal(worker).toFixed(2)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-100 p-4">
                        <div className="text-sm text-slate-500">
                          Net Payout
                        </div>
                        <div className="mt-1 text-2xl font-bold text-black">
                          ${workerNet(worker).toFixed(2)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-100 p-4">
                        <div className="text-sm text-slate-500">
                          Payroll Slip
                        </div>
                        <button
                          onClick={() => printWorkerSlip(worker)}
                          className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-white"
                        >
                          Print Worker Slip
                        </button>
                      </div>
                    </div>

                    <div className="mb-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => setTab(worker.id, 'payroll')}
                        className={`rounded-xl px-4 py-2 ${
                          tab === 'payroll'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-black'
                        }`}
                      >
                        Payroll
                      </button>

                      <button
                        onClick={() => setTab(worker.id, 'notes')}
                        className={`rounded-xl px-4 py-2 ${
                          tab === 'notes'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-black'
                        }`}
                      >
                        Notes
                      </button>

                      <button
                        onClick={() => setTab(worker.id, 'admin')}
                        className={`rounded-xl px-4 py-2 ${
                          tab === 'admin'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-black'
                        }`}
                      >
                        Admin
                      </button>
                    </div>

                    {tab === 'payroll' && (
                      <div className="space-y-4">
                        {worker.days.map((d) => {
                          const dayOpen = isDayOpen(worker.id, d.day)
                          const key = `${worker.id}-${d.day}`

                          return (
                            <div
                              key={d.day}
                              className="rounded-2xl border p-4"
                            >
                              <button
                                onClick={() => toggleDay(worker.id, d.day)}
                                className="flex w-full items-center justify-between"
                              >
                                <div className="font-bold text-black">
                                  {d.day} ({getDayDateFromWeekEnding(weekEnding, d.day)})
                                </div>

                                <div className="text-xl">
                                  {dayOpen ? '−' : '+'}
                                </div>
                              </button>

                              {dayOpen && (
                                <div className="mt-4 space-y-3">
                                  <select
                                    value={
                                      customLocationMode[key]
                                        ? FILL_IN_BLANK_OPTION
                                        : d.location
                                    }
                                    disabled={isLocked}
                                    onChange={(e) => {
                                      if (e.target.value === FILL_IN_BLANK_OPTION) {
                                        setCustomLocationMode((prev) => ({
                                          ...prev,
                                          [key]: true,
                                        }))
                                        updateDay(worker.id, d.day, 'location', '')
                                      } else {
                                        setCustomLocationMode((prev) => ({
                                          ...prev,
                                          [key]: false,
                                        }))
                                        updateDay(worker.id, d.day, 'location', e.target.value)
                                      }
                                    }}
                                    className="w-full rounded-xl border bg-white px-3 py-2 text-black disabled:bg-slate-200"
                                  >
                                    <option value="">Select property</option>

                                    {PROPERTY_OPTIONS.map((p) => (
                                      <option key={p} value={p}>
                                        {p}
                                      </option>
                                    ))}

                                    <option value={FILL_IN_BLANK_OPTION}>
                                      {FILL_IN_BLANK_OPTION}
                                    </option>
                                  </select>

                                  {customLocationMode[key] && (
                                    <input
                                      value={d.location}
                                      disabled={isLocked}
                                      onChange={(e) =>
                                        updateDay(worker.id, d.day, 'location', e.target.value)
                                      }
                                      placeholder="Type property"
                                      className="w-full rounded-xl border bg-white px-3 py-2 text-black disabled:bg-slate-200"
                                    />
                                  )}

                                  <textarea
                                    value={d.job}
                                    disabled={isLocked}
                                    onChange={(e) =>
                                      updateDay(worker.id, d.day, 'job', e.target.value)
                                    }
                                    placeholder="Job being done"
                                    className="min-h-24 w-full rounded-xl border bg-white px-3 py-2 text-black disabled:bg-slate-200"
                                  />

                                  <input
                                    value={d.pay}
                                    disabled={isLocked}
                                    onChange={(e) =>
                                      updateDay(worker.id, d.day, 'pay', e.target.value)
                                    }
                                    placeholder="Pay"
                                    className="w-full rounded-xl border bg-white px-3 py-2 text-black disabled:bg-slate-200"
                                  />

                                  <input
                                    value={d.advance}
                                    disabled={isLocked}
                                    onChange={(e) =>
                                      updateDay(worker.id, d.day, 'advance', e.target.value)
                                    }
                                    placeholder="Advance"
                                    className="w-full rounded-xl border bg-white px-3 py-2 text-black disabled:bg-slate-200"
                                  />

                                  <textarea
                                    value={d.advanceNote}
                                    disabled={isLocked}
                                    onChange={(e) =>
                                      updateDay(worker.id, d.day, 'advanceNote', e.target.value)
                                    }
                                    placeholder="Reason for advance"
                                    className="min-h-20 w-full rounded-xl border bg-white px-3 py-2 text-black disabled:bg-slate-200"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}

                        <div className="rounded-2xl bg-slate-100 p-4 text-right">
                          <div className="text-sm text-slate-500">
                            End of Week Total
                          </div>

                          <div className="text-3xl font-bold text-black">
                            ${workerNet(worker).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}

                    {tab === 'notes' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-slate-100 p-4">
                          <label className="text-sm text-slate-500">
                            Phone Number
                          </label>
                          <input
                            value={worker.phone}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateWorkerField(worker.id, 'phone', e.target.value)
                            }
                            placeholder="Worker phone number"
                            className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-black disabled:bg-slate-200"
                          />
                        </div>

                        <div className="rounded-2xl bg-slate-100 p-4">
                          <label className="text-sm text-slate-500">
                            Worker Notes
                          </label>
                          <textarea
                            value={worker.notes}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateWorkerField(worker.id, 'notes', e.target.value)
                            }
                            placeholder="Add notes about this worker"
                            className="mt-2 min-h-32 w-full rounded-xl border bg-white px-3 py-2 text-black disabled:bg-slate-200"
                          />
                        </div>
                      </div>
                    )}

                    {tab === 'admin' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-slate-100 p-4">
                          <div className="text-sm text-slate-500">
                            Status
                          </div>

                          <div
                            className={`mt-1 text-xl font-bold ${
                              worker.paid ? 'text-green-600' : 'text-amber-600'
                            }`}
                          >
                            {worker.paid ? 'PAID' : 'UNPAID'}
                          </div>

                          <button
                            onClick={() => togglePaid(worker)}
                            disabled={isLocked}
                            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                          >
                            {worker.paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                        </div>

                        <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
                          <div className="font-semibold text-red-700">
                            Danger Zone
                          </div>

                          <p className="mt-1 text-sm text-red-600">
                            Delete worker only if sure.
                          </p>

                          <button
                            onClick={() => deleteWorker(worker.id)}
                            disabled={isLocked}
                            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-white disabled:opacity-50"
                          >
                            Delete Worker
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}