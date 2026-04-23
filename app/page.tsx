"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Plus,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

type ShiftItem = {
  id: string;
  day: DayKey;
  date: string;
  property: string;
  customProperty: string;
  jobs: string[];
  customJob: string;
  pay: string;
  notes: string;
  expanded: boolean;
};

type Worker = {
  id: string;
  name: string;
  phone: string;
  rate: string;
  notes: string;
  advance: string;
  advanceReason: string;
  shifts: Record<DayKey, ShiftItem>;
};

const DAYS: { key: DayKey; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
];

const PROPERTY_OPTIONS = [
  "125 Governor St",
  "Charles Place Apartments",
  "Copley Chambers",
  "Maple Gardens",
  "Omni Point",
  "Phoenix Renaissance",
  "Riverstone Apartments",
  "Spring Villa Apartments",
  "Four Sisters Apartments",
  "Joseph Caffey Apartment",
  "Turning Point",
  "Tanglewood Village Apartments",
  "Valley Apartments",
  "Waterview Apartments",
  "Other",
];

const JOB_OPTIONS = [
  "Full Unit Painting",
  "Repair Damage Walls",
  "Trash Removal",
  "Repair Damage Walls Due To Water Leak",
  "Occupied Unit",
];

function createEmptyShift(day: DayKey): ShiftItem {
  return {
    id: `${day}-${crypto.randomUUID()}`,
    day,
    date: "",
    property: "",
    customProperty: "",
    jobs: [],
    customJob: "",
    pay: "",
    notes: "",
    expanded: false,
  };
}

function createWorker(name = "", phone = "", rate = "", notes = ""): Worker {
  return {
    id: crypto.randomUUID(),
    name,
    phone,
    rate,
    notes,
    advance: "",
    advanceReason: "",
    shifts: {
      monday: createEmptyShift("monday"),
      tuesday: createEmptyShift("tuesday"),
      wednesday: createEmptyShift("wednesday"),
      thursday: createEmptyShift("thursday"),
      friday: createEmptyShift("friday"),
      saturday: createEmptyShift("saturday"),
    },
  };
}

function parseMoney(value: string) {
  const n = Number(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function buildPreview(shift: ShiftItem) {
  const property =
    shift.property === "Other" ? shift.customProperty : shift.property;

  const jobs = [
    ...shift.jobs,
    ...(shift.customJob.trim() ? [shift.customJob.trim()] : []),
  ];

  return {
    propertyText: property?.trim() || "No property",
    jobText: jobs.length ? jobs.join(", ") : "No job selected",
    payText: shift.pay ? formatCurrency(parseMoney(shift.pay)) : "$0.00",
    dateText: shift.date || "No date",
  };
}

const STORAGE_KEY = "one-stop-turnover-workers-v1";

export default function Page() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  const [newWorkerRate, setNewWorkerRate] = useState("");
  const [newWorkerNotes, setNewWorkerNotes] = useState("");

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

    if (saved) {
      const parsed: Worker[] = JSON.parse(saved);
      setWorkers(parsed);
      setSelectedWorkerId(parsed[0]?.id ?? "");
      return;
    }

    const starter = createWorker("Sergio");
    setWorkers([starter]);
    setSelectedWorkerId(starter.id);
  }, []);

  useEffect(() => {
    if (!workers.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workers));
  }, [workers]);

  const selectedWorker =
    workers.find((worker) => worker.id === selectedWorkerId) ?? null;

  const updateShift = (
    workerId: string,
    day: DayKey,
    patch: Partial<ShiftItem>
  ) => {
    setWorkers((prev) =>
      prev.map((worker) => {
        if (worker.id !== workerId) return worker;

        return {
          ...worker,
          shifts: {
            ...worker.shifts,
            [day]: {
              ...worker.shifts[day],
              ...patch,
            },
          },
        };
      })
    );
  };

  const updateWorkerMeta = (
    workerId: string,
    patch: Partial<Pick<Worker, "phone" | "rate" | "notes">>
  ) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId ? { ...worker, ...patch } : worker
      )
    );
  };

  const toggleDayExpanded = (workerId: string, day: DayKey) => {
    setWorkers((prev) =>
      prev.map((worker) => {
        if (worker.id !== workerId) return worker;

        return {
          ...worker,
          shifts: {
            ...worker.shifts,
            [day]: {
              ...worker.shifts[day],
              expanded: !worker.shifts[day].expanded,
            },
          },
        };
      })
    );
  };

  const toggleJobSelection = (
    workerId: string,
    day: DayKey,
    job: string
  ) => {
    setWorkers((prev) =>
      prev.map((worker) => {
        if (worker.id !== workerId) return worker;

        const currentJobs = worker.shifts[day].jobs;
        const exists = currentJobs.includes(job);

        return {
          ...worker,
          shifts: {
            ...worker.shifts,
            [day]: {
              ...worker.shifts[day],
              jobs: exists
                ? currentJobs.filter((item) => item !== job)
                : [...currentJobs, job],
            },
          },
        };
      })
    );
  };

  const updateAdvance = (
    workerId: string,
    patch: { advance?: string; advanceReason?: string }
  ) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId ? { ...worker, ...patch } : worker
      )
    );
  };

  const addWorker = () => {
    const cleanName = newWorkerName.trim();
    if (!cleanName) return;

    const worker = createWorker(
      cleanName,
      newWorkerPhone.trim(),
      newWorkerRate.trim(),
      newWorkerNotes.trim()
    );

    setWorkers((prev) => [...prev, worker]);
    setSelectedWorkerId(worker.id);

    setNewWorkerName("");
    setNewWorkerPhone("");
    setNewWorkerRate("");
    setNewWorkerNotes("");
    setShowAddModal(false);
  };

  const deleteSelectedWorker = () => {
    if (!selectedWorker || workers.length <= 1) return;

    const filtered = workers.filter((worker) => worker.id !== selectedWorker.id);
    setWorkers(filtered);
    setSelectedWorkerId(filtered[0]?.id ?? "");
  };

  const totals = useMemo(() => {
    return workers.map((worker) => {
      const totalPay = DAYS.reduce((sum, day) => {
        return sum + parseMoney(worker.shifts[day.key].pay);
      }, 0);

      const advance = parseMoney(worker.advance);
      const net = totalPay - advance;

      return {
        workerId: worker.id,
        totalPay,
        advance,
        net,
      };
    });
  }, [workers]);

  const selectedTotals = totals.find((item) => item.workerId === selectedWorker?.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#193668_0%,_#0a1731_38%,_#040b18_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-6 rounded-[30px] border border-white/10 bg-white/[0.04] px-6 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="One Stop Turnover Specialist"
              width={150}
              height={60}
              priority
              className="h-16 w-auto object-contain"
            />
          </div>
        </header>

        <section className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="One Stop Turnover Specialist"
              width={220}
              height={100}
              priority
              className="mb-4 h-24 w-auto object-contain"
            />

            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
              Premium Workforce Dashboard
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-6xl">
              1 Stop Turnover Specialist LLC Pro
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-lg">
              A cleaner, faster, premium workflow for selecting workers,
              tracking daily jobs, assigning properties, managing advances, and
              controlling weekly payouts.
            </p>
          </div>
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-300">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Worker Control Center</h2>
                <p className="text-sm text-gray-300">
                  Select a worker and manage everything from one premium panel.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.5fr_auto_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-100">
                  Select Worker
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d162b] px-4 py-4 text-base text-white outline-none transition focus:border-amber-400"
                >
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name || "Unnamed Worker"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex h-[56px] items-center gap-2 rounded-2xl bg-amber-500 px-5 font-bold text-black shadow-lg transition hover:scale-[1.01] hover:bg-amber-400"
                >
                  <Plus className="h-4 w-4" />
                  Add Worker
                </button>
              </div>

              <div className="flex items-end">
                <button
                  onClick={deleteSelectedWorker}
                  className="inline-flex h-[56px] items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 font-bold text-red-300 transition hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-emerald-500/10 via-white/[0.04] to-amber-500/10 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Weekly Summary</h2>
                <p className="text-sm text-gray-300">
                  Live totals for the selected worker.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4">
                <span className="text-gray-200">Worker</span>
                <span className="font-bold text-white">
                  {selectedWorker?.name || "No worker selected"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4">
                <span className="text-gray-200">Gross Total</span>
                <span className="font-bold text-white">
                  {formatCurrency(selectedTotals?.totalPay ?? 0)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4">
                <span className="text-gray-200">Advance</span>
                <span className="font-bold text-red-300">
                  - {formatCurrency(selectedTotals?.advance ?? 0)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 px-4 py-5">
                <span className="text-base font-bold text-emerald-200">
                  Final Payout
                </span>
                <span className="text-2xl font-extrabold text-emerald-300">
                  {formatCurrency(selectedTotals?.net ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {selectedWorker && (
          <>
            <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                  Selected Worker
                </div>
                <div className="mt-2 text-2xl font-extrabold text-white">
                  {selectedWorker.name}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                  Worker Phone
                </div>
                <div className="mt-2 text-xl font-bold text-white">
                  {selectedWorker.phone || "Not added"}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                  Default Rate
                </div>
                <div className="mt-2 text-xl font-bold text-white">
                  {selectedWorker.rate ? `$${selectedWorker.rate}` : "Not added"}
                </div>
              </div>
            </section>

            <section className="mb-8 rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {selectedWorker.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-300">
                    Daily job tracking for the selected worker.
                  </p>
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
                  {workers.length} Worker{workers.length !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-100">
                    Phone
                  </label>
                  <input
                    value={selectedWorker.phone}
                    onChange={(e) =>
                      updateWorkerMeta(selectedWorker.id, { phone: e.target.value })
                    }
                    placeholder="Worker phone"
                    className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-100">
                    Default Rate
                  </label>
                  <input
                    value={selectedWorker.rate}
                    onChange={(e) =>
                      updateWorkerMeta(selectedWorker.id, { rate: e.target.value })
                    }
                    placeholder="Hourly or day rate"
                    className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-100">
                    Worker Notes
                  </label>
                  <input
                    value={selectedWorker.notes}
                    onChange={(e) =>
                      updateWorkerMeta(selectedWorker.id, { notes: e.target.value })
                    }
                    placeholder="General worker notes"
                    className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid gap-4">
                {DAYS.map((day) => {
                  const shift = selectedWorker.shifts[day.key];
                  const preview = buildPreview(shift);

                  return (
                    <div
                      key={day.key}
                      className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1427]/90 shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleDayExpanded(selectedWorker.id, day.key)
                        }
                        className="w-full px-4 py-4 text-left transition hover:bg-white/[0.03] md:px-5"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-full bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-300">
                              {day.label}
                            </div>

                            <div className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-gray-100">
                              {preview.dateText}
                            </div>
                          </div>

                          <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-gray-100">
                              <Building2 className="h-4 w-4 text-amber-300" />
                              {preview.propertyText}
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-gray-100">
                              <Briefcase className="h-4 w-4 text-amber-300" />
                              {preview.jobText}
                            </div>

                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                              <DollarSign className="h-4 w-4" />
                              {preview.payText}
                            </div>

                            <div className="inline-flex items-center justify-center rounded-full bg-white/5 px-3 py-2 text-gray-200">
                              {shift.expanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {shift.expanded && (
                        <div className="border-t border-white/10 px-4 py-5 md:px-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-100">
                                Date
                              </label>
                              <div className="relative">
                                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                                <input
                                  type="date"
                                  value={shift.date}
                                  onChange={(e) =>
                                    updateShift(selectedWorker.id, day.key, {
                                      date: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-10 py-3 text-white outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-100">
                                Pay
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={shift.pay}
                                onChange={(e) =>
                                  updateShift(selectedWorker.id, day.key, {
                                    pay: e.target.value,
                                  })
                                }
                                placeholder="0.00"
                                className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-semibold text-gray-100">
                              Property
                            </label>
                            <select
                              value={shift.property}
                              onChange={(e) =>
                                updateShift(selectedWorker.id, day.key, {
                                  property: e.target.value,
                                })
                              }
                              className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white outline-none focus:border-amber-400"
                            >
                              <option value="">Select property</option>
                              {PROPERTY_OPTIONS.map((property) => (
                                <option key={property} value={property}>
                                  {property}
                                </option>
                              ))}
                            </select>
                          </div>

                          {shift.property === "Other" && (
                            <div className="mt-4">
                              <label className="mb-2 block text-sm font-semibold text-gray-100">
                                Custom Property
                              </label>
                              <input
                                value={shift.customProperty}
                                onChange={(e) =>
                                  updateShift(selectedWorker.id, day.key, {
                                    customProperty: e.target.value,
                                  })
                                }
                                placeholder="Type custom property"
                                className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                              />
                            </div>
                          )}

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-semibold text-gray-100">
                              Job Being Done
                            </label>
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                              {JOB_OPTIONS.map((job) => {
                                const selected = shift.jobs.includes(job);

                                return (
                                  <button
                                    key={job}
                                    type="button"
                                    onClick={() =>
                                      toggleJobSelection(
                                        selectedWorker.id,
                                        day.key,
                                        job
                                      )
                                    }
                                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                      selected
                                        ? "border-amber-400 bg-amber-500/15 text-amber-300"
                                        : "border-white/10 bg-[#111a31] text-gray-100 hover:border-amber-400/60"
                                    }`}
                                  >
                                    {job}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-semibold text-gray-100">
                              Custom Job
                            </label>
                            <input
                              value={shift.customJob}
                              onChange={(e) =>
                                updateShift(selectedWorker.id, day.key, {
                                  customJob: e.target.value,
                                })
                              }
                              placeholder="Add your own custom job if needed"
                              className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-semibold text-gray-100">
                              Notes
                            </label>
                            <textarea
                              value={shift.notes}
                              onChange={(e) =>
                                updateShift(selectedWorker.id, day.key, {
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Extra details for this day"
                              rows={3}
                              className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-300">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Advance / Deduction</h2>
                    <p className="text-sm text-gray-300">
                      Track any money given before final payout.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-100">
                      Advance Amount
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={selectedWorker.advance}
                      onChange={(e) =>
                        updateAdvance(selectedWorker.id, {
                          advance: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-100">
                      Reason
                    </label>
                    <input
                      value={selectedWorker.advanceReason}
                      onChange={(e) =>
                        updateAdvance(selectedWorker.id, {
                          advanceReason: e.target.value,
                        })
                      }
                      placeholder="Reason for advance"
                      className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-[#13284b] to-[#0b1324] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                <h2 className="text-xl font-bold">Executive Snapshot</h2>
                <p className="mt-1 text-sm text-gray-300">
                  Fast visual control for payroll decisions.
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Selected Worker
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">
                      {selectedWorker.name}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Gross Total
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-white">
                      {formatCurrency(selectedTotals?.totalPay ?? 0)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                      Deduction
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-red-300">
                      {formatCurrency(selectedTotals?.advance ?? 0)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                      Final Payout
                    </div>
                    <div className="mt-1 text-3xl font-extrabold text-emerald-300">
                      {formatCurrency(selectedTotals?.net ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#0c1527] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Add New Worker</h3>
                  <p className="mt-1 text-sm text-gray-300">
                    Create a saved worker profile for your crew.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-2 text-gray-200 hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-100">
                    Worker Name
                  </label>
                  <input
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    placeholder="Enter worker name"
                    className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-100">
                      Phone
                    </label>
                    <input
                      value={newWorkerPhone}
                      onChange={(e) => setNewWorkerPhone(e.target.value)}
                      placeholder="Worker phone"
                      className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-100">
                      Default Rate
                    </label>
                    <input
                      value={newWorkerRate}
                      onChange={(e) => setNewWorkerRate(e.target.value)}
                      placeholder="Hourly or day rate"
                      className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-100">
                    Notes
                  </label>
                  <textarea
                    value={newWorkerNotes}
                    onChange={(e) => setNewWorkerNotes(e.target.value)}
                    rows={3}
                    placeholder="Optional notes"
                    className="w-full rounded-2xl border border-white/10 bg-[#111a31] px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  onClick={addWorker}
                  className="rounded-2xl bg-amber-500 px-5 py-3 font-bold text-black hover:bg-amber-400"
                >
                  Save Worker
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}