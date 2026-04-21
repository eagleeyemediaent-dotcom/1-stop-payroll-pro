'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    async function loadWorkers() {
      const { data, error } = await supabase
        .from('payroll_workers')
        .select('*')
        .order('created_at', { ascending: true })

      if (!error && data) {
        setWorkers(
          data.map((worker) => ({
            id: worker.id,
            name: worker.name,
            days: Array.isArray(worker.days) ? worker.days : [],
          }))
        )
      }

      setLoading(false)
    }

    loadWorkers()
  }, [supabase])

  async function addWorker() {
    if (!workerName.trim()) return

    const newWorker = {
      name: workerName,
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
    setWorkers((prev) => prev.filter((worker) => worker.id !== workerId))
  }

  function workerTotal(worker: Worker) {
    return worker.days.reduce((sum, d) => sum + Number(d.pay || 0), 0)
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-slate-900 p-6 text-white">
          <h1 className="text-3xl font-bold">1 Stop Payroll Pro</h1>
          <p className="mt-2 text-sm text-slate-300">
            Worker name, location, job being done, pay, and weekly total.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow">
          <h2 className="font-bold">Add Worker</h2>
          <input
            className="mt-3 w-full rounded-2xl border px-4 py-3"
            placeholder="Worker name"
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
          />
          <button
            onClick={addWorker}
            className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-white"
          >
            Add Worker
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-5 shadow">Loading workers...</div>
        ) : (
          workers.map((worker) => (
            <div key={worker.id} className="rounded-3xl bg-white p-5 shadow">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{worker.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Weekly total: ${workerTotal(worker).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => deleteWorker(worker.id)}
                  className="rounded-2xl border border-red-300 px-4 py-2 text-red-600"
                >
                  Delete Worker
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {worker.days.map((d) => (
                  <div key={d.day} className="rounded-2xl border p-4">
                    <h4 className="font-bold">{d.day}</h4>

                    <input
                      className="mt-3 w-full rounded-xl border px-3 py-2"
                      placeholder="Location"
                      value={d.location}
                      onChange={(e) =>
                        updateDay(worker.id, d.day, 'location', e.target.value)
                      }
                    />

                    <textarea
                      className="mt-3 min-h-24 w-full rounded-xl border px-3 py-2"
                      placeholder="Job being done"
                      value={d.job}
                      onChange={(e) =>
                        updateDay(worker.id, d.day, 'job', e.target.value)
                      }
                    />

                    <input
                      type="number"
                      step="0.01"
                      className="mt-3 w-full rounded-xl border px-3 py-2"
                      placeholder="Pay"
                      value={d.pay}
                      onChange={(e) =>
                        updateDay(worker.id, d.day, 'pay', e.target.value)
                      }
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