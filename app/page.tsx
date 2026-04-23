"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Download,
  FileUp,
  Menu,
  MoreHorizontal,
  Plus,
  StickyNote,
  User,
  Wallet,
  X,
} from "lucide-react";

type JobEntry = {
  id: string;
  property: string;
  workDone: string;
  pay: number;
  notes?: string;
};

type DayEntry = {
  id: string;
  dayLabel: string;
  date: string;
  jobs: JobEntry[];
  collapsed?: boolean;
};

type EmployeeStatus = "Unpaid" | "Partial" | "Paid" | "Advance Due";

type Employee = {
  id: string;
  name: string;
  phone: string;
  defaultRate: string;
  notes: string;
  paidAmountSoFar: number;
  advanceAmount: number;
  advanceReason: string;
  manualStatus: EmployeeStatus;
  weekLocked: boolean;
  days: DayEntry[];
};

const STORAGE_KEY = "one-stop-payroll-pro-v7-mobile-final";

const PROPERTY_OPTIONS = [
  "125 Governor St",
  "Charles Place Apartments",
  "Copley Chambers",
  "Four Sisters Apartments",
  "Maple Gardens",
  "Omni Point",
  "Phoenix Renaissance",
  "Riverstone Apartments",
  "Spring Villa Apartments",
  "Tanglewood Village Apartments",
  "Turning Point",
  "Valley Apartments",
  "Waterview Apartments",
  "Other",
];

const WORK_OPTIONS = [
  "Full Unit Painting",
  "Repair Damage Walls",
  "Trash Removal",
  "Repair Damage Walls Due To Water Leak",
  "Occupied Unit",
  "Clean Out",
  "Touch Up",
  "Patch And Paint",
  "Final Clean",
  "Other",
];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function blankJob(): JobEntry {
  return {
    id: uid("job"),
    property: "",
    workDone: "",
    pay: 0,
    notes: "",
  };
}

function dayTemplate(dayLabel: string, date: string): DayEntry {
  return {
    id: uid("day"),
    dayLabel,
    date,
    collapsed: false,
    jobs: [blankJob()],
  };
}

function createWeekFromToday() {
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);

  const labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return labels.map((label, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return dayTemplate(label, current.toISOString().slice(0, 10));
  });
}

function createEmployee(name = "New Employee"): Employee {
  return {
    id: uid("emp"),
    name,
    phone: "",
    defaultRate: "",
    notes: "",
    paidAmountSoFar: 0,
    advanceAmount: 0,
    advanceReason: "",
    manualStatus: "Unpaid",
    weekLocked: false,
    days: createWeekFromToday(),
  };
}

function seedEmployees(): Employee[] {
  return [createEmployee("Marrero"), createEmployee("Hector"), createEmployee("Sergio")];
}

function getEmployeeTotals(employee: Employee) {
  const grossTotal = employee.days.reduce((sum, day) => {
    return sum + day.jobs.reduce((jobSum, job) => jobSum + parseMoney(job.pay), 0);
  }, 0);

  const advance = parseMoney(employee.advanceAmount);
  const paidSoFar = parseMoney(employee.paidAmountSoFar);
  const finalPayout = Math.max(0, grossTotal - advance);
  const advanceStillOwed = Math.max(0, advance - grossTotal);
  const remainingBalance = Math.max(0, finalPayout - paidSoFar);

  let suggestedStatus: EmployeeStatus = "Unpaid";
  if (advanceStillOwed > 0) suggestedStatus = "Advance Due";
  else if (remainingBalance <= 0 && finalPayout > 0) suggestedStatus = "Paid";
  else if (paidSoFar > 0 && remainingBalance > 0) suggestedStatus = "Partial";
  else if (finalPayout === 0 && paidSoFar === 0) suggestedStatus = "Paid";

  return {
    grossTotal,
    advance,
    paidSoFar,
    finalPayout,
    advanceStillOwed,
    remainingBalance,
    suggestedStatus,
  };
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[30px] border border-white/10 bg-[#13295b]/85 shadow-2xl shadow-black/20 backdrop-blur ${className}`}>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-sm font-semibold text-white/90">{children}</div>;
}

function Capsule({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "gold" | "green" | "red";
}) {
  const toneClass =
    tone === "gold"
      ? "border-amber-400/20 bg-amber-500/15 text-amber-300"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
      : tone === "red"
      ? "border-rose-400/20 bg-rose-500/15 text-rose-300"
      : "border-white/10 bg-white/5 text-white/85";

  return <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${toneClass}`}>{children}</div>;
}

export default function Page() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showEmployeeMenu, setShowEmployeeMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          employees: Employee[];
          selectedEmployeeId: string;
        };
        if (parsed?.employees?.length) {
          setEmployees(parsed.employees);
          setSelectedEmployeeId(parsed.selectedEmployeeId || parsed.employees[0].id);
          return;
        }
      }
    } catch {
      // ignore broken local storage
    }

    const seeded = seedEmployees();
    setEmployees(seeded);
    setSelectedEmployeeId(seeded[0].id);
  }, []);

  useEffect(() => {
    if (!employees.length) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ employees, selectedEmployeeId })
    );
  }, [employees, selectedEmployeeId]);

  const selectedEmployee = useMemo(() => {
    return employees.find((employee) => employee.id === selectedEmployeeId) || employees[0] || null;
  }, [employees, selectedEmployeeId]);

  const selectedTotals = useMemo(() => {
    return selectedEmployee ? getEmployeeTotals(selectedEmployee) : null;
  }, [selectedEmployee]);

  const totalRemaining = useMemo(() => {
    return employees.reduce((sum, employee) => sum + getEmployeeTotals(employee).remainingBalance, 0);
  }, [employees]);

  function updateEmployee(employeeId: string, patch: Partial<Employee>) {
    setEmployees((current) =>
      current.map((employee) => (employee.id === employeeId ? { ...employee, ...patch } : employee))
    );
  }

  function updateSelectedEmployee(patch: Partial<Employee>) {
    if (!selectedEmployee) return;
    updateEmployee(selectedEmployee.id, patch);
  }

  function updateDay(dayId: string, updater: (day: DayEntry) => DayEntry) {
    if (!selectedEmployee) return;
    setEmployees((current) =>
      current.map((employee) => {
        if (employee.id !== selectedEmployee.id) return employee;
        return {
          ...employee,
          days: employee.days.map((day) => (day.id === dayId ? updater(day) : day)),
        };
      })
    );
  }

  function updateJob(dayId: string, jobId: string, patch: Partial<JobEntry>) {
    updateDay(dayId, (day) => ({
      ...day,
      jobs: day.jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
    }));
  }

  function addJob(dayId: string) {
    updateDay(dayId, (day) => ({ ...day, collapsed: false, jobs: [...day.jobs, blankJob()] }));
  }

  function removeJob(dayId: string, jobId: string) {
    updateDay(dayId, (day) => {
      const nextJobs = day.jobs.filter((job) => job.id !== jobId);
      return { ...day, jobs: nextJobs.length ? nextJobs : [blankJob()] };
    });
  }

  function toggleDay(dayId: string) {
    updateDay(dayId, (day) => ({ ...day, collapsed: !day.collapsed }));
  }

  function addEmployee() {
    const name = window.prompt("Employee name")?.trim();
    if (!name) return;
    const employee = createEmployee(name);
    setEmployees((current) => [...current, employee]);
    setSelectedEmployeeId(employee.id);
    setShowAdminMenu(false);
    setShowEmployeeMenu(false);
  }

  function handleExport() {
    downloadJson(`1-stop-payroll-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      employees,
      selectedEmployeeId,
    });
    setShowAdminMenu(false);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "")) as {
          employees: Employee[];
          selectedEmployeeId?: string;
        };
        if (!parsed?.employees?.length) throw new Error("Invalid file");
        setEmployees(parsed.employees);
        setSelectedEmployeeId(parsed.selectedEmployeeId || parsed.employees[0].id);
        setShowAdminMenu(false);
        alert("Import completed.");
      } catch {
        alert("Import failed. Please choose a valid backup file.");
      }
    };
    reader.readAsText(file);
  }

  if (!selectedEmployee || !selectedTotals) {
    return <div className="min-h-screen bg-[#04112f] p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0c3a90_0%,_#07245e_28%,_#030d28_100%)] text-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleImportFile(file);
          event.currentTarget.value = "";
        }}
      />

      <div className="mx-auto w-full max-w-md px-4 pb-12 pt-4">
        <div className="mb-5 flex items-center justify-between">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold tracking-[0.22em] text-white/75">
            MOBILE PAYROLL
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMainMenu((value) => !value)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#081631]/90 shadow-xl"
              aria-label="Main menu"
            >
              {showMainMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {showMainMenu && (
              <div className="absolute right-0 top-16 z-50 w-56 rounded-3xl border border-white/10 bg-[#081631]/95 p-2 shadow-2xl backdrop-blur">
                <button
                  onClick={() => {
                    setShowMainMenu(false);
                    setShowAdminMenu((value) => !value);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white/90 hover:bg-white/5"
                >
                  <MoreHorizontal className="h-5 w-5" />
                  More actions
                </button>
                <button
                  onClick={() => {
                    setShowMainMenu(false);
                    updateSelectedEmployee({ weekLocked: !selectedEmployee.weekLocked });
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white/90 hover:bg-white/5"
                >
                  <CircleDollarSign className="h-5 w-5" />
                  {selectedEmployee.weekLocked ? "Unlock week" : "Lock week"}
                </button>
              </div>
            )}
          </div>
        </div>

        <Card className="mb-5 p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-300/80">Total Remaining</div>
          <div className="mt-3 text-5xl font-black tracking-tight text-amber-300">{formatMoney(totalRemaining)}</div>
        </Card>

        <Card className="relative mb-5 p-6">
          <div className="mb-5 flex items-start gap-4">
            <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-[2rem] font-extrabold leading-none text-white">Employee Control Center</h2>
              <p className="mt-2 text-base leading-6 text-white/70">Fast control built for mobile work days.</p>
            </div>
          </div>

          <Label>Select Employee</Label>
          <select
            value={selectedEmployeeId}
            onChange={(event) => {
              setSelectedEmployeeId(event.target.value);
              setShowEmployeeMenu(false);
              setShowAdminMenu(false);
            }}
            className="w-full rounded-[22px] border border-white/10 bg-[#071533] px-5 py-5 text-xl font-semibold text-white outline-none"
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <div className="mt-5 flex items-center justify-between gap-4">
            <button
              onClick={addEmployee}
              className="flex min-h-[72px] flex-1 items-center justify-center gap-3 rounded-[24px] bg-amber-500 px-5 py-5 text-xl font-bold text-[#111827] shadow-xl shadow-amber-500/20"
            >
              <Plus className="h-6 w-6" />
              Add Employee
            </button>

            <div className="relative">
              <button
                onClick={() => setShowAdminMenu((value) => !value)}
                className="flex min-h-[72px] min-w-[132px] items-center justify-center gap-2 rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-xl font-bold text-white"
              >
                <MoreHorizontal className="h-6 w-6" />
                More
              </button>

              {showAdminMenu && (
                <div className="absolute right-0 top-[84px] z-40 w-56 rounded-3xl border border-white/10 bg-[#081631]/95 p-2 shadow-2xl backdrop-blur">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white/90 hover:bg-white/5"
                  >
                    <FileUp className="h-5 w-5" />
                    Import Data
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white/90 hover:bg-white/5"
                  >
                    <Download className="h-5 w-5" />
                    Export Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="mb-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-[2.2rem] font-extrabold leading-none text-white">{selectedEmployee.name}</div>
              <p className="mt-2 text-base leading-6 text-white/70">Track jobs, pay, advances, and closeout.</p>
            </div>

            <div className="relative shrink-0">
              <button
                onClick={() => setShowEmployeeMenu((value) => !value)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
                aria-label="Employee details menu"
              >
                <MoreHorizontal className="h-6 w-6 text-white" />
              </button>

              {showEmployeeMenu && (
                <div className="absolute right-0 top-16 z-40 w-[295px] rounded-3xl border border-white/10 bg-[#081631]/95 p-4 shadow-2xl backdrop-blur">
                  <div className="space-y-4">
                    <div>
                      <Label>Employee Phone</Label>
                      <input
                        value={selectedEmployee.phone}
                        onChange={(event) => updateSelectedEmployee({ phone: event.target.value })}
                        placeholder="Employee phone"
                        className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none"
                      />
                    </div>

                    <div>
                      <Label>Default Rate</Label>
                      <input
                        value={selectedEmployee.defaultRate}
                        onChange={(event) => updateSelectedEmployee({ defaultRate: event.target.value })}
                        placeholder="Hourly or day rate"
                        className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none"
                      />
                    </div>

                    <div>
                      <Label>Employee Notes</Label>
                      <textarea
                        value={selectedEmployee.notes}
                        onChange={(event) => updateSelectedEmployee({ notes: event.target.value })}
                        placeholder="General employee notes"
                        rows={4}
                        className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="mb-5 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                <CalendarDays className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-[1.9rem] font-extrabold leading-none text-white">Employee Work Week</h3>
                <p className="mt-2 text-base leading-6 text-white/70">Main work area. Fast on mobile.</p>
              </div>
            </div>

            <Capsule tone={selectedEmployee.weekLocked ? "red" : "green"}>
              {selectedEmployee.weekLocked ? "Locked" : "Open"}
            </Capsule>
          </div>

          <div className="space-y-5">
            {selectedEmployee.days.map((day) => {
              const jobsCount = day.jobs.length;
              const dayTotal = day.jobs.reduce((sum, job) => sum + parseMoney(job.pay), 0);
              const previewJob = day.jobs.find((job) => job.property || job.workDone || job.pay);

              return (
                <div key={day.id} className="rounded-[28px] border border-white/10 bg-[#06132f]/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Capsule tone="gold">{day.dayLabel}</Capsule>
                      <Capsule>{day.date}</Capsule>
                      <Capsule>{jobsCount} Job{jobsCount === 1 ? "" : "s"}</Capsule>
                    </div>

                    <button
                      onClick={() => toggleDay(day.id)}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
                      aria-label={day.collapsed ? "Expand day" : "Collapse day"}
                    >
                      {day.collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </button>
                  </div>

                  {previewJob && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {previewJob.property ? <Capsule>{previewJob.property}</Capsule> : null}
                      {previewJob.workDone ? <Capsule>{previewJob.workDone}</Capsule> : null}
                      <Capsule tone="green">{formatMoney(dayTotal)}</Capsule>
                    </div>
                  )}

                  {!day.collapsed && (
                    <div className="mt-5 space-y-5">
                      {day.jobs.map((job, index) => (
                        <div key={job.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="text-lg font-bold text-white">Job {index + 1}</div>
                            {day.jobs.length > 1 && !selectedEmployee.weekLocked ? (
                              <button
                                onClick={() => removeJob(day.id, job.id)}
                                className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <Label>Property</Label>
                              <select
                                value={job.property}
                                disabled={selectedEmployee.weekLocked}
                                onChange={(event) => updateJob(day.id, job.id, { property: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none disabled:opacity-60"
                              >
                                <option value="">Select property</option>
                                {PROPERTY_OPTIONS.map((property) => (
                                  <option key={property} value={property}>
                                    {property}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <Label>Work Done</Label>
                              <select
                                value={job.workDone}
                                disabled={selectedEmployee.weekLocked}
                                onChange={(event) => updateJob(day.id, job.id, { workDone: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none disabled:opacity-60"
                              >
                                <option value="">Select work done</option>
                                {WORK_OPTIONS.map((work) => (
                                  <option key={work} value={work}>
                                    {work}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <Label>Pay</Label>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                value={job.pay || ""}
                                disabled={selectedEmployee.weekLocked}
                                onChange={(event) => updateJob(day.id, job.id, { pay: parseMoney(event.target.value) })}
                                placeholder="0.00"
                                className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none disabled:opacity-60"
                              />
                            </div>

                            <div>
                              <Label>Notes</Label>
                              <textarea
                                value={job.notes || ""}
                                disabled={selectedEmployee.weekLocked}
                                onChange={(event) => updateJob(day.id, job.id, { notes: event.target.value })}
                                placeholder="Optional job notes"
                                rows={3}
                                className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none disabled:opacity-60"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {!selectedEmployee.weekLocked ? (
                        <button
                          onClick={() => addJob(day.id)}
                          className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-lg font-bold text-white"
                        >
                          <Plus className="h-5 w-5" />
                          Add Job For {day.dayLabel}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="mb-5 p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-[1.9rem] font-extrabold leading-none text-white">Weekly Summary</h3>
              <p className="mt-2 text-base leading-6 text-white/70">Payout, advances, and status.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Advance Amount</Label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={selectedEmployee.advanceAmount || ""}
                onChange={(event) => updateSelectedEmployee({ advanceAmount: parseMoney(event.target.value) })}
                placeholder="0.00"
                className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none"
              />
            </div>

            <div>
              <Label>Paid Amount So Far</Label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={selectedEmployee.paidAmountSoFar || ""}
                onChange={(event) => updateSelectedEmployee({ paidAmountSoFar: parseMoney(event.target.value) })}
                placeholder="0.00"
                className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none"
              />
            </div>

            <div>
              <Label>Reason For Advance</Label>
              <input
                value={selectedEmployee.advanceReason}
                onChange={(event) => updateSelectedEmployee({ advanceReason: event.target.value })}
                placeholder="Why was the advance given?"
                className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg text-white outline-none"
              />
            </div>

            <div>
              <Label>Status</Label>
              <select
                value={selectedEmployee.manualStatus}
                onChange={(event) => updateSelectedEmployee({ manualStatus: event.target.value as EmployeeStatus })}
                className="w-full rounded-2xl border border-white/10 bg-[#071533] px-4 py-4 text-lg font-semibold text-white outline-none"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
                <option value="Advance Due">Advance Due</option>
              </select>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Gross Total</div>
              <div className="mt-2 text-2xl font-extrabold text-white">{formatMoney(selectedTotals.grossTotal)}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Advance</div>
              <div className="mt-2 text-2xl font-extrabold text-rose-300">{formatMoney(selectedTotals.advance)}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Final Payout</div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-300">{formatMoney(selectedTotals.finalPayout)}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Paid So Far</div>
              <div className="mt-2 text-2xl font-extrabold text-white">{formatMoney(selectedTotals.paidSoFar)}</div>
            </div>

            <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-amber-200/80">Remaining Balance</div>
              <div className="mt-2 text-3xl font-black text-amber-300">{formatMoney(selectedTotals.remainingBalance)}</div>
            </div>

            <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-rose-200/80">Advance Still Owed</div>
              <div className="mt-2 text-3xl font-black text-rose-300">{formatMoney(selectedTotals.advanceStillOwed)}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Suggested Status</div>
              <div className="mt-2">
                <Capsule tone={selectedTotals.suggestedStatus === "Advance Due" ? "red" : selectedTotals.suggestedStatus === "Paid" ? "green" : selectedTotals.suggestedStatus === "Partial" ? "gold" : "default"}>
                  {selectedTotals.suggestedStatus}
                </Capsule>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Manual Status</div>
              <div className="mt-2">
                <Capsule tone={selectedEmployee.manualStatus === "Advance Due" ? "red" : selectedEmployee.manualStatus === "Paid" ? "green" : selectedEmployee.manualStatus === "Partial" ? "gold" : "default"}>
                  {selectedEmployee.manualStatus}
                </Capsule>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
              <StickyNote className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-[1.9rem] font-extrabold leading-none text-white">Executive Snapshot</h3>
              <p className="mt-2 text-base leading-6 text-white/70">Quick read of the selected employee.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Selected Employee</div>
              <div className="mt-2 text-2xl font-extrabold text-white">{selectedEmployee.name}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Employee Phone</div>
              <div className="mt-2 text-2xl font-extrabold text-white">{selectedEmployee.phone || "Not added"}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Default Rate</div>
              <div className="mt-2 text-2xl font-extrabold text-white">{selectedEmployee.defaultRate || "Not added"}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Advance Reason</div>
              <div className="mt-2 text-xl font-bold leading-8 text-white">{selectedEmployee.advanceReason || "Not added"}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm uppercase tracking-[0.28em] text-white/50">Employee Notes</div>
              <div className="mt-2 text-xl font-bold leading-8 text-white">{selectedEmployee.notes || "Not added"}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
