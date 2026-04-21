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
          days: data.days || [],
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
    await supabase.from('payroll_workers').delete().eq('id', workerId)
    setWorkers((prev) => prev.filter((w) => w.id !== workerId))
  }

  function total(worker: Worker) {
    return worker.days.reduce((sum, d) => sum + Number(d.pay || 0), 0)
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-slate-900 p-6 text-white">
          <h1 className="text-3xl font-bold">1 Stop Payroll Pro</h1>
          <p className="mt-2 text-sm text-slate-300">
            Worker name, location, job being done, pay & weekly total
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow">
          <h2 className="font-bold text-lg">Add Worker</h2>

          <input
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder="Worker name"
            className="mt-3 w-full rounded-2xl border bg-white px-4 py-3 text-black placeholder:text-gray-400"
          />

          <button
            type="button"
            onClick={addWorker}
            className="mt-3 rounded-2xl bg-slate-900 px-5 py-3 text-white"
          >
            Add Worker
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-5 shadow">
            Loading workers...
          </div>
        ) : (
          workers.map((worker) => (
            <div key={worker.id} className="rounded-3xl bg-white p-5 shadow">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{worker.name}</h2>
                  <p className="text-slate-500">
                    Weekly Total: ${total(worker).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => deleteWorker(worker.id)}
                  className="rounded-2xl bg-red-600 px-4 py-2 text-white"
                >
                  Delete Worker
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {worker.days.map((d) => (
                  <div key={d.day} className="rounded-2xl border p-4">
                    <h3 className="font-bold">{d.day}</h3>

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