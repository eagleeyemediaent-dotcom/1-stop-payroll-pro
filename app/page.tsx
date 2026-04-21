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
] as const

type WorkerDay = {
  day: string
  location: string
  job: string
  pay: string
  advance: string
}

type Worker = {
  id: string
  name: string
  days: WorkerDay[]
}

function getDefaultWeekEnding() {
  const today = new Date()
  const day = today.getDay()
  const daysUntilSaturday = (6 - day + 7) % 7
  const saturday = new Date(today)
  saturday.setDate(today.getDate() + daysUntilSaturday)

  const yyyy = saturday.getFullYear()
  const mm = String(saturday.getMonth() + 1).padStart(2, '0')
  const dd = String(saturday.getDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
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

  const date = new Date(end)
  date.setDate(end.getDate() + offsets[dayName])

  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

function getLocationSelectValue(location: string) {
  if (!location) return ''
  return PROPERTY_OPTIONS.includes(location as (typeof PROPERTY_OPTIONS)[number])
    ? location
    : FILL_IN_BLANK_OPTION
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
    }
  })
}

export default function HomePage() {
  const supabase = createClient()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [workerName, setWorkerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [weekEnding, setWeekEnding] = useState('')
  const [openWorkerId, setOpenWorkerId] = useState<string | null>(null)
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const savedWeekEnding = localStorage.getItem(WEEK_ENDING_STORAGE_KEY)
    setWeekEnding(savedWeekEnding || getDefaultWeekEnding())
    loadWorkers()
  }, [])

  useEffect(() => {
    if (weekEnding) {
      localStorage.setItem(WEEK_ENDING_STORAGE_KEY, weekEnding)
    }
  }, [weekEnding])

  async function loadWorkers() {
    const { data, error } = await supabase
      .from('payroll_workers')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setWorkers(
        data.map((w) => ({
          id: w.id,
          name: w.name,
          days: normalizeDays(Array.isArray(w.days) ? w.days : []),
        }))
      )
    }

    setLoading(false)
  }

  async function addWorker() {
    if (!workerName.trim()) return

    const newWorker = {
      name: workerName.trim(),
      days: DAYS.map((day) => ({
        day,
        location: '',
        job: '',
        pay: '',
        advance: '',
      })),
    }

    const { data, error } = await supabase
      .from('payroll_workers')
      .insert(newWorker)
      .select()
      .single()

    if (!error && data) {
      setWorkers((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          days: normalizeDays(Array.isArray(data.days) ? data.days : []),
        },
      ])
      setWorkerName('')
    }
  }

  async function updateDay(
    workerId: string,
    day: string,
    field: 'location' | 'job' | 'pay' | 'advance',
    value: string
  ) {
    const updatedWorkers = workers.map((worker) =>
      worker.id === workerId
        ? {
            ...worker,
            days: worker.days.map((d) =>
              d.day === day ? { ...d, [field]: value } : d
            ),
          }
        : worker
    )

    setWorkers(updatedWorkers)

    const updatedWorker = updatedWorkers.find((w) => w.id === workerId)
    if (!updatedWorker) return

    await supabase
      .from('payroll_workers')
      .update({
        name: updatedWorker.name,
        days: updatedWorker.days,
      })
      .eq('id', workerId)
  }

  async function deleteWorker(workerId: string) {
    const confirmed = window.confirm('Delete this worker?')
    if (!confirmed) return

    await supabase.from('payroll_workers').delete().eq('id', workerId)
    setWorkers((prev) => prev.filter((w) => w.id !== workerId))

    if (openWorkerId === workerId) {
      setOpenWorkerId(null)
    }
  }

  function total(worker: Worker) {
    return worker.days.reduce((sum, d) => {
      const pay = Number(d.pay || 0)
      const advance = Number(d.advance || 0)
      return sum + (pay - advance)
    }, 0)
  }

  const grandTotal = useMemo(() => {
    return workers.reduce((sum, worker) => sum + total(worker), 0)
  }, [workers])

  const orderedPropertyOptions = useMemo(() => {
    const counts = new Map<string, number>()

    for (const worker of workers) {
      for (const day of worker.days) {
        if (
          day.location &&
          PROPERTY_OPTIONS.includes(day.location as (typeof PROPERTY_OPTIONS)[number])
        ) {
          counts.set(day.location, (counts.get(day.location) || 0) + 1)
        }
      }
    }

    return [...PROPERTY_OPTIONS].sort((a, b) => {
      const countA = counts.get(a) || 0
      const countB = counts.get(b) || 0

      if (countA !== countB) return countB - countA
      return PROPERTY_OPTIONS.indexOf(a) - PROPERTY_OPTIONS.indexOf(b)
    })
  }, [workers])

  function toggleWorker(workerId: string) {
    setOpenWorkerId((prev) => (prev === workerId ? null : workerId))
    setOpenDays({})
  }

  function toggleDay(workerId: string, dayName: string) {
    const key = `${workerId}-${dayName}`

    setOpenDays((prev) => {
      const next: Record<string, boolean> = {}

      Object.keys(prev).forEach((k) => {
        if (!k.startsWith(`${workerId}-`)) {
          next[k] = prev[k]
        }
      })

      next[key] = !prev[key]
      return next
    })
  }

  function isDayOpen(workerId: string, dayName: string) {
    const key = `${workerId}-${dayName}`
    return !!openDays[key]
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-slate-900 p-6 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="1 Stop Logo"
                className="h-16 w-16 rounded-xl bg-white object-contain p-1"
              />
              <div>
                <h1 className="text-3xl font-bold">1 Stop Payroll Pro</h1>
                <p className="text-sm text-slate-300">Owner Control Center</p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Week Ending
              </label>
              <input
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-white px-4 py-3 text-black"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl bg-slate-800 px-5 py-5">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Total Payroll
                </div>
                <div className="mt-2 text-4xl font-bold">
                  ${grandTotal.toFixed(2)}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-800 px-5 py-5">
                <h2 className="text-lg font-bold text-white">Add Worker</h2>

                <input
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="Worker name"
                  className="mt-4 w-full rounded-2xl border bg-white px-4 py-3 text-black placeholder:text-gray-400"
                />

                <button
                  type="button"
                  onClick={addWorker}
                  className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3 text-white"
                >
                  Add Worker
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-5 shadow text-black">
            Loading workers...
          </div>
        ) : workers.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 shadow text-black">
            No workers yet.
          </div>
        ) : (
          workers.map((worker) => {
            const workerOpen = openWorkerId === worker.id

            return (
              <div
                key={worker.id}
                className="rounded-3xl bg-white p-5 shadow"
              >
                <button
                  type="button"
                  onClick={() => toggleWorker(worker.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h2 className="text-2xl font-bold text-black">
                    {worker.name}
                  </h2>
                  <span className="text-2xl text-slate-600">
                    {workerOpen ? '−' : '+'}
                  </span>
                </button>

                {workerOpen && (
                  <div className="mt-5 space-y-4">
                    {worker.days.map((d) => {
                      const dayOpen = isDayOpen(worker.id, d.day)
                      const selectedLocation = getLocationSelectValue(d.location)
                      const showCustomLocationInput =
                        selectedLocation === FILL_IN_BLANK_OPTION

                      return (
                        <div key={d.day} className="rounded-2xl border p-4">
                          <button
                            type="button"
                            onClick={() => toggleDay(worker.id, d.day)}
                            className="flex w-full items-center justify-between text-left"
                          >
                            <h3 className="font-bold text-black">
                              {d.day} ({getDayDateFromWeekEnding(weekEnding, d.day)})
                            </h3>
                            <span className="text-xl text-slate-600">
                              {dayOpen ? '−' : '+'}
                            </span>
                          </button>

                          {dayOpen && (
                            <div className="mt-4">
                              <select
                                value={selectedLocation}
                                onChange={(e) =>
                                  updateDay(
                                    worker.id,
                                    d.day,
                                    'location',
                                    e.target.value === FILL_IN_BLANK_OPTION ? '' : e.target.value
                                  )
                                }
                                className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-black"
                              >
                                <option value="">Select property</option>
                                {orderedPropertyOptions.map((property) => (
                                  <option key={property} value={property}>
                                    {property}
                                  </option>
                                ))}
                                <option value={FILL_IN_BLANK_OPTION}>
                                  {FILL_IN_BLANK_OPTION}
                                </option>
                              </select>

                              {showCustomLocationInput && (
                                <input
                                  value={
                                    PROPERTY_OPTIONS.includes(
                                      d.location as (typeof PROPERTY_OPTIONS)[number]
                                    )
                                      ? ''
                                      : d.location
                                  }
                                  onChange={(e) =>
                                    updateDay(
                                      worker.id,
                                      d.day,
                                      'location',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Type property name here"
                                  className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-black placeholder:text-gray-400"
                                />
                              )}

                              <textarea
                                value={d.job}
                                onChange={(e) =>
                                  updateDay(
                                    worker.id,
                                    d.day,
                                    'job',
                                    e.target.value
                                  )
                                }
                                placeholder="Job being done"
                                className="mt-3 min-h-24 w-full rounded-xl border bg-white px-3 py-2 text-black placeholder:text-gray-400"
                              />

                              <input
                                type="number"
                                step="0.01"
                                value={d.pay}
                                onChange={(e) =>
                                  updateDay(
                                    worker.id,
                                    d.day,
                                    'pay',
                                    e.target.value
                                  )
                                }
                                placeholder="Pay"
                                className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-black placeholder:text-gray-400"
                              />

                              <input
                                type="number"
                                step="0.01"
                                value={d.advance}
                                onChange={(e) =>
                                  updateDay(
                                    worker.id,
                                    d.day,
                                    'advance',
                                    e.target.value
                                  )
                                }
                                placeholder="Advance / Deduction"
                                className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-black placeholder:text-gray-400"
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
                        ${total(worker).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => deleteWorker(worker.id)}
                        className="rounded-2xl bg-red-600 px-4 py-2 text-white"
                      >
                        Delete Worker
                      </button>
                    </div>
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