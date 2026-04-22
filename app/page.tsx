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

const JOB_OPTIONS = [
  'Full Unit Painting',
  'Repair Damage Walls',
  'Trash Removal',
  'Repair Damage Walls Due To Water Leak',
  'Occupied Unit',
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

function getPreviousWeekEnding(currentWeekEnding: string) {
  const current = new Date(`${currentWeekEnding}T12:00:00`)
  const prev = new Date(current)
  prev.setDate(current.getDate() - 7)
  return prev.toISOString().slice(0, 10)
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

function parseJobValue(job: string) {
  const selectedJobs = job
    ? job.split(' | ').map((item) => item.trim()).filter(Boolean)
    : []

  const presetJobs = selectedJobs.filter((item) => JOB_OPTIONS.includes(item))
  const customJobs = selectedJobs.filter((item) => !JOB_OPTIONS.includes(item))
  const customJobText = customJobs.join(' | ')

  return { presetJobs, customJobText }
}

function parseLocationValue(location: string) {
  if (!location) {
    return { presetLocation: '', customLocationText: '' }
  }

  if (PROPERTY_OPTIONS.includes(location)) {
    return { presetLocation: location, customLocationText: '' }
  }

  return { presetLocation: '', customLocationText: location }
}

function DarkTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
      {children}
    </span>
  )
}

function PayTag({ amount }: { amount: string }) {
  return (
    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
      ${Number(amount || 0).toFixed(2)}
    </span>
  )
}

function JobTag({ label }: { label: string }) {
  const lower = label.toLowerCase()

  let className = 'rounded-full px-3 py-1 text-xs font-semibold '

  if (lower.includes('paint')) {
    className += 'bg-blue-100 text-blue-800'
  } else if (lower.includes('trash')) {
    className += 'bg-red-100 text-red-800'
  } else if (lower.includes('repair')) {
    className += 'bg-orange-100 text-orange-800'
  } else if (lower.includes('occupied')) {
    className += 'bg-purple-100 text-purple-800'
  } else if (lower.includes('custom:')) {
    className += 'bg-slate-200 text-slate-900'
  } else {
    className += 'bg-slate-200 text-slate-900'
  }

  return <span className={className}>{label}</span>
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
  const [openJobMenus, setOpenJobMenus] = useState<Record<string, boolean>>({})
  const [openPropertyMenus, setOpenPropertyMenus] = useState<Record<string, boolean>>({})

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

  async function copyLastWeekForward() {
    if (isLocked) return

    const previousWeekEnding = getPreviousWeekEnding(weekEnding)

    const { data: previousWorkers, error } = await supabase
      .from('payroll_workers')
      .select('*')
      .eq('weekending', previousWeekEnding)
      .order('created_at', { ascending: true })

    if (error || !previousWorkers || previousWorkers.length === 0) {
      window.alert('No workers found for the previous week.')
      return
    }

    if (workers.length > 0) {
      window.alert('This week already has workers. Copy skipped.')
      return
    }

    const newRows = previousWorkers.map((w) => ({
      name: w.name || '',
      phone: w.phone || '',
      notes: w.notes || '',
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
    }))

    const { data } = await supabase
      .from('payroll_workers')
      .insert(newRows)
      .select()

    if (data) {
      const list: Worker[] = data.map((w) => ({
        id: w.id,
        name: w.name || '',
        phone: w.phone || '',
        notes: w.notes || '',
        paid: !!w.paid,
        weekending: w.weekending || weekEnding,
        days: normalizeDays(w.days),
      }))
      setWorkers(list)
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

    const first = window.confirm('Are you sure you want to delete this worker?')
    if (!first) return
    const second = window.confirm('YES DELETE? This cannot be undone.')
    if (!second) return

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

  const paidTotal = useMemo(() => {
    return workers.filter((w) => w.paid).reduce((sum, w) => sum + workerNet(w), 0)
  }, [workers])

  const unpaidTotal = useMemo(() => {
    return workers.filter((w) => !w.paid).reduce((sum, w) => sum + workerNet(w), 0)
  }, [workers])

  const advancesTotal = useMemo(() => {
    return workers.reduce((sum, w) => sum + workerAdvanceTotal(w), 0)
  }, [workers])

  const propertyUsage = useMemo(() => {
    const counts: Record<string, number> = {}
    workers.forEach((worker) => {
      worker.days.forEach((day) => {
        if (PROPERTY_OPTIONS.includes(day.location)) {
          counts[day.location] = (counts[day.location] || 0) + 1
        }
      })
    })
    return counts
  }, [workers])

  const orderedPropertyOptions = useMemo(() => {
    return [...PROPERTY_OPTIONS].sort((a, b) => {
      const countA = propertyUsage[a] || 0
      const countB = propertyUsage[b] || 0
      if (countA !== countB) return countB - countA
      return a.localeCompare(b)
    })
  }, [propertyUsage])

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
        <head><title>${worker.name} Payroll Slip</title></head>
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
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top:24px;">
            <p><strong>Gross Pay:</strong> $${workerGross(worker).toFixed(2)}</p>
            <p><strong>Total Advances:</strong> $${workerAdvanceTotal(worker).toFixed(2)}</p>
            <p><strong>Net Payout:</strong> $${workerNet(worker).toFixed(2)}</p>
          </div>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  function toggleJobOption(worker: Worker, dayName: string, option: string) {
    const day = worker.days.find((d) => d.day === dayName)
    if (!day || isLocked) return

    const { presetJobs, customJobText } = parseJobValue(day.job)
    const nextPresetJobs = presetJobs.includes(option)
      ? presetJobs.filter((item) => item !== option)
      : [...presetJobs, option]

    const combined = [...nextPresetJobs, ...(customJobText ? [customJobText] : [])]
      .filter(Boolean)
      .join(' | ')

    updateDay(worker.id, dayName, 'job', combined)
  }

  function updateCustomJob(worker: Worker, dayName: string, value: string) {
    if (isLocked) return

    const day = worker.days.find((d) => d.day === dayName)
    if (!day) return

    const { presetJobs } = parseJobValue(day.job)

    const combined = [...presetJobs, ...(value.trim() ? [value.trim()] : [])]
      .filter(Boolean)
      .join(' | ')

    updateDay(worker.id, dayName, 'job', combined)
  }

  function toggleJobMenu(workerId: string, dayName: string) {
    const key = `${workerId}-${dayName}-jobs`
    setOpenJobMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  function isJobMenuOpen(workerId: string, dayName: string) {
    return !!openJobMenus[`${workerId}-${dayName}-jobs`]
  }

  function togglePropertyMenu(workerId: string, dayName: string) {
    const key = `${workerId}-${dayName}-property`
    setOpenPropertyMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  function isPropertyMenuOpen(workerId: string, dayName: string) {
    return !!openPropertyMenus[`${workerId}-${dayName}-property`]
  }

  function selectProperty(workerId: string, dayName: string, property: string) {
    const key = `${workerId}-${dayName}`
    setCustomLocationMode((prev) => ({
      ...prev,
      [key]: false,
    }))
    updateDay(workerId, dayName, 'location', property)
  }

  function enableCustomProperty(workerId: string, dayName: string) {
    const key = `${workerId}-${dayName}`
    setCustomLocationMode((prev) => ({
      ...prev,
      [key]: true,
    }))
    updateDay(workerId, dayName, 'location', '')
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="logo"
              className="h-16 w-16 rounded-xl bg-white object-contain p-1"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">
                1 Stop Turnover Specialist LLC Pro
              </h1>
              <p className="text-sm font-medium text-slate-200">
                Owner Control Center
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Total Payroll
              </div>
              <div className="mt-2 text-3xl font-bold text-white">
                ${grandTotal.toFixed(2)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Paid Total
              </div>
              <div className="mt-2 text-3xl font-bold text-green-400">
                ${paidTotal.toFixed(2)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Unpaid Total
              </div>
              <div className="mt-2 text-3xl font-bold text-amber-400">
                ${unpaidTotal.toFixed(2)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Total Advances
              </div>
              <div className="mt-2 text-3xl font-bold text-red-400">
                ${advancesTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Week Ending
              </div>

              <input
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                className="mt-2 w-full rounded-xl bg-white px-4 py-3 font-medium text-black"
              />

              {weeks.length > 0 && (
                <select
                  value={weekEnding}
                  onChange={(e) => setWeekEnding(e.target.value)}
                  className="mt-3 w-full rounded-xl bg-white px-4 py-3 font-medium text-black"
                >
                  {weeks.map((w) => (
                    <option key={w.id} value={w.week_ending}>
                      {w.week_ending} {w.is_locked ? '🔒' : ''}
                    </option>
                  ))}
                </select>
              )}

              <div className="mt-3 text-sm font-semibold text-slate-100">
                {isLocked ? '🔒 Week Locked' : '🔓 Week Open'}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={toggleWeekLock}
                  className="rounded-xl bg-black px-4 py-2 font-semibold text-white"
                >
                  {isLocked ? 'Unlock Week' : 'Lock Week'}
                </button>

                <button
                  onClick={copyLastWeekForward}
                  disabled={isLocked}
                  className="rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  Copy Last Week Forward
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800 p-4">
              <div className="text-sm font-semibold text-white">
                Add Worker
              </div>

              <input
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                placeholder="Worker name"
                disabled={isLocked}
                className="mt-3 w-full rounded-xl bg-white px-4 py-3 font-medium text-black placeholder:text-slate-500 disabled:bg-slate-200"
              />

              <button
                onClick={addWorker}
                disabled={isLocked}
                className="mt-3 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                Add Worker
              </button>

              <div className="mt-4 text-sm font-semibold text-white">
                Search Worker
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or notes"
                className="mt-3 w-full rounded-xl bg-white px-4 py-3 font-medium text-black placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-4 font-medium text-black shadow">
            Loading...
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 font-medium text-black shadow">
            No workers found.
          </div>
        ) : (
          filteredWorkers.map((worker) => {
            const open = openWorkerId === worker.id
            const tab = workerTabs[worker.id] || 'payroll'

            return (
              <div key={worker.id} className="rounded-3xl bg-white p-5 shadow-lg">
                <button
                  onClick={() => toggleWorker(worker.id)}
                  className="flex w-full items-center justify-between"
                >
                  <div className="text-left">
                    <div className="text-2xl font-bold text-black">
                      {worker.name}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${worker.paid ? 'text-green-700' : 'text-amber-700'}`}>
                        {worker.paid ? 'PAID' : 'UNPAID'}
                      </span>

                      <span className="text-sm font-semibold text-slate-700">
                        Net: ${workerNet(worker).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="text-2xl font-bold text-slate-700">
                    {open ? '−' : '+'}
                  </div>
                </button>

                {open && (
                  <div className="mt-5">
                    <div className="mb-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-700">Gross Pay</div>
                        <div className="mt-1 text-2xl font-bold text-black">
                          ${workerGross(worker).toFixed(2)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-700">Advance Summary</div>
                        <div className="mt-1 text-2xl font-bold text-red-700">
                          -${workerAdvanceTotal(worker).toFixed(2)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-700">Net Payout</div>
                        <div className="mt-1 text-2xl font-bold text-black">
                          ${workerNet(worker).toFixed(2)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-700">Payroll Slip</div>
                        <button
                          onClick={() => printWorkerSlip(worker)}
                          className="mt-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white"
                        >
                          Print Worker Slip
                        </button>
                      </div>
                    </div>

                    <div className="mb-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => setTab(worker.id, 'payroll')}
                        className={`rounded-xl px-4 py-2 font-semibold ${tab === 'payroll' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-black'}`}
                      >
                        Payroll
                      </button>

                      <button
                        onClick={() => setTab(worker.id, 'notes')}
                        className={`rounded-xl px-4 py-2 font-semibold ${tab === 'notes' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-black'}`}
                      >
                        Notes
                      </button>

                      <button
                        onClick={() => setTab(worker.id, 'admin')}
                        className={`rounded-xl px-4 py-2 font-semibold ${tab === 'admin' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-black'}`}
                      >
                        Admin
                      </button>
                    </div>

                    {tab === 'payroll' && (
                      <div className="space-y-4">
                        {worker.days.map((d) => {
                          const dayOpen = isDayOpen(worker.id, d.day)
                          const key = `${worker.id}-${d.day}`
                          const { presetJobs, customJobText } = parseJobValue(d.job)
                          const jobMenuOpen = isJobMenuOpen(worker.id, d.day)
                          const propertyMenuOpen = isPropertyMenuOpen(worker.id, d.day)
                          const { presetLocation, customLocationText } = parseLocationValue(d.location)

                          const previewJobLabel = presetJobs[0]
                            ? presetJobs[0]
                            : customJobText
                            ? `Custom: ${customJobText}`
                            : 'No Job'

                          const previewPropertyLabel = presetLocation || customLocationText || 'No Property'

                          return (
                            <div key={d.day} className="rounded-2xl border border-slate-300 p-4">
                              <button
                                onClick={() => toggleDay(worker.id, d.day)}
                                className="flex w-full items-center justify-between gap-4"
                              >
                                <div className="min-w-0 flex-1 text-left">
                                  <div className="font-bold text-black">
                                    {d.day} ({getDayDateFromWeekEnding(weekEnding, d.day)})
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <DarkTag>{previewPropertyLabel}</DarkTag>
                                    <JobTag label={previewJobLabel} />
                                    <PayTag amount={d.pay} />
                                  </div>
                                </div>

                                <div className="shrink-0 text-xl font-bold text-slate-700">
                                  {dayOpen ? '−' : '+'}
                                </div>
                              </button>

                              {dayOpen && (
                                <div className="mt-4 space-y-3">
                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <div className="text-sm font-bold text-black">Property</div>

                                    <button
                                      type="button"
                                      disabled={isLocked}
                                      onClick={() => togglePropertyMenu(worker.id, d.day)}
                                      className="mt-3 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
                                    >
                                      {propertyMenuOpen ? 'Hide Property ▲' : 'Select Property ▼'}
                                    </button>

                                    {propertyMenuOpen && (
                                      <div className="mt-3 rounded-xl bg-white p-3">
                                        <div className="max-h-64 space-y-2 overflow-y-auto">
                                          {orderedPropertyOptions.map((property) => (
                                            <button
                                              key={property}
                                              type="button"
                                              disabled={isLocked}
                                              onClick={() => selectProperty(worker.id, d.day, property)}
                                              className="block w-full rounded-lg bg-slate-100 px-3 py-2 text-left text-sm font-medium text-black hover:bg-slate-200 disabled:opacity-50"
                                            >
                                              {property}
                                            </button>
                                          ))}

                                          <button
                                            type="button"
                                            disabled={isLocked}
                                            onClick={() => enableCustomProperty(worker.id, d.day)}
                                            className="block w-full rounded-lg bg-slate-900 px-3 py-2 text-left text-sm font-semibold text-white disabled:opacity-50"
                                          >
                                            {FILL_IN_BLANK_OPTION}
                                          </button>
                                        </div>

                                        {customLocationMode[key] && (
                                          <input
                                            value={customLocationText}
                                            disabled={isLocked}
                                            onChange={(e) =>
                                              updateDay(worker.id, d.day, 'location', e.target.value)
                                            }
                                            placeholder="Type property"
                                            className="mt-3 w-full rounded-xl border bg-white px-3 py-2 font-medium text-black placeholder:text-slate-500 disabled:bg-slate-200"
                                          />
                                        )}
                                      </div>
                                    )}

                                    {(presetLocation || customLocationText) && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {presetLocation && <DarkTag>{presetLocation}</DarkTag>}
                                        {customLocationText && <DarkTag>Custom: {customLocationText}</DarkTag>}
                                      </div>
                                    )}
                                  </div>

                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <div className="text-sm font-bold text-black">Job Being Done</div>

                                    <button
                                      type="button"
                                      disabled={isLocked}
                                      onClick={() => toggleJobMenu(worker.id, d.day)}
                                      className="mt-3 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
                                    >
                                      {jobMenuOpen ? 'Hide Jobs ▲' : 'Select Jobs ▼'}
                                    </button>

                                    {jobMenuOpen && (
                                      <div className="mt-3 space-y-2 rounded-xl bg-white p-3">
                                        {JOB_OPTIONS.map((option) => (
                                          <label
                                            key={option}
                                            className="flex items-center gap-2 text-sm font-medium text-black"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={presetJobs.includes(option)}
                                              disabled={isLocked}
                                              onChange={() => toggleJobOption(worker, d.day, option)}
                                            />
                                            <span>{option}</span>
                                          </label>
                                        ))}

                                        <input
                                          value={customJobText}
                                          disabled={isLocked}
                                          onChange={(e) => updateCustomJob(worker, d.day, e.target.value)}
                                          placeholder="Fill in your own job"
                                          className="mt-3 w-full rounded-xl border bg-white px-3 py-2 font-medium text-black placeholder:text-slate-500 disabled:bg-slate-200"
                                        />
                                      </div>
                                    )}

                                    {(presetJobs.length > 0 || customJobText) && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {presetJobs.map((job) => (
                                          <JobTag key={job} label={job} />
                                        ))}

                                        {customJobText && (
                                          <JobTag label={`Custom: ${customJobText}`} />
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <input
                                    value={d.pay}
                                    disabled={isLocked}
                                    onChange={(e) => updateDay(worker.id, d.day, 'pay', e.target.value)}
                                    placeholder="Pay"
                                    className="w-full rounded-xl border bg-white px-3 py-2 font-medium text-black placeholder:text-slate-500 disabled:bg-slate-200"
                                  />

                                  <input
                                    value={d.advance}
                                    disabled={isLocked}
                                    onChange={(e) => updateDay(worker.id, d.day, 'advance', e.target.value)}
                                    placeholder="Advance"
                                    className="w-full rounded-xl border bg-white px-3 py-2 font-medium text-black placeholder:text-slate-500 disabled:bg-slate-200"
                                  />

                                  <textarea
                                    value={d.advanceNote}
                                    disabled={isLocked}
                                    onChange={(e) => updateDay(worker.id, d.day, 'advanceNote', e.target.value)}
                                    placeholder="Reason for advance"
                                    className="min-h-20 w-full rounded-xl border bg-white px-3 py-2 font-medium text-black placeholder:text-slate-500 disabled:bg-slate-200"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}

                        <div className="rounded-2xl bg-slate-100 p-4 text-right">
                          <div className="text-sm font-semibold text-slate-700">
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
                          <label className="text-sm font-semibold text-slate-700">
                            Phone Number
                          </label>
                          <input
                            value={worker.phone}
                            disabled={isLocked}
                            onChange={(e) => updateWorkerField(worker.id, 'phone', e.target.value)}
                            placeholder="Worker phone number"
                            className="mt-2 w-full rounded-xl border bg-white px-3 py-2 font-medium text-black placeholder:text-slate-500 disabled:bg-slate-200"
                          />
                        </div>

                        <div className="rounded-2xl bg-slate-100 p-4">
                          <label className="text-sm font-semibold text-slate-700">
                            Worker Notes
                          </label>
                          <textarea
                            value={worker.notes}
                            disabled={isLocked}
                            onChange={(e) => updateWorkerField(worker.id, 'notes', e.target.value)}
                            placeholder="Add notes about this worker"
                            className="mt-2 min-h-32 w-full rounded-xl border bg-white px-3 py-2 font-medium text-black placeholder:text-slate-500 disabled:bg-slate-200"
                          />
                        </div>
                      </div>
                    )}

                    {tab === 'admin' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-slate-100 p-4">
                          <div className="text-sm font-semibold text-slate-700">
                            Status
                          </div>

                          <div className={`mt-1 text-xl font-bold ${worker.paid ? 'text-green-700' : 'text-amber-700'}`}>
                            {worker.paid ? 'PAID' : 'UNPAID'}
                          </div>

                          <button
                            onClick={() => togglePaid(worker)}
                            disabled={isLocked}
                            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
                          >
                            {worker.paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                        </div>

                        <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
                          <div className="font-bold text-red-700">Danger Zone</div>

                          <p className="mt-1 text-sm font-medium text-red-700">
                            Delete worker only if sure.
                          </p>

                          <button
                            onClick={() => deleteWorker(worker.id)}
                            disabled={isLocked}
                            className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
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