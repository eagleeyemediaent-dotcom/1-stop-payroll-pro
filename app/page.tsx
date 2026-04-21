'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type WorkerDay = {
  day: string
  location: string
  job: string
  pay: string
}

type Worker = {
  id: string
  name: string
  days: WorkerDay[]
}

export default function HomePage() {
  const supabase = createClient()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [workerName, setWorkerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [weekEnding, setWeekEnding] = useState('')

  useEffect(() => {
    loadWorkers()
  }, [])

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
          days: Array.isArray(w.days) ? w.days : [],
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
          days: Array.isArray(data.days) ? data.days : [],
        },
      ])
      setWorkerName('')
    }
  }

  async function updateDay(
    workerId: string,
    day: string,
    field: 'location' | 'job' | 'pay',
    value: string
  ) {
    const updated = workers.map((worker) =>
      worker.id === workerId
        ? {
            ...worker,
            days: worker.days.map((d) =>
              d.day === day ? { ...d, [field]: value } : d
            ),
          }
        : worker
    )

    setWorkers(updated)

    const current = updated.find((w) => w.id === workerId)
    if (!current) return

    await supabase
      .from('payroll_workers')
      .update({ days: current.days })
      .eq('id', workerId)
  }

  async function deleteWorker(workerId: string) {
    const confirmed = window.confirm('Delete this worker?')
    if (!confirmed) return

    await supabase.from('payroll_workers').delete().eq('id', workerId)
    setWorkers((prev) => prev.filter((w) => w.id !== workerId))
  }

  function total(worker: Worker) {
    return worker.days.reduce((sum, d) => sum + Number(d.pay || 0), 0)
  }

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) =>
      worker.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [workers, search])

  const grandTotal = useMemo(() => {
    return filteredWorkers.reduce((sum, worker) => sum + total(worker), 0)
  }, [filteredWorkers])

  function printPayroll() {
    window.print()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl space-y-6 print:max-w-full print:space-y-4">
        <div className="rounded-3xl bg-slate-900 p-6 text-white print:rounded-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
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
              <p className="mt-2 text-sm text-slate-300">
                Worker name, location, job being done, pay & weekly total
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Week Ending</label>
                <input
                  type="date"
                  value={weekEnding}
                  onChange={(e) => setWeekEnding(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-white px-4 py-3 text-black"
                />
              </div>

              <div className="rounded-2xl bg-slate-800 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Total Payroll
                </div>
                <div className="mt-1 text-2xl font-bold">
                  ${grandTotal.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 print:hidden lg:grid-cols-[1fr_auto]">
          <div className="rounded-3xl bg-white p-5 shadow">
            <h2 className="font-bold text-lg">Add Worker</h2>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                placeholder="Worker name"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-black placeholder:text-gray-400"
              />

              <button
                type="button"
                onClick={addWorker}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-white"
              >
                Add Worker
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow">
            <h2 className="font-bold text-lg">Search Worker</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type worker name..."
              className="mt-3 w-full rounded-2xl border bg-white px-4 py-3 text-black placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="hidden rounded-3xl bg-white p-5 shadow print:block">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Payroll Report</h2>
              <p className="text-sm text-slate-500">
                Week Ending: {weekEnding || 'Not set'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Total Payroll</div>
              <div className="text-2xl font-bold">${grandTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="print:hidden">
          <button
            type="button"
            onClick={printPayroll}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-white"
          >
            Print / Save PDF
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-5 shadow">Loading workers...</div>
        ) : filteredWorkers.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 shadow">
            {search ? 'No workers found.' : 'No workers yet.'}
          </div>
        ) : (
          filteredWorkers.map((worker) => (
            <div key={worker.id} className="rounded-3xl bg-white p-5 shadow print:break-inside-avoid">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">{worker.name}</h2>
                  <p className="text-slate-500">
                    Weekly Total: ${total(worker).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => deleteWorker(worker.id)}
                  className="rounded-2xl bg-red-600 px-4 py-2 text-white print:hidden"
                >
                  Delete Worker
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {worker.days.map((d) => (
                  <div key={d.day} className="rounded-2xl border p-4">
                    <h3 className="font-bold text-black">{d.day}</h3>

                    <input
                      value={d.location}
                      onChange={(e) =>
                        updateDay(worker.id, d.day, 'location', e.target.value)
                      }
                      placeholder="Location"
                      className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-black placeholder:text-gray-400"
                    />

                    <textarea
                      value={d.job}
                      onChange={(e) =>
                        updateDay(worker.id, d.day, 'job', e.target.value)
                      }
                      placeholder="Job being done"
                      className="mt-3 min-h-24 w-full rounded-xl border bg-white px-3 py-2 text-black placeholder:text-gray-400"
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={d.pay}
                      onChange={(e) =>
                        updateDay(worker.id, d.day, 'pay', e.target.value)
                      }
                      placeholder="Pay"
                      className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-black placeholder:text-gray-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}