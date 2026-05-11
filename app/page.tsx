"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  UserPlus,
  BriefcaseBusiness,
  Building2,
  Wallet,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Camera,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  FileText,
  X,
  Check,
  RotateCcw,
  Lock,
  Home,
  Users,
  ClipboardList,
  CircleDollarSign,
  ArrowDown,
  CreditCard,
  Minus,
  Filter,
} from "lucide-react";

// 1 STOP TURNOVER SPECIALIST PRO ELITE - BLACK GOLD X
// Single-file replacement for app/page.tsx
// Mobile-first payroll / job tracking app

const STORAGE_KEY = "oneStopPayrollProEliteBlackGoldX_v1";

const appShellClass =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,#02070a_0%,#030303_45%,#050505_100%)] text-zinc-100 selection:bg-green-400 selection:text-black";

const statStyles = {
  earned: "from-emerald-500 to-green-600 text-white shadow-[0_0_24px_rgba(34,197,94,0.28)]",
  paid: "from-blue-400 to-blue-600 text-white shadow-[0_0_24px_rgba(59,130,246,0.28)]",
  borrowed: "from-violet-400 to-purple-600 text-white shadow-[0_0_24px_rgba(168,85,247,0.28)]",
  owed: "from-amber-400 to-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,0.28)]",
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const todayISO = () => new Date().toISOString().slice(0, 10);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type Employee = {
  id: string;
  name: string;
  phone: string;
  defaultRate: number;
  notes: string;
  borrowed?: number;
  borrowedByWeek?: Record<string, number>;
  active: boolean;
};

type JobEntry = {
  id: string;
  employeeId: string;
  date: string;
  property: string;
  unitNumber?: string;
  jobTypes: string[];
  customWork: string;
  pay: number;
  paidAmount: number;
  status: "unpaid" | "partial" | "paid";
  notes: string;
  photos: string[];
};

type AppState = {
  employees: Employee[];
  jobs: JobEntry[];
  properties: string[];
  jobTypeOptions: string[];
  companyName: string;
};

type ActiveTab = "dashboard" | "employees" | "jobs" | "properties" | "reports" | "more";

const defaultProperties = [
  "Charles Place Apartments",
  "Copley Chambers",
  "206 Broad St",
  "220 Broad St",
  "228 Broad St",
  "Riverstone Apartments",
  "Tanglewood Village Apartments",
  "Valley Apartments",
  "Waterview Apartments",
  "Wingate Property",
];

const defaultJobTypes = [
  "Full Unit Painting",
  "Repair Damage Walls",
  "Trash Removal",
  "Repair Damage Walls Due To Water Leak",
  "Occupied Unit",
  "Sheetrock Installation",
  "Sanding",
  "Priming",
  "Finish Painting",
  "Carpentry Repair",
  "Touch Ups",
];

const starterState: AppState = {
  companyName: "1 Stop Turnover Specialist LLC",
  employees: [
    {
      id: uid(),
      name: "Employee 1",
      phone: "",
      defaultRate: 0,
      notes: "",
      borrowed: 0,
      active: true,
    },
  ],
  jobs: [],
  properties: defaultProperties,
  jobTypeOptions: defaultJobTypes,
};

function safeNumber(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}



function getBorrowedForWeek(employee: Employee, weekStart: string): number {
  return safeNumber(employee.borrowedByWeek?.[weekStart] ?? 0);
}

function setBorrowedForWeek(employee: Employee, weekStart: string, amount: number): Employee {
  return {
    ...employee,
    borrowedByWeek: {
      ...(employee.borrowedByWeek || {}),
      [weekStart]: safeNumber(amount),
    },
  };
}

function propertyWithUnit(job: Pick<JobEntry, "property" | "unitNumber">) {
  const unit = (job.unitNumber || "").trim();
  return unit ? `${job.property} — Unit ${unit}` : job.property;
}

function getWeekRange(dateISO: string) {
  const d = new Date(`${dateISO}T12:00:00`);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return {
    start: monday.toISOString().slice(0, 10),
    end: saturday.toISOString().slice(0, 10),
  };
}


function addDaysISO(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekDisplay(startISO: string, endISO: string) {
  const start = new Date(`${startISO}T12:00:00`);
  const end = new Date(`${endISO}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth();
  const startText = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start);
  const endText = new Intl.DateTimeFormat("en-US", sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(end);
  return `${startText} – ${endText}`;
}

function isWithinRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function formatJobDate(dateISO: string) {
  if (!dateISO) return "No date";
  const date = new Date(`${dateISO}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function statusFrom(pay: number, paidAmount: number): JobEntry["status"] {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= pay) return "paid";
  return "partial";
}

function readPhotoFiles(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) return Promise.resolve([]);
  const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
  return Promise.all(
    fileArray.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

export default function PayrollProEliteBlackGoldX() {
  const [state, setState] = useState<AppState>(starterState);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedWeek, setSelectedWeek] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "employee" | "job" | "property"; id: string } | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const week = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        setState({
          companyName: parsed.companyName || starterState.companyName,
          employees: Array.isArray(parsed.employees)
            ? parsed.employees.map((employee) => ({ ...employee, borrowed: safeNumber(employee.borrowed || 0), borrowedByWeek: employee.borrowedByWeek || {} }))
            : starterState.employees,
          jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
          properties: Array.isArray(parsed.properties) ? parsed.properties : defaultProperties,
          jobTypeOptions: Array.isArray(parsed.jobTypeOptions) ? parsed.jobTypeOptions : defaultJobTypes,
        });
      }
    } catch (error) {
      console.error("Load failed", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const employeesById = useMemo(() => {
    const map = new Map<string, Employee>();
    state.employees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [state.employees]);

  const weekJobs = useMemo(
    () => state.jobs.filter((job) => isWithinRange(job.date, week.start, week.end)),
    [state.jobs, week.start, week.end]
  );

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.employees;
    return state.employees.filter((employee) => employee.name.toLowerCase().includes(q) || employee.phone.includes(q));
  }, [state.employees, search]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const jobsToShow = activeTab === "jobs" ? state.jobs : weekJobs;
    return jobsToShow
      .filter((job) => {
        if (!q) return true;
        const employeeName = employeesById.get(job.employeeId)?.name || "";
        return [employeeName, job.property, job.customWork, job.notes, job.jobTypes.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activeTab, state.jobs, weekJobs, search, employeesById]);

  const totals = useMemo(() => {
    const earned = weekJobs.reduce((sum, job) => sum + safeNumber(job.pay), 0);
    const paid = weekJobs.reduce((sum, job) => sum + safeNumber(job.paidAmount), 0);
    const borrowed = state.employees.reduce((sum, employee) => sum + getBorrowedForWeek(employee, week.start), 0);
    const owed = Math.max(earned - paid - borrowed, 0);
    const jobsToday = state.jobs.filter((job) => job.date === todayISO()).length;
    return { earned, paid, borrowed, owed, jobsToday };
  }, [weekJobs, state.jobs, state.employees, week.start]);

  const employeeTotals = useMemo(() => {
    return state.employees.map((employee) => {
      const jobs = weekJobs.filter((job) => job.employeeId === employee.id);
      const earned = jobs.reduce((sum, job) => sum + job.pay, 0);
      const paid = jobs.reduce((sum, job) => sum + job.paidAmount, 0);
      const borrowed = getBorrowedForWeek(employee, week.start);
      const owed = Math.max(earned - paid - borrowed, 0);
      return { employee, jobs, earned, paid, borrowed, owed };
    });
  }, [state.employees, weekJobs, week.start]);

  function upsertEmployee(employee: Employee) {
    setState((prev) => {
      const exists = prev.employees.some((item) => item.id === employee.id);
      return {
        ...prev,
        employees: exists
          ? prev.employees.map((item) => (item.id === employee.id ? employee : item))
          : [...prev.employees, employee],
      };
    });
  }

  function addJob(job: JobEntry) {
    setState((prev) => ({ ...prev, jobs: [job, ...prev.jobs] }));
  }

  function updateJob(job: JobEntry) {
    setState((prev) => ({
      ...prev,
      jobs: prev.jobs.map((item) => (item.id === job.id ? job : item)),
    }));
  }

  function deleteConfirmed() {
    if (!confirmDelete) return;
    setState((prev) => {
      if (confirmDelete.type === "employee") {
        return {
          ...prev,
          employees: prev.employees.filter((employee) => employee.id !== confirmDelete.id),
          jobs: prev.jobs.filter((job) => job.employeeId !== confirmDelete.id),
        };
      }
      if (confirmDelete.type === "job") {
        return { ...prev, jobs: prev.jobs.filter((job) => job.id !== confirmDelete.id) };
      }
      return { ...prev, properties: prev.properties.filter((property) => property !== confirmDelete.id) };
    });
    setConfirmDelete(null);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `1-stop-payroll-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!Array.isArray(parsed.employees) || !Array.isArray(parsed.jobs)) {
          alert("This backup file does not look valid.");
          return;
        }
        setState({
          companyName: parsed.companyName || starterState.companyName,
          employees: parsed.employees.map((employee) => ({ ...employee, borrowed: safeNumber(employee.borrowed || 0), borrowedByWeek: employee.borrowedByWeek || {} })),
          jobs: parsed.jobs,
          properties: Array.isArray(parsed.properties) ? parsed.properties : defaultProperties,
          jobTypeOptions: Array.isArray(parsed.jobTypeOptions) ? parsed.jobTypeOptions : defaultJobTypes,
        });
      } catch {
        alert("Could not import this file.");
      }
    };
    reader.readAsText(file);
  }

  function closeWeekAsPaid() {
    setState((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) => {
        if (!isWithinRange(job.date, week.start, week.end)) return job;
        return { ...job, paidAmount: job.pay, status: "paid" };
      }),
    }));
  }

  return (
    <div className={appShellClass}>
      <div className="mx-auto max-w-[520px] px-4 pb-28 pt-3">
        <AppMobileHeader companyName={state.companyName} activeTab={activeTab} setActiveTab={setActiveTab} />

        <WeekHero
          week={week}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
        />

        <button
          onClick={() => setShowJobForm(true)}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.15rem] border border-green-300/20 bg-gradient-to-r from-green-500 to-green-600 px-5 py-4 text-xl font-black text-white shadow-[0_20px_45px_rgba(34,197,94,0.24)] transition active:scale-[.99]"
        >
          <Plus size={30} /> Add Job
        </button>
        <p className="mt-3 text-center text-xs font-semibold text-zinc-500">Quickly add a new job, property, or unit.</p>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wide text-zinc-300">Week Summary</h2>
          <p className="px-1 text-xs font-black text-green-400">✣ Clean Week</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Week Earned" value={money(totals.earned)} description="Total Earned This Week" icon={<CircleDollarSign size={20} />} variant="earned" />
          <StatCard label="Paid Out" value={money(totals.paid)} description="Total Paid This Week" icon={<ArrowDown size={20} />} variant="paid" />
          <StatCard label="Borrowed" value={money(totals.borrowed || 0)} description="Total Borrowed This Week" icon={<CreditCard size={20} />} variant="borrowed" />
          <StatCard label="Still Owed" value={money(totals.owed)} description="What’s Left to Pay" icon={<Minus size={20} />} variant="owed" />
        </div>

        <div className="sticky top-[68px] z-20 -mx-4 mt-5 border-y border-white/10 bg-[#02070a]/90 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee, property, job..."
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-3 text-sm outline-none ring-amber-400/40 placeholder:text-zinc-500 focus:border-green-400/60 focus:ring-4"
              />
            </div>

          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Work week: <span className="text-green-400">{week.start}</span> to <span className="text-green-400">{week.end}</span>
          </p>
        </div>

        <main className="mt-5">
          {activeTab === "dashboard" && (
            <Dashboard
              employeeTotals={employeeTotals}
              filteredJobs={filteredJobs}
              employeesById={employeesById}
              onAddJob={() => setShowJobForm(true)}
              onGoEmployees={() => setActiveTab("employees")}
              onGoReports={() => setActiveTab("reports")}
            />
          )}

          {activeTab === "employees" && (
            <section className="space-y-4">
              <SectionTop title="Employees" subtitle="Manage worker details, weekly totals, and balances.">
                <button onClick={() => setShowEmployeeForm(true)} className="goldButton">
                  <UserPlus size={18} /> Add Employee
                </button>
              </SectionTop>

              <div className="grid gap-3 lg:grid-cols-2">
                {filteredEmployees.map((employee) => {
                  const row = employeeTotals.find((item) => item.employee.id === employee.id);
                  return (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      totals={row}
                      expanded={expandedEmployeeId === employee.id}
                      onToggle={() => setExpandedEmployeeId(expandedEmployeeId === employee.id ? null : employee.id)}
                      onDelete={() => setConfirmDelete({ type: "employee", id: employee.id })}
                      onSave={upsertEmployee}
                      weekStart={week.start}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "jobs" && (
            <section className="space-y-4">
              <SectionTop title="Jobs" subtitle="All job entries for the selected work week.">
                <button onClick={() => setShowJobForm(true)} className="goldButton">
                  <Plus size={18} /> Add Job
                </button>
              </SectionTop>
              <JobList
                jobs={filteredJobs}
                employees={state.employees}
                employeesById={employeesById}
                onDelete={(id) => setConfirmDelete({ type: "job", id })}
                onUpdate={updateJob}
              />
            </section>
          )}

          {activeTab === "properties" && (
            <section className="space-y-4">
              <SectionTop title="Properties" subtitle="Your saved property dropdown list.">
                <button onClick={() => setShowPropertyForm(true)} className="goldButton">
                  <Building2 size={18} /> Add Property
                </button>
              </SectionTop>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {state.properties.map((property) => (
                  <div key={property} className="blackCard flex items-center justify-between p-4">
                    <div>
                      <p className="font-bold">{property}</p>
                      <p className="text-xs text-zinc-500">Saved property</p>
                    </div>
                    <button onClick={() => setConfirmDelete({ type: "property", id: property })} className="iconDanger">
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "reports" && (
            <Reports
              totals={totals}
              employeeTotals={employeeTotals}
              jobs={filteredJobs}
              employeesById={employeesById}
              onCloseWeek={closeWeekAsPaid}
              onExport={exportData}
            />
          )}

          {activeTab === "more" && (
            <MorePanel
              onExport={exportData}
              onImport={() => importRef.current?.click()}
              onReset={() => {
                if (confirm("Reset app data? This cannot be undone unless you exported a backup.")) setState(starterState);
              }}
            />
          )}
        </main>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importData(file);
          e.currentTarget.value = "";
        }}
      />

      {showEmployeeForm && (
        <EmployeeModal
          onClose={() => setShowEmployeeForm(false)}
          onSave={(employee) => {
            upsertEmployee(employee);
            setShowEmployeeForm(false);
          }}
        />
      )}

      {showJobForm && (
        <JobModal
          employees={state.employees}
          properties={state.properties}
          jobTypeOptions={state.jobTypeOptions}
          onAddProperty={(newProperty) => {
            const cleanProperty = newProperty.trim();
            if (!cleanProperty) return;
            setState((prev) => ({
              ...prev,
              properties: [...new Set([...prev.properties, cleanProperty])],
            }));
          }}
          onClose={() => setShowJobForm(false)}
          onSave={(job) => {
            addJob(job);
            setShowJobForm(false);
          }}
        />
      )}

      {showPropertyForm && (
        <PropertyModal
          onClose={() => setShowPropertyForm(false)}
          onSave={(property) => {
            setState((prev) => ({
              ...prev,
              properties: [...new Set([...prev.properties, property.trim()])].filter(Boolean),
            }));
            setShowPropertyForm(false);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Safety Delete"
          message="This delete is protected so nothing is removed by accident. Are you sure?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={deleteConfirmed}
        />
      )}

      <style jsx global>{`
        html, body {
          background: #02070a;
        }

        .blackCard {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.13);
          background:
            radial-gradient(circle at 0% 0%, rgba(34,197,94,0.055), transparent 35%),
            linear-gradient(145deg, rgba(22, 31, 38, 0.92), rgba(7, 11, 14, 0.98));
          border-radius: 0.95rem;
          box-shadow:
            0 18px 45px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255,255,255,0.045);
        }

        .blackCard::before {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255,255,255,0.045), transparent 40%);
          opacity: .55;
        }

        .goldButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 0.95rem;
          border: 1px solid rgba(74, 222, 128, 0.25);
          background: linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
          color: #ffffff;
          font-weight: 950;
          padding: 0.72rem 1rem;
          box-shadow: 0 14px 34px rgba(34, 197, 94, 0.22), inset 0 1px 0 rgba(255,255,255,0.20);
          transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
        }

        .goldButton:hover {
          filter: brightness(1.05);
          box-shadow: 0 18px 42px rgba(34, 197, 94, 0.28), inset 0 1px 0 rgba(255,255,255,0.25);
        }

        .goldButton:active {
          transform: scale(.98);
        }

        .darkButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border-radius: 0.95rem;
          border: 1px solid rgba(148,163,184,0.13);
          background: linear-gradient(180deg, rgba(25,33,39,0.94), rgba(7,10,12,0.96));
          color: #f4f4f5;
          font-weight: 850;
          padding: 0.68rem 0.95rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .iconDanger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.9rem;
          border: 1px solid rgba(239, 68, 68, 0.25);
          background: linear-gradient(180deg, rgba(127, 29, 29, 0.20), rgba(20, 5, 5, 0.35));
          color: #fca5a5;
          padding: 0.6rem;
        }

        .inputElite {
          width: 100%;
          border-radius: 0.95rem;
          border: 1px solid rgba(148,163,184,0.14);
          background: rgba(3, 8, 10, 0.92);
          color: #fafafa;
          outline: none;
          padding: 0.82rem 0.9rem;
          font-size: 0.92rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
        }

        .inputElite::placeholder {
          color: rgba(161,161,170,.62);
        }

        .inputElite:focus {
          border-color: rgba(34,197,94,.58);
          box-shadow: 0 0 0 4px rgba(34,197,94,.12), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .labelElite {
          color: #a1a1aa;
          font-size: .75rem;
          font-weight: 900;
          margin-bottom: .38rem;
          display:block;
          letter-spacing: .02em;
        }

        .premiumDivider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34,197,94,.25), transparent);
        }

        button, input, select, textarea {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
}

function AppMobileHeader({
  companyName,
  activeTab,
  setActiveTab,
}: {
  companyName: string;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems: { tab: ActiveTab; label: string; subtitle: string; icon: React.ReactNode }[] = [
    { tab: "dashboard", label: "Home", subtitle: "Week summary and command center", icon: <Home size={20} /> },
    { tab: "employees", label: "Workers", subtitle: "Employees, borrowed money, balances", icon: <Users size={20} /> },
    { tab: "jobs", label: "Jobs", subtitle: "Saved jobs, notes, photos, pay", icon: <BriefcaseBusiness size={20} /> },
    { tab: "properties", label: "Properties", subtitle: "Property dropdown list", icon: <Building2 size={20} /> },
    { tab: "reports", label: "Reports", subtitle: "Payroll report and closeout", icon: <ClipboardList size={20} /> },
    { tab: "more", label: "More", subtitle: "Backup, restore, and controls", icon: <MoreVertical size={20} /> },
  ];

  function goTo(tab: ActiveTab) {
    setActiveTab(tab);
    setMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-[#02070a]/92 px-4 pb-3 pt-3 shadow-[0_12px_35px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-100 shadow-lg transition active:scale-95"
            >
              <span className="text-2xl leading-none">☰</span>
            </button>

            <img
              src="/icon-192.png"
              alt="1 Stop Turnover Specialist logo"
              className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-black object-cover shadow-[0_0_24px_rgba(34,197,94,0.18)]"
            />

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black leading-tight">1 Stop Payroll Pro</h1>
              <p className="truncate text-xs font-semibold text-zinc-400">Weekly Reset & Tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-zinc-100">
            <button
              type="button"
              aria-label="Go to reports"
              onClick={() => goTo("reports")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition active:scale-95"
            >
              <CalendarDays size={21} />
            </button>
            <button
              type="button"
              aria-label="Open more controls"
              onClick={() => goTo("more")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition active:scale-95"
            >
              <MoreVertical size={21} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <aside
            className="h-full w-[86%] max-w-[360px] overflow-y-auto border-r border-white/10 bg-[#050607] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <img
                  src="/icon-192.png"
                  alt="1 Stop Turnover Specialist logo"
                  className="mb-3 h-16 w-16 rounded-2xl border border-white/10 bg-black object-cover shadow-[0_0_28px_rgba(34,197,94,0.20)]"
                />
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-400">Navigation</p>
                <h2 className="mt-1 text-xl font-black">1 Stop Payroll Pro</h2>
                <p className="mt-1 text-xs font-semibold text-zinc-500">{companyName}</p>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {menuItems.map((item) => {
                const active = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => goTo(item.tab)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[.99] ${
                      active
                        ? "border-green-400/35 bg-green-500 text-black shadow-[0_12px_30px_rgba(34,197,94,0.22)]"
                        : "border-white/10 bg-white/[0.035] text-zinc-100 hover:border-green-400/25"
                    }`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      active ? "bg-black/10 text-black" : "border border-white/10 bg-green-500/10 text-green-400"
                    }`}>
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-black">{item.label}</span>
                      <span className={`mt-0.5 block text-xs font-semibold ${active ? "text-black/70" : "text-zinc-500"}`}>
                        {item.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>


          </aside>
        </div>
      )}
    </>
  );
}

function WeekHero({
  week,
  selectedWeek,
  setSelectedWeek,
}: {
  week: { start: string; end: string };
  selectedWeek: string;
  setSelectedWeek: (value: string) => void;
}) {
  return (
    <section className="mt-4 border-b border-white/10 pb-4">
      <div className="flex items-center justify-between gap-3">
        <button
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
          onClick={() => setSelectedWeek(addDaysISO(selectedWeek, -7))}
        >
          <ChevronDown className="rotate-90" size={24} />
        </button>
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center">
          <CalendarDays size={22} />
          <span className="text-lg font-black">{weekDisplay(week.start, week.end)}</span>
          <input
            type="date"
            value={selectedWeek}
            onClick={(e) => e.currentTarget.showPicker?.()}
            onFocus={(e) => e.currentTarget.showPicker?.()}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="sr-only"
          />
        </label>
        <button
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
          onClick={() => setSelectedWeek(addDaysISO(selectedWeek, 7))}
        >
          <ChevronDown className="-rotate-90" size={24} />
        </button>
      </div>
    </section>
  );
}

function Header({ companyName, totals }: { companyName: string; totals: { earned: number; owed: number } }) {
  return (
    <header className="blackCard overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-400">Black Gold X</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">{companyName}</h1>
          <p className="mt-1 text-sm font-semibold text-zinc-400">PRO ELITE Payroll + Field Operations</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-green-500/10 px-3 py-2 text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Owed</p>
          <p className="text-xl font-black text-green-300">{money(totals.owed)}</p>
        </div>
      </div>
      <div className="mt-5 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      <p className="mt-4 text-sm text-zinc-400">
        Fast job entries, clean worker totals, automatic new-week totals, safer delete controls, and backup-ready data.
      </p>
    </header>
  );
}

function StatCard({
  label,
  value,
  icon,
  description,
  variant = "earned",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  variant?: "earned" | "paid" | "borrowed" | "owed";
}) {
  const colorClass = statStyles[variant];
  const labelColor =
    variant === "earned"
      ? "text-green-400"
      : variant === "paid"
        ? "text-blue-400"
        : variant === "borrowed"
          ? "text-purple-400"
          : "text-orange-400";

  return (
    <div className="blackCard min-h-[118px] p-4">
      <div className="relative z-10 flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colorClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${labelColor}`}>{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-50">{value}</p>
          {description && <p className="mt-1 text-xs font-semibold text-zinc-500">{description}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionTop({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Dashboard({
  employeeTotals,
  filteredJobs,
  employeesById,
  onAddJob,
  onGoEmployees,
  onGoReports,
}: {
  employeeTotals: { employee: Employee; jobs: JobEntry[]; earned: number; paid: number; borrowed: number; owed: number }[];
  filteredJobs: JobEntry[];
  employeesById: Map<string, Employee>;
  onAddJob: () => void;
  onGoEmployees: () => void;
  onGoReports: () => void;
}) {
  const topOwed = [...employeeTotals].sort((a, b) => b.owed - a.owed).slice(0, 4);
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <div className="space-y-4">
        <SectionTop title="Command Center" subtitle="Your week at a glance.">
          <button onClick={onAddJob} className="goldButton"><Plus size={18} /> Quick Add</button>
        </SectionTop>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={onGoEmployees} className="blackCard p-5 text-left transition active:scale-[.99]">
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-green-500/10 text-green-400">
              <UserPlus />
            </div>
            <p className="relative z-10 mt-3 text-xl font-black">Employees</p>
            <p className="relative z-10 text-sm text-zinc-500">Open worker cards and balances.</p>
          </button>
          <button onClick={onGoReports} className="blackCard p-5 text-left transition active:scale-[.99]">
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-green-500/10 text-green-400">
              <FileText />
            </div>
            <p className="relative z-10 mt-3 text-xl font-black">Reports</p>
            <p className="relative z-10 text-sm text-zinc-500">Weekly totals and export backup.</p>
          </button>
        </div>
        <div className="blackCard p-4">
          <h3 className="font-black">Balances by Employee</h3>
          <div className="mt-3 space-y-3">
            {topOwed.map(({ employee, earned, paid, owed }) => (
              <div key={employee.id} className="rounded-2xl border border-zinc-800 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{employee.name}</p>
                  <p className="font-black text-green-400">{money(owed)}</p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-zinc-400">
                  <span>Earned: {money(earned)}</span>
                  <span>Paid: {money(paid)}</span>
                  <span>Borrowed: {money(employee.borrowed || 0)}</span>
                </div>
              </div>
            ))}
            {topOwed.length === 0 && <EmptyText text="No employee payroll yet this week." />}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-300">Jobs This Week</h3>
          <button className="darkButton !px-3 !py-2 text-xs"><Filter size={14} /> Filter</button>
        </div>
        <div className="blackCard divide-y divide-white/10 overflow-hidden">
          {filteredJobs.slice(0, 7).map((job) => (
            <JobMini key={job.id} job={job} employee={employeesById.get(job.employeeId)} />
          ))}
          {filteredJobs.length === 0 && <EmptyText text="No jobs found for this week." />}
        </div>
      </div>
    </section>
  );
}

function JobMini({ job, employee }: { job: JobEntry; employee?: Employee }) {
  return (
    <div className="relative z-10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.8)]" />
            <p className="truncate font-black">{propertyWithUnit(job)}</p>
          </div>
          <p className="ml-4 text-xs text-zinc-500">{employee?.name || "Unknown Employee"} • {formatJobDate(job.date)}</p>
          <div className="ml-4 mt-1 flex flex-wrap gap-1">
            {job.jobTypes.slice(0, 2).map((type) => (
              <span key={type} className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{type}</span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-black text-green-400">{money(job.pay)}</p>
          <p className="text-xs text-zinc-500">Unit: {job.unitNumber || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function EmployeeCard({
  employee,
  totals,
  expanded,
  onToggle,
  onDelete,
  onSave,
  weekStart,
}: {
  employee: Employee;
  totals?: { jobs: JobEntry[]; earned: number; paid: number; borrowed: number; owed: number };
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSave: (employee: Employee) => void;
  weekStart: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(employee);

  useEffect(() => setDraft(employee), [employee]);

  const currentBorrowed = getBorrowedForWeek(employee, weekStart);

  return (
    <div className="blackCard p-4">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onToggle} className="flex flex-1 items-start gap-3 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-green-500/10 font-black text-green-400">
            {employee.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-black">{employee.name}</p>
            <p className="text-xs text-zinc-500">{employee.phone || "No phone saved"}</p>
          </div>
        </button>
        <button onClick={onToggle} className="rounded-xl border border-zinc-800 p-2 text-zinc-400">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <BalancePill label="Earned" value={money(totals?.earned || 0)} />
        <BalancePill label="Paid" value={money(totals?.paid || 0)} />
        <BalancePill label="Borrowed" value={money(currentBorrowed)} />
        <BalancePill label="Owed" value={money(totals?.owed || 0)} gold />
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
          {editing ? (
            <div className="space-y-3">
              <Field label="Name"><input className="inputElite" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Phone"><input className="inputElite" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
              <Field label="Default Rate"><MoneyInput value={draft.defaultRate} onValueChange={(value) => setDraft({ ...draft, defaultRate: value })} /></Field>
              <Field label="Notes"><textarea className="inputElite min-h-20" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
              <Field label="Borrowed Advance"><MoneyInput value={getBorrowedForWeek(draft, weekStart)} onValueChange={(value) => setDraft(setBorrowedForWeek(draft, weekStart, value))} /></Field>
              <div className="flex gap-2">
                <button className="goldButton flex-1" onClick={() => { onSave(draft); setEditing(false); }}><Check size={18} /> Save</button>
                <button className="darkButton" onClick={() => setEditing(false)}><X size={18} /></button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-400">{employee.notes || "No employee notes saved."}</p>
              <Field label="Borrowed Advance">
                <MoneyInput
                  value={currentBorrowed}
                  onValueChange={(value) => onSave(setBorrowedForWeek(employee, weekStart, value))}
                  placeholder="0.00"
                />
              </Field>
              <p className="text-xs font-semibold text-zinc-500">Cash advance borrowed before payday. It subtracts from the final owed amount.</p>
              <div className="flex gap-2">
                <button className="darkButton flex-1" onClick={() => setEditing(true)}><MoreVertical size={18} /> Extra Info</button>
                <button className="iconDanger" onClick={onDelete}><Trash2 size={18} /></button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BalancePill({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className={`rounded-2xl border p-2 ${gold ? "border-green-400/25 bg-green-500/10" : "border-zinc-800 bg-black/30"}`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`text-sm font-black ${gold ? "text-green-400" : "text-zinc-100"}`}>{value}</p>
    </div>
  );
}

function JobList({ jobs, employees, employeesById, onDelete, onUpdate }: { jobs: JobEntry[]; employees: Employee[]; employeesById: Map<string, Employee>; onDelete: (id: string) => void; onUpdate: (job: JobEntry) => void }) {
  return (
    <div className="space-y-3">
      {jobs.map((job) => <JobRow key={job.id} job={job} employees={employees} employee={employeesById.get(job.employeeId)} onDelete={() => onDelete(job.id)} onUpdate={onUpdate} />)}
      {jobs.length === 0 && <div className="blackCard p-6"><EmptyText text="No jobs found for this selected week." /></div>}
    </div>
  );
}

function JobRow({ job, employees, employee, onDelete, onUpdate }: { job: JobEntry; employees: Employee[]; employee?: Employee; onDelete: () => void; onUpdate: (job: JobEntry) => void }) {
  const [open, setOpen] = useState(false);
  const owed = Math.max(job.pay - job.paidAmount, 0);
  return (
    <div className="blackCard p-4">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-black">{employee?.name || "Unknown Employee"}</p>
            <p className="text-xs text-zinc-500">{formatJobDate(job.date)} • {propertyWithUnit(job)}</p>
          </div>
          <div className="text-right">
            <p className="font-black text-green-400">{money(job.pay)}</p>
            <p className="text-xs text-zinc-500">Owed {money(owed)}</p>
          </div>
        </div>
        <p className="mt-3 rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">
          {[...job.jobTypes, job.customWork].filter(Boolean).join(" • ") || "No work detail"}
        </p>
        {job.photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {job.photos.slice(0, 4).map((photo, index) => (
              <img key={`${job.id}-thumb-${index}`} src={photo} alt={`Job photo ${index + 1}`} className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
            ))}
            {job.photos.length > 4 && <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-black/40 text-xs font-black text-zinc-400">+{job.photos.length - 4}</div>}
          </div>
        )}
      </button>
      {open && (
        <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Change Employee / Worker">
              <select
                className="inputElite"
                value={job.employeeId}
                onChange={(e) => {
                  const nextEmployee = employees.find((item) => item.id === e.target.value);
                  const ok = window.confirm(`Warning: this job will be changed to ${nextEmployee?.name || "the selected employee"}. Do you want to continue?`);
                  if (!ok) return;
                  onUpdate({ ...job, employeeId: e.target.value });
                }}
              >
                {employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label={`Edit Job Date — ${formatJobDate(job.date)}`}><input className="inputElite cursor-pointer" type="date" value={job.date} onClick={(e) => e.currentTarget.showPicker?.()} onFocus={(e) => e.currentTarget.showPicker?.()} onChange={(e) => onUpdate({ ...job, date: e.target.value })} /></Field>
            <Field label="Pay"><MoneyInput value={job.pay} onValueChange={(value) => onUpdate({ ...job, pay: value, status: statusFrom(value, job.paidAmount) })} /></Field>
            <Field label="Paid"><MoneyInput value={job.paidAmount} onValueChange={(value) => onUpdate({ ...job, paidAmount: value, status: statusFrom(job.pay, value) })} /></Field>
          </div>
          <Field label="Unit # optional"><input className="inputElite" value={job.unitNumber || ""} onChange={(e) => onUpdate({ ...job, unitNumber: e.target.value })} placeholder="Example: 204" /></Field>
          <Field label="Edit Custom Work"><input className="inputElite" value={job.customWork} onChange={(e) => onUpdate({ ...job, customWork: e.target.value })} placeholder="Edit custom work description..." /></Field>
          <Field label="Job Photos">
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-4">
              <label className="goldButton w-full cursor-pointer">
                <Camera size={18} /> Add / Take Photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const newPhotos = await readPhotoFiles(e.target.files);
                    if (newPhotos.length) onUpdate({ ...job, photos: [...job.photos, ...newPhotos] });
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {job.photos.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {job.photos.map((photo, index) => (
                    <div key={`${job.id}-photo-${index}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                      <img src={photo} alt={`Job photo ${index + 1}`} className="h-32 w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full border border-red-400/30 bg-black/70 p-2 text-red-200"
                        onClick={() => {
                          const ok = window.confirm("Remove this photo from the job?");
                          if (!ok) return;
                          onUpdate({ ...job, photos: job.photos.filter((_, photoIndex) => photoIndex !== index) });
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-center text-sm font-semibold text-zinc-500">No photos attached yet.</p>
              )}
            </div>
          </Field>
          <Field label="Edit Saved Job Notes"><textarea className="inputElite min-h-28" value={job.notes} onChange={(e) => onUpdate({ ...job, notes: e.target.value })} placeholder="Edit notes for this saved job..." /></Field>
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${job.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : job.status === "partial" ? "bg-amber-500/15 text-green-400" : "bg-red-500/15 text-red-300"}`}>{job.status.toUpperCase()}</span>
            <button className="iconDanger" onClick={onDelete}><Trash2 size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function Reports({ totals, employeeTotals, jobs, employeesById, onCloseWeek, onExport }: { totals: { earned: number; paid: number; borrowed?: number; owed: number }; employeeTotals: { employee: Employee; earned: number; paid: number; borrowed: number; owed: number }[]; jobs: JobEntry[]; employeesById: Map<string, Employee>; onCloseWeek: () => void; onExport: () => void }) {
  return (
    <section className="space-y-4">
      <SectionTop title="Reports" subtitle="Weekly summary, payroll closeout, and backup export.">
        <button className="goldButton" onClick={onExport}><Download size={18} /> Export</button>
      </SectionTop>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Earned" value={money(totals.earned)} description="Total Earned" icon={<CircleDollarSign size={20} />} variant="earned" />
        <StatCard label="Paid" value={money(totals.paid)} description="Total Paid" icon={<ArrowDown size={20} />} variant="paid" />
        <StatCard label="Borrowed" value={money(totals.borrowed || 0)} description="Total Borrowed" icon={<CreditCard size={20} />} variant="borrowed" />
        <StatCard label="Owed" value={money(totals.owed)} description="Still Owed" icon={<Minus size={20} />} variant="owed" />
      </div>
      <div className="blackCard p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-black">Weekly Closeout</h3>
            <p className="text-sm text-zinc-500">Mark every job in the selected week as paid.</p>
          </div>
          <button className="goldButton" onClick={onCloseWeek}><ShieldCheck size={18} /> Close Week Paid</button>
        </div>
      </div>
      <div className="blackCard overflow-hidden p-4">
        <h3 className="font-black">Employee Payroll Breakdown</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr><th className="py-2">Employee</th><th>Earned</th><th>Paid</th><th>Borrowed</th><th>Owed</th></tr>
            </thead>
            <tbody>
              {employeeTotals.map((row) => (
                <tr key={row.employee.id} className="border-t border-zinc-800">
                  <td className="py-3 font-bold">{row.employee.name}</td>
                  <td>{money(row.earned)}</td>
                  <td>{money(row.paid)}</td>
                  <td>{money(row.borrowed || 0)}</td>
                  <td className="font-black text-green-400">{money(row.owed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="blackCard p-4">
        <h3 className="font-black">Job Report</h3>
        <div className="mt-3 space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-zinc-800 bg-black/30 p-3 text-sm">
              <div className="flex justify-between gap-3"><b>{employeesById.get(job.employeeId)?.name || "Unknown"}</b><b className="text-green-400">{money(job.pay)}</b></div>
              <p className="text-zinc-500">{formatJobDate(job.date)} • {propertyWithUnit(job)}</p>
            </div>
          ))}
          {jobs.length === 0 && <EmptyText text="No job report yet." />}
        </div>
      </div>
    </section>
  );
}

function MorePanel({ onExport, onImport, onReset }: { onExport: () => void; onImport: () => void; onReset: () => void }) {
  return (
    <section className="space-y-4">
      <SectionTop title="Control Center" subtitle="Backup, restore, and app controls." />
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={onExport} className="blackCard p-5 text-left"><Download className="text-amber-400" /><p className="mt-3 font-black">Export Backup</p><p className="text-sm text-zinc-500">Save all data as JSON.</p></button>
        <button onClick={onImport} className="blackCard p-5 text-left"><Upload className="text-amber-400" /><p className="mt-3 font-black">Import Backup</p><p className="text-sm text-zinc-500">Restore from saved JSON.</p></button>
        <button onClick={onReset} className="blackCard p-5 text-left"><RotateCcw className="text-red-300" /><p className="mt-3 font-black">Reset App</p><p className="text-sm text-zinc-500">Start fresh only after backup.</p></button>
      </div>
    </section>
  );
}

function EmployeeModal({ onClose, onSave }: { onClose: () => void; onSave: (employee: Employee) => void }) {
  const [employee, setEmployee] = useState<Employee>({ id: uid(), name: "", phone: "", defaultRate: 0, notes: "", borrowed: 0, active: true });
  return (
    <Modal title="Add Employee" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Employee Name"><input className="inputElite" value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} placeholder="Worker name" /></Field>
        <Field label="Phone"><input className="inputElite" value={employee.phone} onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} placeholder="Phone number" /></Field>
        <Field label="Default Rate"><input className="inputElite" type="number" value={employee.defaultRate} onChange={(e) => setEmployee({ ...employee, defaultRate: safeNumber(e.target.value) })} /></Field>
        <Field label="Notes"><textarea className="inputElite min-h-20" value={employee.notes} onChange={(e) => setEmployee({ ...employee, notes: e.target.value })} /></Field>
        <button className="goldButton w-full" onClick={() => employee.name.trim() && onSave({ ...employee, name: employee.name.trim() })}><Check size={18} /> Save Employee</button>
      </div>
    </Modal>
  );
}

function JobModal({ employees, properties, jobTypeOptions, onAddProperty, onClose, onSave }: { employees: Employee[]; properties: string[]; jobTypeOptions: string[]; onAddProperty: (property: string) => void; onClose: () => void; onSave: (job: JobEntry) => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [date, setDate] = useState(todayISO());
  const [property, setProperty] = useState(properties[0] || "");
  const [unitNumber, setUnitNumber] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [customWork, setCustomWork] = useState("");
  const [pay, setPay] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  function toggleType(type: string) {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]));
  }

  return (
    <Modal title="Add Job Entry" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Employee">
          <select className="inputElite" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input className="inputElite cursor-pointer" type="date" value={date} onClick={(e) => e.currentTarget.showPicker?.()} onFocus={(e) => e.currentTarget.showPicker?.()} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Property">
            <select
              className="inputElite"
              value={property}
              onChange={(e) => {
                const selected = e.target.value;
                if (selected === "__add_new_property__") {
                  const entered = window.prompt("Enter new property name:");
                  const cleanProperty = entered?.trim() || "";
                  if (cleanProperty) {
                    onAddProperty(cleanProperty);
                    setProperty(cleanProperty);
                  }
                  return;
                }
                setProperty(selected);
              }}
            >
              {properties.map((item) => <option key={item} value={item}>{item}</option>)}
              <option value="__add_new_property__">+ Add New Property</option>
            </select>
          </Field>
          <Field label="Unit # optional"><input className="inputElite" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="Example: 204" /></Field>
        </div>
        <Field label="Job Types - choose multiple">
          <div className="flex flex-wrap gap-2">
            {jobTypeOptions.map((type) => (
              <button key={type} type="button" onClick={() => toggleType(type)} className={`rounded-full border px-3 py-2 text-xs font-black ${selectedTypes.includes(type) ? "border-green-400 bg-green-500 text-black" : "border-zinc-800 bg-black/30 text-zinc-300"}`}>{type}</button>
            ))}
          </div>
        </Field>
        <Field label="Custom Work"><input className="inputElite" value={customWork} onChange={(e) => setCustomWork(e.target.value)} placeholder="Write your own work detail" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pay"><MoneyInput value={pay} onValueChange={setPay} /></Field>
          <Field label="Paid Now"><MoneyInput value={paidAmount} onValueChange={setPaidAmount} /></Field>
        </div>
        <Field label="Notes"><textarea className="inputElite min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes, unit number, extra details..." /></Field>
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-4 text-center text-sm text-zinc-500">
          <label className="goldButton mx-auto cursor-pointer">
            <Camera size={18} /> Take / Upload Photos
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const newPhotos = await readPhotoFiles(e.target.files);
                if (newPhotos.length) setPhotos((prev) => [...prev, ...newPhotos]);
                e.currentTarget.value = "";
              }}
            />
          </label>
          {photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((photo, index) => (
                <div key={`new-job-photo-${index}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <img src={photo} alt={`New job photo ${index + 1}`} className="h-32 w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full border border-red-400/30 bg-black/70 p-2 text-red-200"
                    onClick={() => setPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3">Take pictures from your phone camera or upload from your device.</p>
          )}
        </div>
        <button
          className="goldButton w-full"
          onClick={() => {
            if (!employeeId) return alert("Add an employee first.");
            onSave({ id: uid(), employeeId, date, property, unitNumber: unitNumber.trim(), jobTypes: selectedTypes, customWork, pay, paidAmount, status: statusFrom(pay, paidAmount), notes, photos });
          }}
        >
          <Check size={18} /> Save Job
        </button>
      </div>
    </Modal>
  );
}


function MoneyInput({
  value,
  onValueChange,
  placeholder = "0.00",
}: {
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    setText(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <input
      className="inputElite"
      type="number"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        onValueChange(next === "" ? 0 : safeNumber(next));
      }}
      onBlur={() => {
        if (text === "" || text === ".") {
          setText("");
          onValueChange(0);
        }
      }}
    />
  );
}

function PropertyModal({ onClose, onSave }: { onClose: () => void; onSave: (property: string) => void }) {
  const [property, setProperty] = useState("");
  return (
    <Modal title="Add Property" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Property Name"><input className="inputElite" value={property} onChange={(e) => setProperty(e.target.value)} placeholder="Example: 220 Broad St" /></Field>
        <button className="goldButton w-full" onClick={() => property.trim() && onSave(property)}><Check size={18} /> Save Property</button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur sm:items-center">
      <div className="blackCard max-h-[92vh] w-full max-w-2xl overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <h3 className="text-xl font-black">{title}</h3>
          <button className="darkButton !p-2" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-zinc-400">{message}</p>
      <div className="mt-4 flex gap-2">
        <button className="darkButton flex-1" onClick={onCancel}>Cancel</button>
        <button className="iconDanger flex-1 !gap-2" onClick={onConfirm}><Trash2 size={18} /> Delete</button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="labelElite">{label}</span>{children}</label>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="py-5 text-center text-sm font-semibold text-zinc-500">{text}</p>;
}

function BottomNav({ activeTab, setActiveTab }: { activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void }) {
  const items: { tab: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { tab: "dashboard", label: "Dashboard", icon: <Building2 size={19} /> },
    { tab: "jobs", label: "Jobs", icon: <BriefcaseBusiness size={19} /> },
    { tab: "employees", label: "Workers", icon: <UserPlus size={19} /> },
    { tab: "properties", label: "Props", icon: <Building2 size={19} /> },
    { tab: "reports", label: "Reports", icon: <FileText size={19} /> },
    { tab: "more", label: "More", icon: <MoreVertical size={19} /> },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#081014]/95 px-2 py-2 shadow-[0_-18px_45px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-4xl grid-cols-6 gap-1">
        {items.map((item) => {
          const active = activeTab === item.tab;
          return (
            <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`rounded-2xl px-1 py-2 text-[10px] font-black transition ${active ? "text-green-400" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`}>
              <span className="mx-auto flex justify-center">{item.icon}</span>
              <span className="mt-1 block">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
