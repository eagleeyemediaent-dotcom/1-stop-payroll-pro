"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  UserPlus,
  BriefcaseBusiness,
  Building2,
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
  Home,
  Users,
  ClipboardList,
  CircleDollarSign,
  ArrowDown,
  CreditCard,
  Minus,
  Filter,
  ClipboardCheck,
  ReceiptText,
  Printer,
  Eye,
  Pencil,
  AlertTriangle,
  Clock,
  Sparkles,
  Mail,
  Image as ImageIcon,
} from "lucide-react";

// 1 STOP TURNOVER SPECIALIST PRO ELITE - OPERATIONS X
// PHASE 2 single-file replacement for app/page.tsx
// Jobs + Make Ready operations hub, while keeping Make Ready board intact

const STORAGE_KEY = "oneStopPayrollProEliteBlackGoldX_v1";

const appShellClass =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,#02070a_0%,#030303_45%,#050505_100%)] text-zinc-100 selection:bg-green-400 selection:text-black";

const statStyles = {
  earned: "from-emerald-500 to-green-600 text-white shadow-[0_0_24px_rgba(34,197,94,0.28)]",
  paid: "from-blue-400 to-blue-600 text-white shadow-[0_0_24px_rgba(59,130,246,0.28)]",
  borrowed: "from-violet-400 to-purple-600 text-white shadow-[0_0_24px_rgba(168,85,247,0.28)]",
  owed: "from-red-500 to-orange-600 text-white shadow-[0_0_24px_rgba(239,68,68,0.35)]",
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

type MakeReadyTask = {
  id: string;
  label: string;
  done: boolean;
};

type MakeReadyItem = {
  id: string;
  property: string;
  unitNumber: string;
  assignedEmployeeId: string;
  moveOutDate: string;
  moveInDate: string;
  deadline: string;
  status: "scheduled" | "in-progress" | "waiting" | "ready";
  priority: "normal" | "urgent";
  notes: string;
  tasks: MakeReadyTask[];
};

type InvoiceLineItem = {
  id: string;
  description: string;
  qty: number;
  rate: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  property: string;
  unitNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue";
  lineItems: InvoiceLineItem[];
  notes: string;
  paidAmount: number;
  clientEmail?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  sourceJobIds?: string[];
  sourceMakeReadyId?: string;
};

type AppState = {
  employees: Employee[];
  jobs: JobEntry[];
  makeReady: MakeReadyItem[];
  invoices: Invoice[];
  properties: string[];
  jobTypeOptions: string[];
  companyName: string;
};

type ActiveTab = "dashboard" | "employees" | "jobs" | "makeReady" | "invoices" | "properties" | "reports" | "more";

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

const defaultMakeReadyTasks = [
  "Move-Out Confirmed",
  "Trash Out",
  "Repairs",
  "Sheetrock / Plaster",
  "Paint",
  "Cleaning",
  "Final Inspection",
  "Ready for Move-In",
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
      borrowedByWeek: {},
      active: true,
    },
  ],
  jobs: [],
  makeReady: [],
  invoices: [],
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

function makeReadyTitle(item: Pick<MakeReadyItem, "property" | "unitNumber">) {
  return item.unitNumber?.trim() ? `${item.property} — Unit ${item.unitNumber}` : item.property;
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

function payrollStatusColor(owed: number, paid: number, earned: number) {
  if (earned <= 0) return "border-zinc-700 bg-zinc-900/70 text-zinc-300";
  if (owed <= 0) return "border-green-400/40 bg-green-500/10 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.14)]";
  if (paid > 0) return "border-orange-400/50 bg-orange-500/10 text-orange-300 shadow-[0_0_20px_rgba(249,115,22,0.18)]";
  return "border-red-400/50 bg-red-500/10 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.18)]";
}

function payrollStatusLabel(owed: number, paid: number, earned: number) {
  if (earned <= 0) return "NO JOBS";
  if (owed <= 0) return "PAID";
  if (paid > 0) return `PARTIAL — ${money(owed)} OWED`;
  return `${money(owed)} OWED`;
}

function jobStatusColor(status: JobEntry["status"], owed: number) {
  if (status === "paid" || owed <= 0) return "border-green-400/40 bg-green-500/10 text-green-300";
  if (status === "partial") return "border-orange-400/50 bg-orange-500/10 text-orange-300";
  return "border-red-400/50 bg-red-500/10 text-red-300";
}

function invoiceTotal(invoice: Pick<Invoice, "lineItems">) {
  return invoice.lineItems.reduce((sum, item) => sum + safeNumber(item.qty) * safeNumber(item.rate), 0);
}


function confirmAction(message: string) {
  return typeof window === "undefined" ? true : window.confirm(message);
}

function invoiceEmailSubject(invoice: Pick<Invoice, "invoiceNumber" | "property" | "unitNumber">) {
  return `Invoice ${invoice.invoiceNumber} - ${invoice.property}${invoice.unitNumber ? ` Unit ${invoice.unitNumber}` : ""}`;
}

function invoiceEmailBody(invoice: Invoice) {
  const total = invoiceTotal(invoice);
  const balance = Math.max(total - safeNumber(invoice.paidAmount), 0);
  const lines = invoice.lineItems
    .map((item) => `- ${item.description} | Qty: ${item.qty} | Rate: ${money(item.rate)} | Total: ${money(item.qty * item.rate)}`)
    .join("\n");

  const beforeCount = invoice.beforePhotos?.length || 0;
  const afterCount = invoice.afterPhotos?.length || 0;

  return [
    `Hello,`,
    ``,
    `Please see invoice ${invoice.invoiceNumber} from 1 Stop Turnover Specialist LLC.`,
    ``,
    `Property: ${invoice.property}${invoice.unitNumber ? ` - Unit ${invoice.unitNumber}` : ""}`,
    `Invoice Date: ${invoice.invoiceDate}`,
    `Due Date: ${invoice.dueDate}`,
    ``,
    `Work / Charges:`,
    lines || "- Labor and materials",
    ``,
    `Total: ${money(total)}`,
    `Paid: ${money(invoice.paidAmount)}`,
    `Balance Due: ${money(balance)}`,
    ``,
    invoice.notes ? `Notes: ${invoice.notes}` : "",
    ``,
    beforeCount || afterCount
      ? `Photos: This invoice includes ${beforeCount} before photo(s) and ${afterCount} after photo(s). Please attach the saved PDF/photo files when sending from your email app.`
      : `Photos: No invoice photos attached yet.`,
    ``,
    `Thank you,`,
    `1 Stop Turnover Specialist LLC`,
  ].filter(Boolean).join("\n");
}

function openInvoiceEmail(invoice: Invoice) {
  const subject = encodeURIComponent(invoiceEmailSubject(invoice));
  const body = encodeURIComponent(invoiceEmailBody(invoice));
  const to = encodeURIComponent(invoice.clientEmail || "");
  const hasPhotos = (invoice.beforePhotos?.length || 0) + (invoice.afterPhotos?.length || 0) > 0;

  if (hasPhotos) {
    alert("Your email app will open with the invoice details. Browser email links cannot automatically attach photos, so save/print the invoice as PDF and attach the PDF or photos before sending.");
  }

  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

async function compressPhotoFile(file: File): Promise<string> {
  // Phone pictures can be 3MB-12MB each. Saving that directly into localStorage can crash
  // the app with a client-side exception. This resizes/compresses photos before saving.
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

async function readPhotoFiles(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) return [];
  const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
  const limitedFiles = fileArray.slice(0, 6);
  try {
    return await Promise.all(limitedFiles.map((file) => compressPhotoFile(file)));
  } catch (error) {
    console.error("Photo processing failed", error);
    alert("One of the photos could not be added. Please try a smaller picture or add fewer photos at one time.");
    return [];
  }
}

function newMakeReadyTasks() {
  return defaultMakeReadyTasks.map((label) => ({ id: uid(), label, done: false }));
}

function nextInvoiceNumber(existing: Invoice[]) {
  const next = existing.length + 1;
  return `INV-${String(next).padStart(5, "0")}`;
}

export default function PayrollProEliteOperationsX() {
  const [state, setState] = useState<AppState>(starterState);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [jobsView, setJobsView] = useState<"jobs" | "makeReady">("jobs");
  const [selectedWeek, setSelectedWeek] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showMakeReadyForm, setShowMakeReadyForm] = useState(false);
  const [editingMakeReady, setEditingMakeReady] = useState<MakeReadyItem | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "employee" | "job" | "property" | "makeReady" | "invoice"; id: string } | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const week = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        setState({
          companyName: parsed.companyName || starterState.companyName,
          employees: Array.isArray(parsed.employees)
            ? parsed.employees.map((employee) => ({ ...employee, borrowed: safeNumber(employee.borrowed || 0), borrowedByWeek: employee.borrowedByWeek || {} }))
            : starterState.employees,
          jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
          makeReady: Array.isArray(parsed.makeReady) ? parsed.makeReady : [],
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Save failed", error);
      alert("The app could not save because the phone browser storage is full. Remove a few photos or export a backup, then try again.");
    }
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
    return weekJobs
      .filter((job) => {
        if (!q) return true;
        const employeeName = employeesById.get(job.employeeId)?.name || "";
        return [employeeName, job.property, job.unitNumber, job.customWork, job.notes, job.jobTypes.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [weekJobs, search, employeesById]);

  const filteredMakeReady = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.makeReady
      .filter((item) => {
        if (!q) return true;
        const employeeName = employeesById.get(item.assignedEmployeeId)?.name || "";
        return [employeeName, item.property, item.unitNumber, item.status, item.priority, item.notes]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [state.makeReady, search, employeesById]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.invoices
      .filter((invoice) => {
        if (!q) return true;
        return [invoice.invoiceNumber, invoice.clientName, invoice.property, invoice.unitNumber, invoice.status, invoice.notes]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  }, [state.invoices, search]);

  const totals = useMemo(() => {
    const earned = weekJobs.reduce((sum, job) => sum + safeNumber(job.pay), 0);
    const paid = weekJobs.reduce((sum, job) => sum + safeNumber(job.paidAmount), 0);
    const borrowed = state.employees.reduce((sum, employee) => sum + getBorrowedForWeek(employee, week.start), 0);
    const owed = Math.max(earned - paid - borrowed, 0);
    const invoiceOpen = state.invoices.reduce((sum, invoice) => sum + Math.max(invoiceTotal(invoice) - safeNumber(invoice.paidAmount), 0), 0);
    return { earned, paid, borrowed, owed, invoiceOpen };
  }, [weekJobs, state.employees, state.invoices, week.start]);

  const makeReadyTotals = useMemo(() => {
    const ready = state.makeReady.filter((item) => item.status === "ready").length;
    const inProgress = state.makeReady.filter((item) => item.status === "in-progress").length;
    const urgent = state.makeReady.filter((item) => item.priority === "urgent" && item.status !== "ready").length;
    const scheduled = state.makeReady.filter((item) => item.status === "scheduled" || item.status === "waiting").length;
    return { ready, inProgress, urgent, scheduled };
  }, [state.makeReady]);

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
        employees: exists ? prev.employees.map((item) => (item.id === employee.id ? employee : item)) : [...prev.employees, employee],
      };
    });
  }

  function addJob(job: JobEntry) {
    setState((prev) => ({ ...prev, jobs: [job, ...prev.jobs] }));
  }

  function updateJob(job: JobEntry) {
    setState((prev) => ({ ...prev, jobs: prev.jobs.map((item) => (item.id === job.id ? job : item)) }));
  }

  function upsertMakeReady(item: MakeReadyItem) {
    setState((prev) => {
      const exists = prev.makeReady.some((row) => row.id === item.id);
      return { ...prev, makeReady: exists ? prev.makeReady.map((row) => (row.id === item.id ? item : row)) : [item, ...prev.makeReady] };
    });
  }

  function upsertInvoice(invoice: Invoice) {
    setState((prev) => {
      const exists = prev.invoices.some((row) => row.id === invoice.id);
      return { ...prev, invoices: exists ? prev.invoices.map((row) => (row.id === invoice.id ? invoice : row)) : [invoice, ...prev.invoices] };
    });
  }

  function createInvoiceFromWeekJobs() {
    if (!confirmAction("Create an invoice from all jobs in the selected week?")) return;
    if (weekJobs.length === 0) {
      alert("There are no jobs in the selected week to invoice.");
      return;
    }
    const first = weekJobs[0];
    const invoice: Invoice = {
      id: uid(),
      invoiceNumber: nextInvoiceNumber(state.invoices),
      clientName: first.property,
      clientEmail: "",
      property: first.property,
      unitNumber: first.unitNumber || "",
      invoiceDate: todayISO(),
      dueDate: addDaysISO(todayISO(), 14),
      status: "draft",
      paidAmount: 0,
      beforePhotos: [],
      afterPhotos: weekJobs.flatMap((job) => job.photos || []),
      notes: `Created from jobs for work week ${week.start} to ${week.end}.`,
      sourceJobIds: weekJobs.map((job) => job.id),
      lineItems: weekJobs.map((job) => ({
        id: uid(),
        description: `${formatJobDate(job.date)} — ${propertyWithUnit(job)} — ${[...job.jobTypes, job.customWork].filter(Boolean).join(" / ") || "Labor"}`,
        qty: 1,
        rate: safeNumber(job.pay),
      })),
    };
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
    setActiveTab("invoices");
  }

  function deleteConfirmed() {
    if (!confirmDelete) return;
    setState((prev) => {
      if (confirmDelete.type === "employee") {
        return { ...prev, employees: prev.employees.filter((employee) => employee.id !== confirmDelete.id), jobs: prev.jobs.filter((job) => job.employeeId !== confirmDelete.id) };
      }
      if (confirmDelete.type === "job") return { ...prev, jobs: prev.jobs.filter((job) => job.id !== confirmDelete.id) };
      if (confirmDelete.type === "makeReady") return { ...prev, makeReady: prev.makeReady.filter((item) => item.id !== confirmDelete.id) };
      if (confirmDelete.type === "invoice") return { ...prev, invoices: prev.invoices.filter((item) => item.id !== confirmDelete.id) };
      return { ...prev, properties: prev.properties.filter((property) => property !== confirmDelete.id) };
    });
    setConfirmDelete(null);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `1-stop-operations-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppState>;
        if (!Array.isArray(parsed.employees) || !Array.isArray(parsed.jobs)) {
          alert("This backup file does not look valid.");
          return;
        }
        setState({
          companyName: parsed.companyName || starterState.companyName,
          employees: parsed.employees.map((employee) => ({ ...employee, borrowed: safeNumber(employee.borrowed || 0), borrowedByWeek: employee.borrowedByWeek || {} })),
          jobs: parsed.jobs,
          makeReady: Array.isArray(parsed.makeReady) ? parsed.makeReady : [],
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
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
    if (!confirmAction("Confirm: mark every job in this selected week as paid?")) return;
    setState((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) => {
        if (!isWithinRange(job.date, week.start, week.end)) return job;
        return { ...job, paidAmount: job.pay, status: "paid" };
      }),
    }));
  }

  function markEmployeeWeekPaid(employeeId: string) {
    const employeeName = employeesById.get(employeeId)?.name || "this employee";
    const row = employeeTotals.find((item) => item.employee.id === employeeId);
    const amount = row ? money(row.owed) : "the remaining balance";
    const ok = window.confirm(
      `Confirm Payment\n\nMark ${employeeName} as PAID for this selected week?\n\nAmount being cleared: ${amount}\n\nOnly confirm if payment was actually made.`
    );
    if (!ok) return;
    setState((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) => {
        if (job.employeeId !== employeeId) return job;
        if (!isWithinRange(job.date, week.start, week.end)) return job;
        return { ...job, paidAmount: job.pay, status: "paid" };
      }),
    }));
  }

  function markEmployeeWeekUnpaid(employeeId: string) {
    const employeeName = employeesById.get(employeeId)?.name || "this employee";
    const ok = window.confirm(
      `Warning: Revert Payment\n\nDo you want to mark ${employeeName} as UNPAID for this selected week?\n\nThis will put the balance back into owed status.`
    );
    if (!ok) return;
    setState((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) => {
        if (job.employeeId !== employeeId) return job;
        if (!isWithinRange(job.date, week.start, week.end)) return job;
        return { ...job, paidAmount: 0, status: "unpaid" };
      }),
    }));
  }

  return (
    <div className={appShellClass}>
      <div className="mx-auto max-w-[540px] px-4 pb-28 pt-3">
        <AppMobileHeader companyName={state.companyName} activeTab={activeTab} setActiveTab={setActiveTab} />

        <WeekHero week={week} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} />

        <button onClick={() => setShowJobForm(true)} className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.15rem] border border-green-300/20 bg-gradient-to-r from-green-500 to-green-600 px-5 py-4 text-xl font-black text-white shadow-[0_20px_45px_rgba(34,197,94,0.24)] transition active:scale-[.99]">
          <Plus size={30} /> Add Job
        </button>
        <p className="mt-3 text-center text-xs font-semibold text-zinc-500">Payroll, turnovers, make ready, and invoices in one app.</p>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wide text-zinc-300">Week Summary</h2>
          <p className="px-1 text-xs font-black text-green-400">✣ {week.start} to {week.end}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Week Earned" value={money(totals.earned)} description="Selected Week Only" icon={<CircleDollarSign size={20} />} variant="earned" />
          <StatCard label="Paid Out" value={money(totals.paid)} description="Paid This Week" icon={<ArrowDown size={20} />} variant="paid" />
          <StatCard label="Borrowed" value={money(totals.borrowed || 0)} description="Borrowed This Week" icon={<CreditCard size={20} />} variant="borrowed" />
          <StatCard label="Still Owed" value={money(totals.owed)} description="Left To Pay" icon={<Minus size={20} />} variant="owed" />
        </div>

        <div className="sticky top-[68px] z-20 -mx-4 mt-5 border-y border-white/10 bg-[#02070a]/90 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, property, job, invoice..." className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-3 text-sm outline-none ring-amber-400/40 placeholder:text-zinc-500 focus:border-green-400/60 focus:ring-4" />
          </div>
          <p className="mt-2 text-xs text-zinc-500">Jobs tab now shows <span className="font-black text-green-400">selected week only</span>. Historical jobs stay saved.</p>
        </div>

        <main className="mt-5">
          {activeTab === "dashboard" && (
            <Dashboard employeeTotals={employeeTotals} filteredJobs={filteredJobs} employeesById={employeesById} makeReadyTotals={makeReadyTotals} totals={totals} onAddJob={() => setShowJobForm(true)} onGoEmployees={() => setActiveTab("employees")} onGoReports={() => setActiveTab("reports")} onGoMakeReady={() => setActiveTab("makeReady")} onGoInvoices={() => setActiveTab("invoices")} />
          )}

          {activeTab === "employees" && (
            <section className="space-y-4">
              <SectionTop title="Employees" subtitle="Manage worker details, weekly totals, and balances.">
                <button onClick={() => setShowEmployeeForm(true)} className="goldButton"><UserPlus size={18} /> Add Employee</button>
              </SectionTop>
              <div className="grid gap-3">
                {filteredEmployees.map((employee) => {
                  const row = employeeTotals.find((item) => item.employee.id === employee.id);
                  return <EmployeeCard key={employee.id} employee={employee} totals={row} expanded={expandedEmployeeId === employee.id} onToggle={() => setExpandedEmployeeId(expandedEmployeeId === employee.id ? null : employee.id)} onDelete={() => setConfirmDelete({ type: "employee", id: employee.id })} onSave={upsertEmployee} onMarkWeekPaid={markEmployeeWeekPaid} onMarkWeekUnpaid={markEmployeeWeekUnpaid} weekStart={week.start} />;
                })}
              </div>
            </section>
          )}

          {activeTab === "jobs" && (
            <section className="space-y-4">
              <SectionTop title="Jobs + Make Ready" subtitle="One operations hub: payroll jobs and turnover units together.">
                <button onClick={() => jobsView === "jobs" ? setShowJobForm(true) : (setEditingMakeReady(null), setShowMakeReadyForm(true))} className="goldButton"><Plus size={18} /> {jobsView === "jobs" ? "Add Job" : "Add Unit"}</button>
              </SectionTop>

              <div className="grid grid-cols-2 gap-2 rounded-[1.2rem] border border-white/10 bg-black/30 p-1">
                <button type="button" onClick={() => setJobsView("jobs")} className={`rounded-2xl px-3 py-3 text-sm font-black transition ${jobsView === "jobs" ? "bg-green-500 text-black shadow-[0_10px_25px_rgba(34,197,94,0.22)]" : "text-zinc-400"}`}>
                  <span className="flex items-center justify-center gap-2"><BriefcaseBusiness size={17} /> Payroll Jobs</span>
                  <span className="mt-1 block text-[10px] font-black opacity-75">{filteredJobs.length} this week</span>
                </button>
                <button type="button" onClick={() => setJobsView("makeReady")} className={`rounded-2xl px-3 py-3 text-sm font-black transition ${jobsView === "makeReady" ? "bg-green-500 text-black shadow-[0_10px_25px_rgba(34,197,94,0.22)]" : "text-zinc-400"}`}>
                  <span className="flex items-center justify-center gap-2"><ClipboardCheck size={17} /> Make Ready</span>
                  <span className="mt-1 block text-[10px] font-black opacity-75">{filteredMakeReady.length} active units</span>
                </button>
              </div>

              {jobsView === "jobs" ? (
                <JobList jobs={filteredJobs} employees={state.employees} employeesById={employeesById} properties={state.properties} jobTypeOptions={state.jobTypeOptions} onDelete={(id) => setConfirmDelete({ type: "job", id })} onUpdate={updateJob} />
              ) : (
                <MakeReadyBoard compact items={filteredMakeReady} employees={state.employees} employeesById={employeesById} onAdd={() => { setEditingMakeReady(null); setShowMakeReadyForm(true); }} onEdit={(item) => { setEditingMakeReady(item); setShowMakeReadyForm(true); }} onDelete={(id) => setConfirmDelete({ type: "makeReady", id })} onUpdate={upsertMakeReady} />
              )}
            </section>
          )}

          {activeTab === "makeReady" && (
            <MakeReadyBoard items={filteredMakeReady} employees={state.employees} employeesById={employeesById} onAdd={() => { setEditingMakeReady(null); setShowMakeReadyForm(true); }} onEdit={(item) => { setEditingMakeReady(item); setShowMakeReadyForm(true); }} onDelete={(id) => setConfirmDelete({ type: "makeReady", id })} onUpdate={upsertMakeReady} />
          )}

          {activeTab === "invoices" && (
            <InvoicesPanel invoices={filteredInvoices} jobs={state.jobs} weekJobs={weekJobs} onAdd={() => { setEditingInvoice(null); setShowInvoiceForm(true); }} onCreateFromWeek={createInvoiceFromWeekJobs} onEdit={(invoice) => { setEditingInvoice(invoice); setShowInvoiceForm(true); }} onDelete={(id) => setConfirmDelete({ type: "invoice", id })} onUpdate={upsertInvoice} />
          )}

          {activeTab === "properties" && (
            <section className="space-y-4">
              <SectionTop title="Properties" subtitle="Your saved property dropdown list.">
                <button onClick={() => setShowPropertyForm(true)} className="goldButton"><Building2 size={18} /> Add Property</button>
              </SectionTop>
              <div className="grid gap-3">
                {state.properties.map((property) => (
                  <div key={property} className="blackCard flex items-center justify-between p-4">
                    <div><p className="font-bold">{property}</p><p className="text-xs text-zinc-500">Saved property</p></div>
                    <button onClick={() => setConfirmDelete({ type: "property", id: property })} className="iconDanger"><Trash2 size={17} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "reports" && <Reports totals={totals} employeeTotals={employeeTotals} jobs={filteredJobs} employeesById={employeesById} onCloseWeek={closeWeekAsPaid} onExport={exportData} onCreateInvoice={createInvoiceFromWeekJobs} />}

          {activeTab === "more" && <MorePanel onExport={exportData} onImport={() => importRef.current?.click()} onReset={() => { if (confirm("Reset app data? This cannot be undone unless you exported a backup.")) setState(starterState); }} />}
        </main>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) importData(file); e.currentTarget.value = ""; }} />

      {showEmployeeForm && <EmployeeModal onClose={() => setShowEmployeeForm(false)} onSave={(employee) => { upsertEmployee(employee); setShowEmployeeForm(false); }} />}

      {showJobForm && (
        <JobModal employees={state.employees} properties={state.properties} jobTypeOptions={state.jobTypeOptions} onAddProperty={(newProperty) => { const cleanProperty = newProperty.trim(); if (!cleanProperty) return; setState((prev) => ({ ...prev, properties: [...new Set([...prev.properties, cleanProperty])] })); }} onClose={() => setShowJobForm(false)} onSave={(job) => { addJob(job); setShowJobForm(false); }} />
      )}

      {showPropertyForm && <PropertyModal onClose={() => setShowPropertyForm(false)} onSave={(property) => { setState((prev) => ({ ...prev, properties: [...new Set([...prev.properties, property.trim()])].filter(Boolean) })); setShowPropertyForm(false); }} />}

      {showMakeReadyForm && (
        <MakeReadyModal employees={state.employees} properties={state.properties} initial={editingMakeReady} onClose={() => { setShowMakeReadyForm(false); setEditingMakeReady(null); }} onSave={(item) => { upsertMakeReady(item); setShowMakeReadyForm(false); setEditingMakeReady(null); }} />
      )}

      {showInvoiceForm && (
        <InvoiceModal invoices={state.invoices} properties={state.properties} initial={editingInvoice} onClose={() => { setShowInvoiceForm(false); setEditingInvoice(null); }} onSave={(invoice) => { upsertInvoice(invoice); setShowInvoiceForm(false); setEditingInvoice(null); }} />
      )}

      {confirmDelete && <ConfirmModal title="Safety Delete" message="This delete is protected so nothing is removed by accident. Are you sure?" onCancel={() => setConfirmDelete(null)} onConfirm={deleteConfirmed} />}

      <style jsx global>{`
        html, body { background: #02070a; }
        .blackCard { position: relative; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.13); background: radial-gradient(circle at 0% 0%, rgba(34,197,94,0.055), transparent 35%), linear-gradient(145deg, rgba(22, 31, 38, 0.92), rgba(7, 11, 14, 0.98)); border-radius: 0.95rem; box-shadow: 0 18px 45px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.045); }
        .blackCard::before { content: ""; pointer-events: none; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(135deg, rgba(255,255,255,0.045), transparent 40%); opacity: .55; }
        .modalCard { max-height: min(92dvh, 92vh); overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
        .goldButton { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.95rem; border: 1px solid rgba(74,222,128,0.25); background: linear-gradient(135deg,#4ade80 0%,#22c55e 50%,#16a34a 100%); color: #fff; font-weight: 950; padding: 0.72rem 1rem; box-shadow: 0 14px 34px rgba(34,197,94,0.22), inset 0 1px 0 rgba(255,255,255,0.20); transition: transform .15s ease, filter .15s ease, box-shadow .15s ease; }
        .goldButton:hover { filter: brightness(1.05); box-shadow: 0 18px 42px rgba(34,197,94,0.28), inset 0 1px 0 rgba(255,255,255,0.25); }
        .goldButton:active { transform: scale(.98); }
        .darkButton { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 0.95rem; border: 1px solid rgba(148,163,184,0.13); background: linear-gradient(180deg,rgba(25,33,39,0.94),rgba(7,10,12,0.96)); color: #f4f4f5; font-weight: 850; padding: 0.68rem 0.95rem; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
        .iconDanger { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.9rem; border: 1px solid rgba(239,68,68,0.25); background: linear-gradient(180deg,rgba(127,29,29,0.20),rgba(20,5,5,0.35)); color: #fca5a5; padding: 0.6rem; }
        .inputElite { width: 100%; border-radius: 0.95rem; border: 1px solid rgba(148,163,184,0.14); background: rgba(3,8,10,0.92); color: #fafafa; outline: none; padding: 0.82rem 0.9rem; font-size: 0.92rem; box-shadow: inset 0 1px 0 rgba(255,255,255,0.035); }
        .inputElite::placeholder { color: rgba(161,161,170,.62); }
        .inputElite:focus { border-color: rgba(34,197,94,.58); box-shadow: 0 0 0 4px rgba(34,197,94,.12), inset 0 1px 0 rgba(255,255,255,0.05); }
        .labelElite { color: #a1a1aa; font-size: .75rem; font-weight: 900; margin-bottom: .38rem; display:block; letter-spacing: .02em; }

        @media print {
          body * { visibility: hidden !important; }
          .printArea, .printArea * { visibility: visible !important; }
          .printArea { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; box-shadow: none !important; border: none !important; }
          .noPrint, .noPrint * { display: none !important; visibility: hidden !important; }
        }

        button, input, select, textarea { -webkit-tap-highlight-color: transparent; }
        @media print { body * { visibility: hidden; } .printArea, .printArea * { visibility: visible; } .printArea { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; padding: 24px; } .noPrint { display:none !important; } }
      `}</style>
    </div>
  );
}

function AppMobileHeader({ companyName, activeTab, setActiveTab }: { companyName: string; activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems: { tab: ActiveTab; label: string; subtitle: string; icon: React.ReactNode }[] = [
    { tab: "dashboard", label: "Home", subtitle: "Command center", icon: <Home size={20} /> },
    { tab: "employees", label: "Workers", subtitle: "Employees and balances", icon: <Users size={20} /> },
    { tab: "jobs", label: "Jobs + Ready", subtitle: "Payroll and turnover hub", icon: <BriefcaseBusiness size={20} /> },
    { tab: "makeReady", label: "Make Ready", subtitle: "Turnover board", icon: <ClipboardCheck size={20} /> },
    { tab: "invoices", label: "Invoices", subtitle: "Create and track invoices", icon: <ReceiptText size={20} /> },
    { tab: "properties", label: "Properties", subtitle: "Property dropdown list", icon: <Building2 size={20} /> },
    { tab: "reports", label: "Reports", subtitle: "Payroll closeout", icon: <ClipboardList size={20} /> },
    { tab: "more", label: "More", subtitle: "Backup and restore", icon: <MoreVertical size={20} /> },
  ];
  function goTo(tab: ActiveTab) { setActiveTab(tab); setMenuOpen(false); }
  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-[#02070a]/92 px-4 pb-3 pt-3 shadow-[0_12px_35px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open navigation menu" onClick={() => setMenuOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-100 shadow-lg transition active:scale-95"><span className="text-2xl leading-none">☰</span></button>
            <img src="/icon-192.png" alt="1 Stop Turnover Specialist logo" className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-black object-cover shadow-[0_0_24px_rgba(34,197,94,0.18)]" />
            <div className="min-w-0"><h1 className="truncate text-lg font-black leading-tight">1 Stop Ops Pro</h1><p className="truncate text-xs font-semibold text-zinc-400">Payroll • Make Ready • Invoices</p></div>
          </div>
          <div className="flex items-center gap-2 text-zinc-100"><button type="button" aria-label="Go to invoices" onClick={() => goTo("invoices")} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition active:scale-95"><ReceiptText size={21} /></button><button type="button" aria-label="Open more controls" onClick={() => goTo("more")} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition active:scale-95"><MoreVertical size={21} /></button></div>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <aside className="h-full w-[86%] max-w-[360px] overflow-y-auto border-r border-white/10 bg-[#050607] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-white/10 pb-4"><div><img src="/icon-192.png" alt="1 Stop Turnover Specialist logo" className="mb-3 h-16 w-16 rounded-2xl border border-white/10 bg-black object-cover shadow-[0_0_28px_rgba(34,197,94,0.20)]" /><p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-400">Navigation</p><h2 className="mt-1 text-xl font-black">1 Stop Ops Pro</h2><p className="mt-1 text-xs font-semibold text-zinc-500">{companyName}</p></div><button type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-100"><X size={18} /></button></div>
            <div className="space-y-2">{menuItems.map((item) => { const active = activeTab === item.tab; return <button key={item.tab} type="button" onClick={() => goTo(item.tab)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[.99] ${active ? "border-green-400/35 bg-green-500 text-black shadow-[0_12px_30px_rgba(34,197,94,0.22)]" : "border-white/10 bg-white/[0.035] text-zinc-100 hover:border-green-400/25"}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-black/10 text-black" : "border border-white/10 bg-green-500/10 text-green-400"}`}>{item.icon}</span><span className="min-w-0"><span className="block font-black">{item.label}</span><span className={`mt-0.5 block text-xs font-semibold ${active ? "text-black/70" : "text-zinc-500"}`}>{item.subtitle}</span></span></button>; })}</div>
          </aside>
        </div>
      )}
    </>
  );
}

function WeekHero({ week, selectedWeek, setSelectedWeek }: { week: { start: string; end: string }; selectedWeek: string; setSelectedWeek: (value: string) => void }) {
  return <section className="mt-4 border-b border-white/10 pb-4"><div className="flex items-center justify-between gap-3"><button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white" onClick={() => setSelectedWeek(addDaysISO(selectedWeek, -7))}><ChevronDown className="rotate-90" size={24} /></button><label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center"><CalendarDays size={22} /><span className="text-lg font-black">{weekDisplay(week.start, week.end)}</span><input type="date" value={selectedWeek} onClick={(e) => e.currentTarget.showPicker?.()} onFocus={(e) => e.currentTarget.showPicker?.()} onChange={(e) => setSelectedWeek(e.target.value)} className="sr-only" /></label><button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white" onClick={() => setSelectedWeek(addDaysISO(selectedWeek, 7))}><ChevronDown className="-rotate-90" size={24} /></button></div></section>;
}

function StatCard({ label, value, icon, description, variant = "earned" }: { label: string; value: string; icon: React.ReactNode; description?: string; variant?: "earned" | "paid" | "borrowed" | "owed" }) {
  const colorClass = statStyles[variant];
  const labelColor = variant === "earned" ? "text-green-400" : variant === "paid" ? "text-blue-400" : variant === "borrowed" ? "text-purple-400" : "text-red-300";
  return <div className="blackCard min-h-[118px] p-4"><div className="relative z-10 flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colorClass}`}>{icon}</div><div className="min-w-0"><p className={`text-[11px] font-black uppercase tracking-[0.12em] ${labelColor}`}>{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-zinc-50">{value}</p>{description && <p className="mt-1 text-xs font-semibold text-zinc-500">{description}</p>}</div></div></div>;
}

function SectionTop({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black">{title}</h2><p className="text-sm text-zinc-500">{subtitle}</p></div>{children}</div>;
}

function Dashboard({ employeeTotals, filteredJobs, employeesById, makeReadyTotals, totals, onAddJob, onGoEmployees, onGoReports, onGoMakeReady, onGoInvoices }: { employeeTotals: { employee: Employee; jobs: JobEntry[]; earned: number; paid: number; borrowed: number; owed: number }[]; filteredJobs: JobEntry[]; employeesById: Map<string, Employee>; makeReadyTotals: { ready: number; inProgress: number; urgent: number; scheduled: number }; totals: { invoiceOpen: number }; onAddJob: () => void; onGoEmployees: () => void; onGoReports: () => void; onGoMakeReady: () => void; onGoInvoices: () => void }) {
  const topOwed = [...employeeTotals].sort((a, b) => b.owed - a.owed).slice(0, 4);
  return <section className="grid gap-4"><div className="space-y-4"><SectionTop title="Command Center" subtitle="Your company week at a glance."><button onClick={onAddJob} className="goldButton"><Plus size={18} /> Quick Add</button></SectionTop><div className="grid grid-cols-2 gap-3"><QuickTile onClick={onGoEmployees} icon={<UserPlus />} title="Employees" subtitle="Worker balances" /><QuickTile onClick={onGoMakeReady} icon={<ClipboardCheck />} title="Make Ready" subtitle={`${makeReadyTotals.inProgress} in progress`} /><QuickTile onClick={onGoInvoices} icon={<ReceiptText />} title="Invoices" subtitle={`${money(totals.invoiceOpen)} open`} /><QuickTile onClick={onGoReports} icon={<FileText />} title="Reports" subtitle="Payroll closeout" /></div><div className="grid grid-cols-4 gap-2"><MiniMetric label="Ready" value={makeReadyTotals.ready} /><MiniMetric label="Progress" value={makeReadyTotals.inProgress} /><MiniMetric label="Urgent" value={makeReadyTotals.urgent} danger /><MiniMetric label="Waiting" value={makeReadyTotals.scheduled} /></div><div className="blackCard p-4"><h3 className="font-black">Balances by Employee</h3><div className="mt-3 space-y-3">{topOwed.map(({ employee, earned, paid, owed, borrowed }) => <div key={employee.id} className="rounded-2xl border border-zinc-800 bg-black/30 p-3"><div className="flex items-center justify-between gap-3"><p className="font-black">{employee.name}</p><p className={`${owed > 0 ? "text-red-300" : "text-green-400"} font-black`}>{money(owed)}</p></div><div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-zinc-400"><span>Earned {money(earned)}</span><span>Paid {money(paid)}</span><span>Borrowed {money(borrowed)}</span><span>Owed {money(owed)}</span></div></div>)}{topOwed.length === 0 && <EmptyText text="No employee payroll yet this week." />}</div></div></div><div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-wide text-zinc-300">Jobs This Week</h3><span className="darkButton !px-3 !py-2 text-xs"><Filter size={14} /> Week Only</span></div><div className="blackCard divide-y divide-white/10 overflow-hidden">{filteredJobs.slice(0, 7).map((job) => <JobMini key={job.id} job={job} employee={employeesById.get(job.employeeId)} />)}{filteredJobs.length === 0 && <EmptyText text="No jobs found for this week." />}</div></div></section>;
}

function QuickTile({ onClick, icon, title, subtitle }: { onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) { return <button onClick={onClick} className="blackCard p-5 text-left transition active:scale-[.99]"><div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-green-500/10 text-green-400">{icon}</div><p className="relative z-10 mt-3 text-lg font-black">{title}</p><p className="relative z-10 text-xs text-zinc-500">{subtitle}</p></button>; }
function MiniMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <div className={`rounded-2xl border p-3 text-center ${danger ? "border-red-400/25 bg-red-500/10" : "border-white/10 bg-black/25"}`}><p className={`text-xl font-black ${danger ? "text-red-300" : "text-green-400"}`}>{value}</p><p className="text-[10px] font-black uppercase text-zinc-500">{label}</p></div>; }

function JobMini({ job, employee }: { job: JobEntry; employee?: Employee }) {
  return <div className="relative z-10 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.8)]" /><p className="truncate font-black">{propertyWithUnit(job)}</p></div><p className="ml-4 text-xs text-zinc-500">{employee?.name || "Unknown Employee"} • {formatJobDate(job.date)}</p><div className="ml-4 mt-1 flex flex-wrap gap-1">{job.jobTypes.slice(0, 2).map((type) => <span key={type} className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{type}</span>)}</div></div><div className="shrink-0 text-right"><p className="font-black text-green-400">{money(job.pay)}</p><p className="text-xs text-zinc-500">Unit: {job.unitNumber || "—"}</p></div></div></div>;
}

function jobsByDay(jobs: JobEntry[]) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const grouped: Record<string, JobEntry[]> = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
  jobs.forEach((job) => { const day = new Date(`${job.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" }); if (day in grouped) grouped[day].push(job); });
  return days.map((day) => { const dayJobs = grouped[day].sort((a, b) => propertyWithUnit(a).localeCompare(propertyWithUnit(b))); const total = dayJobs.reduce((sum, job) => sum + safeNumber(job.pay), 0); return { day, jobs: dayJobs, total }; });
}

function EmployeeCard({ employee, totals, expanded, onToggle, onDelete, onSave, onMarkWeekPaid, onMarkWeekUnpaid, weekStart }: { employee: Employee; totals?: { jobs: JobEntry[]; earned: number; paid: number; borrowed: number; owed: number }; expanded: boolean; onToggle: () => void; onDelete: () => void; onSave: (employee: Employee) => void; onMarkWeekPaid: (employeeId: string) => void; onMarkWeekUnpaid: (employeeId: string) => void; weekStart: string }) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState(employee);
  useEffect(() => setDraft(employee), [employee]);
  const currentBorrowed = getBorrowedForWeek(employee, weekStart);
  const earned = totals?.earned || 0;
  const paid = totals?.paid || 0;
  const owed = totals?.owed || 0;

  return <div className="blackCard p-4"><div className="flex items-start justify-between gap-3"><button onClick={onToggle} className="flex flex-1 items-start gap-3 text-left"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-green-500/10 font-black text-green-400">{employee.name.slice(0, 1).toUpperCase()}</div><div><p className="text-lg font-black">{employee.name}</p><p className="text-xs text-zinc-500">{employee.phone || "No phone saved"}</p></div></button><button onClick={onToggle} className="rounded-xl border border-zinc-800 p-2 text-zinc-400">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></div><div className={`mt-3 rounded-2xl border px-4 py-3 text-center text-sm font-black uppercase tracking-wide ${payrollStatusColor(owed, paid, earned)}`}>{payrollStatusLabel(owed, paid, earned)}</div><div className="mt-4 grid grid-cols-4 gap-2 text-center"><BalancePill label="Earned" value={money(earned)} /><BalancePill label="Paid" value={money(paid)} /><BalancePill label="Borrowed" value={money(currentBorrowed)} /><BalancePill label="Owed" value={money(owed)} danger={owed > 0} /></div>{expanded && <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">{editing ? <div className="space-y-3"><Field label="Name"><input className="inputElite" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Phone"><input className="inputElite" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field><Field label="Default Rate"><MoneyInput value={draft.defaultRate} onValueChange={(value) => setDraft({ ...draft, defaultRate: value })} /></Field><Field label="Notes"><textarea className="inputElite min-h-20" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field><Field label="Borrowed Advance"><MoneyInput value={getBorrowedForWeek(draft, weekStart)} onValueChange={(value) => setDraft(setBorrowedForWeek(draft, weekStart, value))} /></Field><div className="flex gap-2"><button className="goldButton flex-1" onClick={() => { onSave(draft); setEditing(false); }}><Check size={18} /> Save</button><button className="darkButton" onClick={() => setEditing(false)}><X size={18} /></button></div></div> : <><p className="text-sm text-zinc-400">{employee.notes || "No employee notes saved."}</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => onMarkWeekPaid(employee.id)} className="goldButton w-full"><ShieldCheck size={18} /> Paid</button><button type="button" onClick={() => onMarkWeekUnpaid(employee.id)} className={owed <= 0 ? "darkButton w-full text-zinc-300" : "flex items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-3 text-sm font-black text-red-300"}><RotateCcw size={16} /> Unpay</button></div><div className="rounded-2xl border border-white/10 bg-black/30 p-3"><button type="button" onClick={() => setShowHistory(!showHistory)} className="flex w-full items-center justify-between gap-3 text-left"><span className="text-sm font-black text-green-400">Weekly Work History</span><span className="rounded-xl border border-white/10 bg-black/30 px-3 py-1 text-xs font-black text-zinc-400">{showHistory ? "Hide" : "Show"}</span></button>{showHistory && <div className="mt-3 space-y-3">{jobsByDay(totals?.jobs || []).map(({ day, jobs, total }) => <div key={day} className="rounded-2xl border border-zinc-800 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wider text-zinc-400">{day}</p><p className="text-xs font-black text-green-400">{jobs.length} {jobs.length === 1 ? "Job" : "Jobs"} • {money(total)}</p></div>{jobs.length > 0 ? <div className="mt-2 space-y-2">{jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/5 bg-black/30 p-2"><p className="font-bold text-zinc-100">{propertyWithUnit(job)}</p><p className="text-xs text-zinc-400">{[...job.jobTypes, job.customWork].filter(Boolean).join(" • ") || "No work detail"}</p><p className="mt-1 text-sm font-black text-green-400">{money(job.pay)}</p></div>)}</div> : <p className="mt-2 text-xs text-zinc-500">No Jobs</p>}</div>)}</div>}</div><Field label="Borrowed Advance"><MoneyInput value={currentBorrowed} onValueChange={(value) => onSave(setBorrowedForWeek(employee, weekStart, value))} placeholder="Enter Amount" /></Field><p className="text-xs font-semibold text-zinc-500">Cash advance borrowed before payday. It subtracts from the final owed amount.</p><div className="flex gap-2"><button className="darkButton flex-1" onClick={() => setEditing(true)}><MoreVertical size={18} /> Extra Info</button><button className="iconDanger" onClick={onDelete}><Trash2 size={18} /></button></div></>}</div>}</div>;
}

function BalancePill({ label, value, gold = false, danger = false }: { label: string; value: string; gold?: boolean; danger?: boolean }) { return <div className={`rounded-2xl border p-2 ${danger ? "border-red-400/30 bg-red-500/10" : gold ? "border-green-400/25 bg-green-500/10" : "border-zinc-800 bg-black/30"}`}><p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</p><p className={`text-sm font-black ${danger ? "text-red-300" : gold ? "text-green-400" : "text-zinc-100"}`}>{value}</p></div>; }


function JobList({ jobs, employees, employeesById, properties, jobTypeOptions, onDelete, onUpdate }: { jobs: JobEntry[]; employees: Employee[]; employeesById: Map<string, Employee>; properties: string[]; jobTypeOptions: string[]; onDelete: (id: string) => void; onUpdate: (job: JobEntry) => void }) {
  return <div className="space-y-3">{jobs.map((job) => <JobRow key={job.id} job={job} employees={employees} employee={employeesById.get(job.employeeId)} properties={properties} jobTypeOptions={jobTypeOptions} onDelete={() => onDelete(job.id)} onUpdate={onUpdate} />)}{jobs.length === 0 && <div className="blackCard p-6"><EmptyText text="No jobs found for this selected week." /></div>}</div>;
}

function JobRow({ job, employees, employee, properties, jobTypeOptions, onDelete, onUpdate }: { job: JobEntry; employees: Employee[]; employee?: Employee; properties: string[]; jobTypeOptions: string[]; onDelete: () => void; onUpdate: (job: JobEntry) => void }) {
  const [open, setOpen] = useState(false);
  const owed = Math.max(safeNumber(job.pay) - safeNumber(job.paidAmount), 0);
  const isFullyPaid = owed <= 0 || job.status === "paid";
  const normalizedStatus: JobEntry["status"] = owed <= 0 ? "paid" : job.status === "partial" ? "partial" : "unpaid";
  function toggleType(type: string) { const next = job.jobTypes.includes(type) ? job.jobTypes.filter((item) => item !== type) : [...job.jobTypes, type]; onUpdate({ ...job, jobTypes: next }); }
  function confirmJobPaid() { const ok = confirmAction(`Confirm Payment

Employee: ${employee?.name || "Unknown Employee"}
Property: ${propertyWithUnit(job)}
Amount: ${money(job.pay)}

Only confirm if payment was actually made.`); if (!ok) return; onUpdate({ ...job, paidAmount: job.pay, status: "paid" }); }
  function confirmJobUnpaid() { const ok = confirmAction(`Warning: Revert Payment

Mark this job as UNPAID?

Employee: ${employee?.name || "Unknown Employee"}
Property: ${propertyWithUnit(job)}
Amount returning to owed: ${money(job.pay)}

This will move the amount back into owed balance.`); if (!ok) return; onUpdate({ ...job, paidAmount: 0, status: "unpaid" }); }
  async function addPhotos(files: FileList | null) { const newPhotos = await readPhotoFiles(files); if (newPhotos.length) onUpdate({ ...job, photos: [...(job.photos || []), ...newPhotos] }); }

  return <div className="blackCard p-4"><button onClick={() => setOpen(!open)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{employee?.name || "Unknown Employee"}</p><p className="text-xs text-zinc-500">{formatJobDate(job.date)} • {propertyWithUnit(job)}</p></div><div className="text-right"><p className="font-black text-green-400">{money(job.pay)}</p><p className={`${owed > 0 ? "text-red-300" : "text-green-300"} text-xs font-black`}>Owed {money(owed)}</p></div></div><div className={`mt-3 rounded-2xl border px-3 py-2 text-center text-xs font-black uppercase ${jobStatusColor(normalizedStatus, owed)}`}>{owed <= 0 ? "PAID" : job.status === "partial" ? `PARTIAL — ${money(owed)} OWED` : `${money(owed)} OWED`}</div><p className="mt-3 rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300">{[...job.jobTypes, job.customWork].filter(Boolean).join(" • ") || "No work detail"}</p>{(job.photos || []).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{(job.photos || []).slice(0, 4).map((photo, index) => <img key={`${job.id}-thumb-${index}`} src={photo} alt={`Job photo ${index + 1}`} className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />)}{(job.photos || []).length > 4 && <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-black/40 text-xs font-black text-zinc-400">+{(job.photos || []).length - 4}</div>}</div>}</button><div className="mt-3 grid grid-cols-3 gap-2"><button className="darkButton !py-2 text-sm" onClick={() => setOpen(!open)}><Pencil size={16} /> Edit</button><button className={`${isFullyPaid ? "goldButton shadow-[0_0_28px_rgba(34,197,94,0.45)]" : "darkButton"} !py-2 text-sm`} onClick={confirmJobPaid}><Check size={16} /> {isFullyPaid ? "Paid ✓" : "Paid"}</button><button className={`${isFullyPaid ? "darkButton text-zinc-300" : "flex items-center justify-center gap-1 rounded-2xl border border-red-400/30 bg-red-500/10 px-2 py-2 text-sm font-black text-red-300"}`} onClick={confirmJobUnpaid}><RotateCcw size={15} /> Unpay</button></div>{open && <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4"><div className="grid grid-cols-2 gap-2"><Field label="Employee"><select className="inputElite" value={job.employeeId} onChange={(e) => onUpdate({ ...job, employeeId: e.target.value })}>{employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label={`Date — ${formatJobDate(job.date)}`}><input className="inputElite cursor-pointer" type="date" value={job.date} onClick={(e) => e.currentTarget.showPicker?.()} onFocus={(e) => e.currentTarget.showPicker?.()} onChange={(e) => onUpdate({ ...job, date: e.target.value })} /></Field><Field label="Property"><select className="inputElite" value={job.property} onChange={(e) => onUpdate({ ...job, property: e.target.value })}>{properties.map((property) => <option key={property} value={property}>{property}</option>)}</select></Field><Field label="Unit #"><input className="inputElite" value={job.unitNumber || ""} onChange={(e) => onUpdate({ ...job, unitNumber: e.target.value })} placeholder="Example: 204" /></Field><Field label="Pay"><MoneyInput value={job.pay} onValueChange={(value) => onUpdate({ ...job, pay: value, status: statusFrom(value, job.paidAmount) })} placeholder="Enter Amount" /></Field><Field label="Paid"><MoneyInput value={job.paidAmount} onValueChange={(value) => { if (value >= job.pay && job.pay > 0 && !confirmAction(`Confirm Payment

Mark this job paid?

Amount: ${money(value)}`)) return; onUpdate({ ...job, paidAmount: value, status: statusFrom(job.pay, value) }); }} placeholder="Enter Amount" /></Field></div><Field label="Work Type"><div className="grid grid-cols-2 gap-2">{jobTypeOptions.map((type) => <button type="button" key={type} onClick={() => toggleType(type)} className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${job.jobTypes.includes(type) ? "border-green-400/50 bg-green-500/20 text-green-300" : "border-zinc-800 bg-black/30 text-zinc-400"}`}>{job.jobTypes.includes(type) ? "✓ " : ""}{type}</button>)}</div></Field><Field label="Custom Work"><input className="inputElite" value={job.customWork} onChange={(e) => onUpdate({ ...job, customWork: e.target.value })} placeholder="Edit custom work description..." /></Field><Field label="Job Photos"><div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-4"><div className="grid grid-cols-2 gap-2"><label className="goldButton w-full cursor-pointer"><Camera size={18} /> Take Photo<input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={async (e) => { await addPhotos(e.target.files); e.currentTarget.value = ""; }} /></label><label className="darkButton w-full cursor-pointer"><ImageIcon size={18} /> Upload<input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { await addPhotos(e.target.files); e.currentTarget.value = ""; }} /></label></div>{(job.photos || []).length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3">{(job.photos || []).map((photo, index) => <div key={`${job.id}-photo-${index}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40"><img src={photo} alt={`Job photo ${index + 1}`} className="h-32 w-full object-cover" /><button type="button" className="absolute right-2 top-2 rounded-full border border-red-400/30 bg-black/70 p-2 text-red-200" onClick={() => { const ok = window.confirm("Remove this photo from the job?"); if (!ok) return; onUpdate({ ...job, photos: (job.photos || []).filter((_, photoIndex) => photoIndex !== index) }); }}><Trash2 size={15} /></button></div>)}</div> : <p className="mt-3 text-center text-sm font-semibold text-zinc-500">No photos attached yet.</p>}</div></Field><Field label="Notes"><textarea className="inputElite min-h-28" value={job.notes} onChange={(e) => onUpdate({ ...job, notes: e.target.value })} placeholder="Edit notes for this saved job..." /></Field><div className="flex items-center justify-between gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-black ${jobStatusColor(normalizedStatus, owed)}`}>{normalizedStatus.toUpperCase()}</span><button className="iconDanger" onClick={onDelete}><Trash2 size={18} /></button></div></div>}</div>;
}

function MakeReadyBoard({ items, employees, employeesById, onAdd, onEdit, onDelete, onUpdate, compact = false }: { items: MakeReadyItem[]; employees: Employee[]; employeesById: Map<string, Employee>; onAdd: () => void; onEdit: (item: MakeReadyItem) => void; onDelete: (id: string) => void; onUpdate: (item: MakeReadyItem) => void; compact?: boolean }) {
  return <section className="space-y-4">{!compact && <SectionTop title="Make Ready Board" subtitle="Track each unit from move-out to ready for move-in."><button onClick={onAdd} className="goldButton"><Plus size={18} /> Add Unit</button></SectionTop>} {compact && <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm font-semibold text-green-200">Make Ready is now available inside Jobs, while still keeping the original turnover board feel.</div>}<div className="grid gap-3">{items.map((item) => <MakeReadyCard key={item.id} item={item} employee={employeesById.get(item.assignedEmployeeId)} employees={employees} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} onUpdate={onUpdate} />)}{items.length === 0 && <div className="blackCard p-6"><EmptyText text="No Make Ready units yet. Add your first turnover unit." /></div>}</div></section>;
}

function MakeReadyCard({ item, employee, employees, onEdit, onDelete, onUpdate }: { item: MakeReadyItem; employee?: Employee; employees: Employee[]; onEdit: () => void; onDelete: () => void; onUpdate: (item: MakeReadyItem) => void }) {
  const done = item.tasks.filter((task) => task.done).length;
  const total = item.tasks.length || 1;
  const percent = Math.round((done / total) * 100);
  const statusClasses = item.status === "ready" ? "bg-emerald-500/15 text-emerald-300" : item.priority === "urgent" ? "bg-red-500/15 text-red-300" : item.status === "in-progress" ? "bg-amber-500/15 text-amber-300" : "bg-blue-500/15 text-blue-300";
  return <div className="blackCard p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-black">{makeReadyTitle(item)}</p><p className="text-xs text-zinc-500">Assigned: {employee?.name || "Not assigned"} • Deadline: {item.deadline || "—"}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClasses}`}>{item.priority === "urgent" ? "Urgent" : item.status.replace("-", " ")}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full border border-white/10 bg-black/40"><div className="h-full rounded-full bg-green-500" style={{ width: `${percent}%` }} /></div><p className="mt-1 text-xs font-bold text-zinc-500">{percent}% complete • Move-out {item.moveOutDate || "—"} • Move-in {item.moveInDate || "—"}</p><div className="mt-3 grid gap-2">{item.tasks.map((task) => <button type="button" key={task.id} onClick={() => { if (!task.done && !confirmAction(`Confirm: mark ${task.label} complete?`)) return; onUpdate({ ...item, tasks: item.tasks.map((row) => row.id === task.id ? { ...row, done: !row.done } : row) }); }} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-bold ${task.done ? "border-green-400/25 bg-green-500/10 text-green-300" : "border-zinc-800 bg-black/30 text-zinc-400"}`}><span>{task.done ? "✅" : "⬜"}</span>{task.label}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Field label="Status"><select className="inputElite" value={item.status} onChange={(e) => { const nextStatus = e.target.value as MakeReadyItem["status"]; if (nextStatus === "ready" && !confirmAction("Confirm: mark this unit ready?")) return; onUpdate({ ...item, status: nextStatus }); }}><option value="scheduled">Scheduled</option><option value="in-progress">In Progress</option><option value="waiting">Waiting</option><option value="ready">Ready</option></select></Field><Field label="Assigned"><select className="inputElite" value={item.assignedEmployeeId} onChange={(e) => onUpdate({ ...item, assignedEmployeeId: e.target.value })}><option value="">Not assigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Field></div>{item.notes && <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-zinc-400">{item.notes}</p>}<div className="mt-3 flex gap-2"><button className="darkButton flex-1" onClick={onEdit}><Pencil size={16} /> Edit Unit</button><button className="iconDanger" onClick={onDelete}><Trash2 size={18} /></button></div></div>;
}

function InvoicesPanel({ invoices, jobs, weekJobs, onAdd, onCreateFromWeek, onEdit, onDelete, onUpdate }: { invoices: Invoice[]; jobs: JobEntry[]; weekJobs: JobEntry[]; onAdd: () => void; onCreateFromWeek: () => void; onEdit: (invoice: Invoice) => void; onDelete: (id: string) => void; onUpdate: (invoice: Invoice) => void }) {
  return <section className="space-y-4"><SectionTop title="Invoices" subtitle="Create invoices inside the app and track what is paid or still open."><div className="flex flex-col gap-2"><button onClick={onAdd} className="goldButton"><Plus size={18} /> New Invoice</button><button onClick={onCreateFromWeek} className="darkButton"><Sparkles size={16} /> Invoice This Week</button></div></SectionTop>{weekJobs.length > 0 && <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm font-semibold text-green-200">Selected week has {weekJobs.length} jobs ready to turn into an invoice.</div>}<div className="space-y-3">{invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} jobs={jobs} onEdit={() => onEdit(invoice)} onDelete={() => onDelete(invoice.id)} onUpdate={onUpdate} />)}{invoices.length === 0 && <div className="blackCard p-6"><EmptyText text="No invoices yet. Create one manually or from this week’s jobs." /></div>}</div></section>;
}

function InvoiceCard({ invoice, jobs, onEdit, onDelete, onUpdate }: { invoice: Invoice; jobs: JobEntry[]; onEdit: () => void; onDelete: () => void; onUpdate: (invoice: Invoice) => void }) {
  const [preview, setPreview] = useState(false);
  const total = invoiceTotal(invoice);
  const open = Math.max(total - invoice.paidAmount, 0);
  const isPaid = invoice.status === "paid" || open <= 0;
  const sourcePhotos = jobs.filter((job) => invoice.sourceJobIds?.includes(job.id)).flatMap((job) => job.photos || []);
  const beforePhotos = invoice.beforePhotos || [];
  const afterPhotos = [...(invoice.afterPhotos || []), ...sourcePhotos];
  const statusClass = isPaid
    ? "bg-emerald-500 text-black shadow-[0_0_24px_rgba(34,197,94,0.35)]"
    : invoice.status === "overdue"
      ? "bg-red-500/20 text-red-200"
      : invoice.status === "sent"
        ? "bg-blue-500/20 text-blue-200"
        : "bg-amber-500/20 text-amber-200";

  function confirmMarkPaid() {
    if (isPaid) {
      alert(`Invoice ${invoice.invoiceNumber} is already marked paid.`);
      return;
    }
    if (!confirmAction(`Confirm: mark invoice ${invoice.invoiceNumber} paid?`)) return;
    onUpdate({ ...invoice, paidAmount: total, status: "paid" });
  }

  return (
    <div className={`blackCard p-4 ${isPaid ? "ring-2 ring-green-400/35 shadow-[0_0_32px_rgba(34,197,94,0.16)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-black">{invoice.invoiceNumber}</p>
            {isPaid && <span className="rounded-full bg-green-400 px-2 py-0.5 text-[10px] font-black text-black">PAID ✓</span>}
          </div>
          <p className="text-xs text-zinc-500">{invoice.clientName || invoice.property} • {invoice.property}{invoice.unitNumber ? ` — Unit ${invoice.unitNumber}` : ""}</p>
          {invoice.clientEmail && <p className="mt-1 text-xs font-semibold text-green-400">{invoice.clientEmail}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-black text-green-400">{money(total)}</p>
          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass}`}>{isPaid ? "paid" : invoice.status}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <BalancePill label="Total" value={money(total)} />
        <BalancePill label="Paid" value={money(invoice.paidAmount)} gold={isPaid} />
        <BalancePill label="Open" value={money(open)} gold={!isPaid} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="darkButton" onClick={onEdit}><Pencil size={16} /> Edit</button>
        <button className="darkButton" onClick={() => setPreview(!preview)}><Eye size={16} /> {preview ? "Hide" : "View"}</button>
        <button className={`${isPaid ? "goldButton shadow-[0_0_28px_rgba(34,197,94,0.45)]" : "darkButton"}`} onClick={confirmMarkPaid}><Check size={16} /> {isPaid ? "Paid ✓" : "Mark Paid"}</button>
        <button className="goldButton" onClick={() => openInvoiceEmail(invoice)}><Mail size={16} /> Email</button>
        <button className="iconDanger col-span-2" onClick={onDelete}><Trash2 size={18} /> Delete</button>
      </div>

      {preview && (
        <InvoicePreview invoice={invoice} total={total} open={open} beforePhotos={beforePhotos} afterPhotos={afterPhotos} onMarkPaid={confirmMarkPaid} />
      )}
    </div>
  );
}

function InvoicePreview({ invoice, total, open, beforePhotos, afterPhotos, onMarkPaid }: { invoice: Invoice; total: number; open: number; beforePhotos: string[]; afterPhotos: string[]; onMarkPaid: () => void }) {
  const isPaid = invoice.status === "paid" || open <= 0;
  return (
    <div className="printArea mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white text-black shadow-2xl">
      <div className="bg-zinc-950 p-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="1 Stop Turnover Specialist LLC logo" className="h-16 w-16 rounded-2xl border border-white/15 bg-black object-cover" />
            <div>
              <h2 className="text-xl font-black leading-tight">1 Stop Turnover Specialist LLC</h2>
              <p className="text-xs font-semibold text-zinc-400">Turnover • Painting • Repairs • Make Ready</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-green-400">INVOICE</p>
            <p className="text-sm font-bold">{invoice.invoiceNumber}</p>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${isPaid ? "bg-green-400 text-black" : "bg-amber-400 text-black"}`}>{isPaid ? "PAID" : "BALANCE DUE"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-zinc-200 p-4 text-sm">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Bill To</p>
          <p className="mt-1 font-black">{invoice.clientName || "Client Name"}</p>
          {invoice.clientEmail && <p>{invoice.clientEmail}</p>}
          <p>{invoice.property}{invoice.unitNumber ? ` — Unit ${invoice.unitNumber}` : ""}</p>
        </div>
        <div className="text-right">
          <p><b>Invoice Date:</b> {invoice.invoiceDate}</p>
          <p><b>Due Date:</b> {invoice.dueDate}</p>
          <p><b>Status:</b> {isPaid ? "PAID" : invoice.status.toUpperCase()}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="grid grid-cols-[1fr_52px_76px_86px] bg-zinc-100 px-3 py-2 text-xs font-black uppercase text-zinc-600">
            <div>Description</div><div className="text-center">Qty</div><div className="text-right">Rate</div><div className="text-right">Amount</div>
          </div>
          {invoice.lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_52px_76px_86px] border-t border-zinc-200 px-3 py-3 text-sm">
              <div className="pr-2 font-semibold">{item.description}</div>
              <div className="text-center">{item.qty}</div>
              <div className="text-right">{money(item.rate)}</div>
              <div className="text-right font-bold">{money(item.qty * item.rate)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-[260px] rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <div className="flex justify-between"><span>Total</span><b>{money(total)}</b></div>
            <div className="mt-2 flex justify-between"><span>Paid</span><b>{money(invoice.paidAmount)}</b></div>
            <div className="mt-2 flex justify-between border-t border-zinc-300 pt-2 text-lg"><span className="font-black">Balance</span><b className={open > 0 ? "text-red-600" : "text-green-700"}>{money(open)}</b></div>
          </div>
        </div>

        {invoice.notes && <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm"><b>Notes / Terms:</b><p className="mt-1">{invoice.notes}</p></div>}

        {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
          <div className="mt-4">
            <h3 className="font-black">Job Photos</h3>
            {beforePhotos.length > 0 && <PhotoPrintGrid title="Before Photos" photos={beforePhotos} />}
            {afterPhotos.length > 0 && <PhotoPrintGrid title="After / Completed Photos" photos={afterPhotos} />}
          </div>
        )}

        <div className="mt-5 border-t border-zinc-200 pt-3 text-center text-xs text-zinc-500">
          Thank you for your business. God bless.
        </div>
      </div>

      <div className="noPrint grid grid-cols-2 gap-2 border-t border-zinc-200 bg-zinc-100 p-3">
        <button className="goldButton" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button>
        <button className={`${isPaid ? "goldButton shadow-[0_0_28px_rgba(34,197,94,0.45)]" : "darkButton"}`} onClick={onMarkPaid}><Check size={16} /> {isPaid ? "Paid ✓" : "Mark Paid"}</button>
        <button className="darkButton col-span-2" onClick={() => openInvoiceEmail(invoice)}><Mail size={16} /> Email Invoice</button>
      </div>
    </div>
  );
}

function PhotoPrintGrid({ title, photos }: { title: string; photos: string[] }) {
  return <div className="mt-3"><p className="mb-2 text-sm font-bold">{title}</p><div className="grid grid-cols-2 gap-2">{photos.map((photo, index) => <img key={`${title}-${index}`} src={photo} alt={`${title} ${index + 1}`} className="h-32 w-full rounded-xl border object-cover" />)}</div></div>;
}

function Reports({ totals, employeeTotals, jobs, employeesById, onCloseWeek, onExport, onCreateInvoice }: { totals: { earned: number; paid: number; borrowed?: number; owed: number }; employeeTotals: { employee: Employee; earned: number; paid: number; borrowed: number; owed: number }[]; jobs: JobEntry[]; employeesById: Map<string, Employee>; onCloseWeek: () => void; onExport: () => void; onCreateInvoice: () => void }) {
  return <section className="space-y-4"><SectionTop title="Reports" subtitle="Weekly summary, payroll closeout, invoice creation, and backup export."><button className="goldButton" onClick={onExport}><Download size={18} /> Export</button></SectionTop><div className="grid grid-cols-2 gap-3"><StatCard label="Earned" value={money(totals.earned)} description="Total Earned" icon={<CircleDollarSign size={20} />} variant="earned" /><StatCard label="Paid" value={money(totals.paid)} description="Total Paid" icon={<ArrowDown size={20} />} variant="paid" /><StatCard label="Borrowed" value={money(totals.borrowed || 0)} description="Total Borrowed" icon={<CreditCard size={20} />} variant="borrowed" /><StatCard label="Owed" value={money(totals.owed)} description="Still Owed" icon={<Minus size={20} />} variant="owed" /></div><div className="blackCard p-4"><div className="flex flex-col gap-3"><div><h3 className="font-black">Weekly Closeout</h3><p className="text-sm text-zinc-500">Mark every job in the selected week as paid, or create an invoice from the selected week.</p></div><div className="grid grid-cols-2 gap-2"><button className="goldButton" onClick={onCloseWeek}><ShieldCheck size={18} /> Close Paid</button><button className="darkButton" onClick={onCreateInvoice}><ReceiptText size={18} /> Invoice Week</button></div></div></div><div className="blackCard overflow-hidden p-4"><h3 className="font-black">Employee Payroll Breakdown</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="py-2">Employee</th><th>Earned</th><th>Paid</th><th>Borrowed</th><th>Owed</th></tr></thead><tbody>{employeeTotals.map((row) => <tr key={row.employee.id} className="border-t border-zinc-800"><td className="py-3 font-bold">{row.employee.name}</td><td>{money(row.earned)}</td><td>{money(row.paid)}</td><td>{money(row.borrowed || 0)}</td><td className="font-black text-green-400">{money(row.owed)}</td></tr>)}</tbody></table></div></div><div className="blackCard p-4"><h3 className="font-black">Job Report</h3><div className="mt-3 space-y-2">{jobs.map((job) => <div key={job.id} className="rounded-2xl border border-zinc-800 bg-black/30 p-3 text-sm"><div className="flex justify-between gap-3"><b>{employeesById.get(job.employeeId)?.name || "Unknown"}</b><b className="text-green-400">{money(job.pay)}</b></div><p className="text-zinc-500">{formatJobDate(job.date)} • {propertyWithUnit(job)}</p></div>)}{jobs.length === 0 && <EmptyText text="No job report yet." />}</div></div></section>;
}

function MorePanel({ onExport, onImport, onReset }: { onExport: () => void; onImport: () => void; onReset: () => void }) { return <section className="space-y-4"><SectionTop title="Control Center" subtitle="Backup, restore, and app controls." /><div className="grid gap-3"><button onClick={onExport} className="blackCard p-5 text-left"><Download className="text-green-400" /><p className="mt-3 font-black">Export Backup</p><p className="text-sm text-zinc-500">Save all data as JSON.</p></button><button onClick={onImport} className="blackCard p-5 text-left"><Upload className="text-green-400" /><p className="mt-3 font-black">Import Backup</p><p className="text-sm text-zinc-500">Restore from saved JSON.</p></button><button onClick={onReset} className="blackCard p-5 text-left"><RotateCcw className="text-red-300" /><p className="mt-3 font-black">Reset App</p><p className="text-sm text-zinc-500">Start fresh only after backup.</p></button></div></section>; }

function EmployeeModal({ onClose, onSave }: { onClose: () => void; onSave: (employee: Employee) => void }) {
  const [employee, setEmployee] = useState<Employee>({ id: uid(), name: "", phone: "", defaultRate: 0, notes: "", borrowed: 0, borrowedByWeek: {}, active: true });
  return <Modal title="Add Employee" onClose={onClose}><div className="space-y-3"><Field label="Employee Name"><input className="inputElite" value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} placeholder="Worker name" /></Field><Field label="Phone"><input className="inputElite" value={employee.phone} onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} placeholder="Phone number" /></Field><Field label="Default Rate"><MoneyInput value={employee.defaultRate} onValueChange={(value) => setEmployee({ ...employee, defaultRate: value })} /></Field><Field label="Notes"><textarea className="inputElite min-h-20" value={employee.notes} onChange={(e) => setEmployee({ ...employee, notes: e.target.value })} /></Field><button className="goldButton w-full" onClick={() => employee.name.trim() && onSave({ ...employee, name: employee.name.trim() })}><Check size={18} /> Save Employee</button></div></Modal>;
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
  function toggleType(type: string) { setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type])); }
  return <Modal title="Add Job Entry" onClose={onClose}><div className="space-y-3"><Field label="Employee"><select className="inputElite" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Date"><input className="inputElite cursor-pointer" type="date" value={date} onClick={(e) => e.currentTarget.showPicker?.()} onFocus={(e) => e.currentTarget.showPicker?.()} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Property"><select className="inputElite" value={property} onChange={(e) => { const selected = e.target.value; if (selected === "__add_new_property__") { const entered = window.prompt("Enter new property name:"); const cleanProperty = entered?.trim() || ""; if (cleanProperty) { onAddProperty(cleanProperty); setProperty(cleanProperty); } return; } setProperty(selected); }}>{properties.map((item) => <option key={item} value={item}>{item}</option>)}<option value="__add_new_property__">+ Add New Property</option></select></Field></div><Field label="Unit #"><input className="inputElite" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="Example: 212" /></Field><Field label="Work Type"><div className="grid grid-cols-2 gap-2">{jobTypeOptions.map((type) => <button type="button" key={type} onClick={() => toggleType(type)} className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${selectedTypes.includes(type) ? "border-green-400/50 bg-green-500/20 text-green-300" : "border-zinc-800 bg-black/30 text-zinc-400"}`}>{selectedTypes.includes(type) ? "✓ " : ""}{type}</button>)}</div></Field><Field label="Custom Work"><input className="inputElite" value={customWork} onChange={(e) => setCustomWork(e.target.value)} placeholder="Extra work description" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Pay"><MoneyInput value={pay} onValueChange={setPay} placeholder="Enter Amount" /></Field><Field label="Paid"><MoneyInput value={paidAmount} onValueChange={setPaidAmount} placeholder="Enter Amount" /></Field></div><Field label="Photos"><div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-4"><div className="grid grid-cols-2 gap-2"><label className="goldButton w-full cursor-pointer"><Camera size={18} /> Take Photo<input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={async (e) => { const newPhotos = await readPhotoFiles(e.target.files); setPhotos((prev) => [...prev, ...newPhotos]); e.currentTarget.value = ""; }} /></label><label className="darkButton w-full cursor-pointer"><ImageIcon size={18} /> Upload<input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { const newPhotos = await readPhotoFiles(e.target.files); setPhotos((prev) => [...prev, ...newPhotos]); e.currentTarget.value = ""; }} /></label></div>{photos.length > 0 && <p className="mt-3 text-center text-sm text-zinc-400">{photos.length} photo(s) attached.</p>}</div></Field><Field label="Notes"><textarea className="inputElite min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" /></Field><button className="goldButton w-full" onClick={() => employeeId && property && onSave({ id: uid(), employeeId, date, property, unitNumber, jobTypes: selectedTypes, customWork, pay, paidAmount: Math.min(safeNumber(paidAmount), safeNumber(pay)), status: statusFrom(pay, Math.min(safeNumber(paidAmount), safeNumber(pay))), notes, photos })}><Check size={18} /> Save Job</button></div></Modal>;
}

function MakeReadyModal({ employees, properties, initial, onClose, onSave }: { employees: Employee[]; properties: string[]; initial: MakeReadyItem | null; onClose: () => void; onSave: (item: MakeReadyItem) => void }) {
  const [item, setItem] = useState<MakeReadyItem>(initial || { id: uid(), property: properties[0] || "", unitNumber: "", assignedEmployeeId: employees[0]?.id || "", moveOutDate: todayISO(), moveInDate: "", deadline: todayISO(), status: "scheduled", priority: "normal", notes: "", tasks: newMakeReadyTasks() });
  return <Modal title={initial ? "Edit Make Ready Unit" : "Add Make Ready Unit"} onClose={onClose}><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Property"><select className="inputElite" value={item.property} onChange={(e) => setItem({ ...item, property: e.target.value })}>{properties.map((property) => <option key={property} value={property}>{property}</option>)}</select></Field><Field label="Unit #"><input className="inputElite" value={item.unitNumber} onChange={(e) => setItem({ ...item, unitNumber: e.target.value })} /></Field><Field label="Assigned"><select className="inputElite" value={item.assignedEmployeeId} onChange={(e) => setItem({ ...item, assignedEmployeeId: e.target.value })}><option value="">Not assigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Field><Field label="Priority"><select className="inputElite" value={item.priority} onChange={(e) => setItem({ ...item, priority: e.target.value as MakeReadyItem["priority"] })}><option value="normal">Normal</option><option value="urgent">Urgent</option></select></Field><Field label="Move-Out"><input className="inputElite" type="date" value={item.moveOutDate} onChange={(e) => setItem({ ...item, moveOutDate: e.target.value })} /></Field><Field label="Move-In"><input className="inputElite" type="date" value={item.moveInDate} onChange={(e) => setItem({ ...item, moveInDate: e.target.value })} /></Field><Field label="Deadline"><input className="inputElite" type="date" value={item.deadline} onChange={(e) => setItem({ ...item, deadline: e.target.value })} /></Field><Field label="Status"><select className="inputElite" value={item.status} onChange={(e) => setItem({ ...item, status: e.target.value as MakeReadyItem["status"] })}><option value="scheduled">Scheduled</option><option value="in-progress">In Progress</option><option value="waiting">Waiting</option><option value="ready">Ready</option></select></Field></div><Field label="Checklist"><div className="space-y-2">{item.tasks.map((task) => <div key={task.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border border-zinc-800 bg-black/25 p-2"><input type="checkbox" checked={task.done} onChange={() => setItem({ ...item, tasks: item.tasks.map((row) => row.id === task.id ? { ...row, done: !row.done } : row) })} /><input className="inputElite !py-2" value={task.label} onChange={(e) => setItem({ ...item, tasks: item.tasks.map((row) => row.id === task.id ? { ...row, label: e.target.value } : row) })} /><button className="iconDanger !p-2" onClick={() => setItem({ ...item, tasks: item.tasks.filter((row) => row.id !== task.id) })}><Trash2 size={14} /></button></div>)}<button className="darkButton w-full" onClick={() => setItem({ ...item, tasks: [...item.tasks, { id: uid(), label: "New Task", done: false }] })}><Plus size={16} /> Add Task</button></div></Field><Field label="Notes"><textarea className="inputElite min-h-24" value={item.notes} onChange={(e) => setItem({ ...item, notes: e.target.value })} /></Field><button className="goldButton w-full" onClick={() => onSave(item)}><Check size={18} /> Save Make Ready</button></div></Modal>;
}

function InvoiceModal({ invoices, properties, initial, onClose, onSave }: { invoices: Invoice[]; properties: string[]; initial: Invoice | null; onClose: () => void; onSave: (invoice: Invoice) => void }) {
  const [invoice, setInvoice] = useState<Invoice>(initial || { id: uid(), invoiceNumber: nextInvoiceNumber(invoices), clientName: "", clientEmail: "", property: properties[0] || "", unitNumber: "", invoiceDate: todayISO(), dueDate: addDaysISO(todayISO(), 14), status: "draft", lineItems: [{ id: uid(), description: "Labor and materials", qty: 1, rate: 0 }], notes: "Thank you for your business. God bless.", paidAmount: 0, beforePhotos: [], afterPhotos: [] });
  const total = invoiceTotal(invoice);
  return <Modal title={initial ? "Edit Invoice" : "New Invoice"} onClose={onClose}><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Invoice #"><input className="inputElite" value={invoice.invoiceNumber} onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })} /></Field><Field label="Status"><select className="inputElite" value={invoice.status} onChange={(e) => setInvoice({ ...invoice, status: e.target.value as Invoice["status"] })}><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></Field><Field label="Client"><input className="inputElite" value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} placeholder="Example: Wingate Companies" /></Field><Field label="Client Email"><input className="inputElite" type="email" value={invoice.clientEmail || ""} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} placeholder="manager@email.com" /></Field><Field label="Property"><select className="inputElite" value={invoice.property} onChange={(e) => setInvoice({ ...invoice, property: e.target.value })}>{properties.map((property) => <option key={property} value={property}>{property}</option>)}</select></Field><Field label="Unit #"><input className="inputElite" value={invoice.unitNumber} onChange={(e) => setInvoice({ ...invoice, unitNumber: e.target.value })} /></Field><Field label="Invoice Date"><input className="inputElite" type="date" value={invoice.invoiceDate} onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })} /></Field><Field label="Due Date"><input className="inputElite" type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} /></Field><Field label="Paid Amount"><MoneyInput value={invoice.paidAmount} onValueChange={(value) => { if (value >= total && total > 0 && !confirmAction("Confirm: mark this invoice paid?")) return; setInvoice({ ...invoice, paidAmount: value, status: value >= total && total > 0 ? "paid" : invoice.status }); }} /></Field></div><Field label="Line Items"><div className="space-y-3">{invoice.lineItems.map((line) => <div key={line.id} className="rounded-2xl border border-zinc-800 bg-black/25 p-3"><Field label="Description"><input className="inputElite" value={line.description} onChange={(e) => setInvoice({ ...invoice, lineItems: invoice.lineItems.map((item) => item.id === line.id ? { ...item, description: e.target.value } : item) })} /></Field><div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2"><Field label="Qty"><input className="inputElite" type="number" value={line.qty} onChange={(e) => setInvoice({ ...invoice, lineItems: invoice.lineItems.map((item) => item.id === line.id ? { ...item, qty: safeNumber(e.target.value) } : item) })} /></Field><Field label="Rate"><MoneyInput value={line.rate} onValueChange={(value) => setInvoice({ ...invoice, lineItems: invoice.lineItems.map((item) => item.id === line.id ? { ...item, rate: value } : item) })} /></Field><button className="iconDanger self-end" onClick={() => { if (!confirmAction("Remove this line item from the invoice?")) return; setInvoice({ ...invoice, lineItems: invoice.lineItems.filter((item) => item.id !== line.id) }); }}><Trash2 size={16} /></button></div></div>)}<button className="darkButton w-full" onClick={() => setInvoice({ ...invoice, lineItems: [...invoice.lineItems, { id: uid(), description: "New line item", qty: 1, rate: 0 }] })}><Plus size={16} /> Add Line Item</button></div></Field><div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-right"><p className="text-xs font-black uppercase text-green-400">Invoice Total</p><p className="text-2xl font-black">{money(total)}</p></div><Field label="Before Photos"><InvoicePhotoPicker photos={invoice.beforePhotos || []} label="Add Before Photos" onChange={(photos) => setInvoice({ ...invoice, beforePhotos: photos })} /></Field><Field label="After / Completed Job Photos"><InvoicePhotoPicker photos={invoice.afterPhotos || []} label="Add After Photos" onChange={(photos) => setInvoice({ ...invoice, afterPhotos: photos })} /></Field><Field label="Notes / Terms"><textarea className="inputElite min-h-24" value={invoice.notes} onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })} /></Field><div className="grid grid-cols-2 gap-2"><button className="goldButton" onClick={() => onSave(invoice)}><Check size={18} /> Save Invoice</button><button className="darkButton" onClick={() => openInvoiceEmail(invoice)}><Mail size={18} /> Email</button></div></div></Modal>;
}

function InvoicePhotoPicker({ photos, label, onChange }: { photos: string[]; label: string; onChange: (photos: string[]) => void }) {
  async function addInvoicePhotos(files: FileList | null) {
    const newPhotos = await readPhotoFiles(files);
    if (newPhotos.length) onChange([...photos, ...newPhotos]);
  }
  return <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-3"><div className="grid grid-cols-2 gap-2"><label className="goldButton w-full cursor-pointer"><Camera size={18} /> Take<input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={async (e) => { await addInvoicePhotos(e.target.files); e.currentTarget.value = ""; }} /></label><label className="darkButton w-full cursor-pointer"><ImageIcon size={18} /> Upload<input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { await addInvoicePhotos(e.target.files); e.currentTarget.value = ""; }} /></label></div><p className="mt-2 text-center text-xs font-semibold text-zinc-500">{label}</p>{photos.length > 0 ? <div className="mt-3 grid grid-cols-3 gap-2">{photos.map((photo, index) => <div key={`invoice-photo-${index}`} className="relative overflow-hidden rounded-xl border border-white/10"><img src={photo} alt={`Invoice photo ${index + 1}`} className="h-24 w-full object-cover" /><button type="button" className="absolute right-1 top-1 rounded-full border border-red-400/30 bg-black/70 p-1 text-red-200" onClick={() => { if (!confirmAction("Remove this invoice photo?")) return; onChange(photos.filter((_, photoIndex) => photoIndex !== index)); }}><Trash2 size={13} /></button></div>)}</div> : <p className="mt-2 text-center text-xs font-semibold text-zinc-500">No photos attached yet.</p>}</div>;
}

function PropertyModal({ onClose, onSave }: { onClose: () => void; onSave: (property: string) => void }) { const [property, setProperty] = useState(""); return <Modal title="Add Property" onClose={onClose}><div className="space-y-3"><Field label="Property Name"><input className="inputElite" value={property} onChange={(e) => setProperty(e.target.value)} placeholder="Property name" /></Field><button className="goldButton w-full" onClick={() => property.trim() && onSave(property)}><Check size={18} /> Save Property</button></div></Modal>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"><div className="modalCard blackCard w-full max-w-[520px] p-4"><div className="relative z-10 mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-black">{title}</h2><button onClick={onClose} className="darkButton !p-3"><X size={18} /></button></div><div className="relative z-10">{children}</div></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="labelElite">{label}</span>{children}</label>; }
function MoneyInput({ value, onValueChange, placeholder = "Enter Amount" }: { value: number; onValueChange: (value: number) => void; placeholder?: string }) { return <input className="inputElite" type="number" inputMode="decimal" min="0" step="0.01" value={value === 0 ? "" : String(value)} placeholder={placeholder} onChange={(e) => onValueChange(safeNumber(e.target.value))} />; }


function EmptyText({ text }: { text: string }) { return <p className="relative z-10 py-4 text-center text-sm font-semibold text-zinc-500">{text}</p>; }
function ConfirmModal({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) { return <Modal title={title} onClose={onCancel}><div className="space-y-4"><div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-red-300" /><p className="text-sm text-red-100">{message}</p></div></div><div className="grid grid-cols-2 gap-2"><button className="darkButton" onClick={onCancel}>Cancel</button><button className="iconDanger justify-center" onClick={onConfirm}><Trash2 size={18} /> Delete</button></div></div></Modal>; }

function BottomNav({ activeTab, setActiveTab }: { activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void }) {
  const tabs: { tab: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { tab: "dashboard", label: "Home", icon: <Home size={20} /> },
    { tab: "jobs", label: "Ops", icon: <BriefcaseBusiness size={20} /> },
    { tab: "makeReady", label: "Ready", icon: <ClipboardCheck size={20} /> },
    { tab: "invoices", label: "Invoice", icon: <ReceiptText size={20} /> },
    { tab: "more", label: "More", icon: <MoreVertical size={20} /> },
  ];
  return <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#02070a]/95 px-2 pb-3 pt-2 backdrop-blur-xl"><div className="mx-auto grid max-w-[540px] grid-cols-5 gap-1">{tabs.map((item) => { const active = activeTab === item.tab; return <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-black transition active:scale-95 ${active ? "bg-green-500 text-black" : "text-zinc-500"}`}>{item.icon}<span>{item.label}</span></button>; })}</div></nav>;
}
