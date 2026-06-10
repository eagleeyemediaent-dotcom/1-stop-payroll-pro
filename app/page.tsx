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
// PHASE 13 single-file replacement for app/page.tsx
// Property address persistence + assignment preset dropdown fix
// PHASE 23: One Work Order flow only + message/PDF actions visible inside every Work Order + PDF-first invoice sharing
// PHASE 26: Estimates foundation + Work Items rename + duplicate work orders + dashboard cleanup

const STORAGE_KEY = "oneStopPayrollProEliteBlackGoldX_v1";
const PROPERTY_PROFILES_KEY = "oneStopPropertyProfiles_v1";

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
  workMessage?: string;
  workLanguage?: AssignmentLanguage;
  workStatus?: WorkOrderStatus;
};

type InvoiceLineItem = {
  id: string;
  description: string;
  qty: number;
  rate: number;
};


type Estimate = {
  id: string;
  estimateNumber: string;
  clientName: string;
  property: string;
  propertyAddress?: string;
  unitNumber: string;
  estimateDate: string;
  status: "draft" | "sent" | "approved" | "declined" | "converted";
  lineItems: InvoiceLineItem[];
  notes: string;
  clientEmail?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  sourceJobIds?: string[];
  convertedInvoiceId?: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  property: string;
  propertyAddress?: string;
  unitNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: "due" | "sent" | "paid" | "overdue";
  lineItems: InvoiceLineItem[];
  notes: string;
  paidAmount: number;
  clientEmail?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  sourceJobIds?: string[];
};

type AssignmentLanguage = "english" | "spanish" | "both";
type AssignmentStatus = "assigned" | "sent" | "in-progress" | "completed" | "approved" | "ready-to-invoice";
type WorkOrderStatus = "open" | "assigned" | "in-progress" | "completed" | "ready-to-invoice";

type WorkItemOption = {
  id: string;
  name: string;
  defaultScope: string;
  defaultNotes: string;
  defaultPriority: "normal" | "urgent";
  active: boolean;
};

type WorkAssignment = {
  id: string;
  employeeId: string;
  date: string;
  property: string;
  address: string;
  unitNumber: string;
  priority: "normal" | "urgent";
  language: AssignmentLanguage;
  status: AssignmentStatus;
  scope: string;
  notes: string;
  photos: string[];
  createdAt: string;
};

type AppState = {
  employees: Employee[];
  jobs: JobEntry[];
  invoices: Invoice[];
  estimates?: Estimate[];
  assignments: WorkAssignment[];
  properties: string[];
  propertyProfiles: Record<string, PropertyContactProfile>;
  jobTypeOptions: string[];
  workItems?: WorkItemOption[];
  companyName: string;
};

type ActiveTab = "dashboard" | "field" | "office" | "estimates" | "ops" | "employees" | "jobs" | "assignments" | "invoices" | "properties" | "workItems" | "reports" | "more";

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

const defaultPropertyAddresses: Record<string, string> = {
  "Charles Place Apartments": "460 Charles St, Providence RI",
  "206 Broad St": "206 Broad St, Providence RI",
  "220 Broad St": "220 Broad St, Providence RI",
  "228 Broad St": "228 Broad St, Providence RI",
  "Copley Chambers": "Broad St, Providence RI",
  "Riverstone Apartments": "",
  "Tanglewood Village Apartments": "",
  "Valley Apartments": "",
  "Waterview Apartments": "",
  "Wingate Property": "",
};

function getPropertyAddress(property: string) {
  const clean = normalizePropertyName(property);
  if (!clean) return "";
  if (defaultPropertyAddresses[clean]) return defaultPropertyAddresses[clean];

  const key = clean.toLowerCase();
  const match = Object.keys(defaultPropertyAddresses).find((name) => name.toLowerCase() === key);
  if (match) return defaultPropertyAddresses[match] || "";

  // Friendly matching fixes cases where the app shows a shortened/highlighted name
  // like "Charles Place" instead of the full saved key "Charles Place Apartments".
  if (key.includes("charles place")) return defaultPropertyAddresses["Charles Place Apartments"] || "";
  if (key.includes("206") && key.includes("broad")) return defaultPropertyAddresses["206 Broad St"] || "";
  if (key.includes("220") && key.includes("broad")) return defaultPropertyAddresses["220 Broad St"] || "";
  if (key.includes("228") && key.includes("broad")) return defaultPropertyAddresses["228 Broad St"] || "";
  if (key.includes("copley")) return defaultPropertyAddresses["Copley Chambers"] || "";

  const looseMatch = Object.keys(defaultPropertyAddresses).find((name) => {
    const n = name.toLowerCase();
    return n.includes(key) || key.includes(n.replace(" apartments", "").replace(" chambers", ""));
  });
  return looseMatch ? defaultPropertyAddresses[looseMatch] || "" : "";
}

function normalizePropertyName(name: string) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

type PropertyContactProfile = {
  address: string;
  contactName: string;
  email: string;
  phone: string;
  billingName: string;
  notes: string;
};

const defaultPropertyProfiles: Record<string, PropertyContactProfile> = {
  "Charles Place Apartments": { address: "460 Charles St, Providence RI", contactName: "", email: "", phone: "", billingName: "Charles Place Apartments", notes: "" },
  "206 Broad St": { address: "206 Broad St, Providence RI", contactName: "", email: "", phone: "", billingName: "Copley Chambers", notes: "" },
  "220 Broad St": { address: "220 Broad St, Providence RI", contactName: "", email: "", phone: "", billingName: "Copley Chambers", notes: "" },
  "228 Broad St": { address: "228 Broad St, Providence RI", contactName: "", email: "", phone: "", billingName: "Copley Chambers", notes: "" },
  "Copley Chambers": { address: "Broad St, Providence RI", contactName: "", email: "", phone: "", billingName: "Copley Chambers", notes: "" },
  "Riverstone Apartments": { address: "", contactName: "", email: "", phone: "", billingName: "Riverstone Apartments", notes: "" },
  "Tanglewood Village Apartments": { address: "", contactName: "", email: "", phone: "", billingName: "Tanglewood Village Apartments", notes: "" },
  "Valley Apartments": { address: "", contactName: "", email: "", phone: "", billingName: "Valley Apartments", notes: "" },
  "Waterview Apartments": { address: "", contactName: "", email: "", phone: "", billingName: "Waterview Apartments", notes: "" },
  "Wingate Property": { address: "", contactName: "", email: "", phone: "", billingName: "Wingate Property", notes: "" },
};

function getPropertyProfile(property: string): PropertyContactProfile {
  const clean = normalizePropertyName(property);
  const key = clean.toLowerCase();
  const exactName = Object.keys(defaultPropertyProfiles).find((name) => name.toLowerCase() === key);
  if (exactName) return defaultPropertyProfiles[exactName];
  if (key.includes("charles place")) return defaultPropertyProfiles["Charles Place Apartments"];
  if (key.includes("206") && key.includes("broad")) return defaultPropertyProfiles["206 Broad St"];
  if (key.includes("220") && key.includes("broad")) return defaultPropertyProfiles["220 Broad St"];
  if (key.includes("228") && key.includes("broad")) return defaultPropertyProfiles["228 Broad St"];
  if (key.includes("copley")) return defaultPropertyProfiles["Copley Chambers"];
  const looseName = Object.keys(defaultPropertyProfiles).find((name) => {
    const n = name.toLowerCase();
    return n.includes(key) || key.includes(n.replace(" apartments", "").replace(" chambers", ""));
  });
  if (looseName) return defaultPropertyProfiles[looseName];
  return { address: getPropertyAddress(clean), contactName: "", email: "", phone: "", billingName: clean || property, notes: "" };
}

function getPropertyBillingName(property: string) {
  return getPropertyProfile(property).billingName || property;
}

function getPropertyEmail(property: string) {
  return getPropertyProfile(property).email || "";
}

function getPropertyContactLine(property: string) {
  const profile = getPropertyProfile(property);
  return [profile.contactName, profile.email, profile.phone].filter(Boolean).join(" • ");
}

function normalizePropertyProfile(property: string, profile?: Partial<PropertyContactProfile>): PropertyContactProfile {
  const fallback = getPropertyProfile(property);
  return {
    address: String(profile?.address ?? fallback.address ?? ""),
    contactName: String(profile?.contactName ?? fallback.contactName ?? ""),
    email: String(profile?.email ?? fallback.email ?? ""),
    phone: String(profile?.phone ?? fallback.phone ?? ""),
    billingName: String(profile?.billingName ?? fallback.billingName ?? property),
    notes: String(profile?.notes ?? fallback.notes ?? ""),
  };
}

function loadSavedPropertyProfiles(): Record<string, PropertyContactProfile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROPERTY_PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<PropertyContactProfile>>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([name, profile]) => [name, normalizePropertyProfile(name, profile)])
    );
  } catch (error) {
    console.error("Property profile load failed", error);
    return {};
  }
}

function savePropertyProfilesToStorage(profiles: Record<string, PropertyContactProfile>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROPERTY_PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error("Property profile save failed", error);
    alert("The property profile could not save. Please export a backup and remove a few old photos if phone storage is full.");
  }
}

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

const defaultWorkItems: WorkItemOption[] = defaultJobTypes.map((name) => ({
  id: uid(),
  name,
  defaultScope: "",
  defaultNotes: "",
  defaultPriority: "normal",
  active: true,
}));

const assignmentPresets: { label: string; english: string; spanish: string }[] = [
  {
    label: "Sheetrock Repair",
    english: "Repair damaged sheetrock.\nPlaster and sand affected areas until walls are smooth and ready for paint.\nRepair and detail walls as needed.\nClean work area when finished.",
    spanish: "Reparación de sheetrock dañado.\nPlasteo y lijado de áreas afectadas para dejar las paredes lisas y listas para pintura.\nReparación y detalle de paredes según sea necesario.\nLimpieza básica del área de trabajo al finalizar.",
  },
  {
    label: "Water Damage Repair",
    english: "Repair wall damage caused by water.\nRemove loose material as needed.\nPatch, plaster, sand, and prepare affected walls for paint.\nClean work area when finished.",
    spanish: "Reparar daños en las paredes causados por agua.\nRemover material suelto según sea necesario.\nParchar, plaster, lijar y preparar las paredes afectadas para pintura.\nLimpiar el área de trabajo al finalizar.",
  },
  {
    label: "Full Unit Painting",
    english: "Prepare unit for painting.\nRepair minor wall imperfections as needed.\nPaint walls with two coats where required.\nComplete touch-ups and leave the unit clean.",
    spanish: "Preparar la unidad para pintura.\nReparar imperfecciones menores en las paredes según sea necesario.\nPintar las paredes con dos manos donde sea requerido.\nCompletar retoques y dejar la unidad limpia.",
  },
  {
    label: "Trash Out",
    english: "Remove trash and unwanted items from the unit.\nSweep affected areas.\nNotify office if large items or hazardous materials are found.",
    spanish: "Remover basura y artículos no deseados de la unidad.\nBarrer las áreas afectadas.\nNotificar a la oficina si hay artículos grandes o materiales peligrosos.",
  },
  {
    label: "Occupied Unit Work",
    english: "Complete assigned work inside occupied unit.\nProtect resident belongings and keep area clean.\nCommunicate any issue before leaving.",
    spanish: "Completar el trabajo asignado dentro de una unidad ocupada.\nProteger las pertenencias del residente y mantener el área limpia.\nComunicar cualquier problema antes de salir.",
  },
  {
    label: "Touch Ups",
    english: "Complete paint and repair touch-ups as needed.\nCheck details before leaving.\nClean work area when finished.",
    spanish: "Completar retoques de pintura y reparación según sea necesario.\nRevisar los detalles antes de salir.\nLimpiar el área de trabajo al finalizar.",
  },
  {
    label: "Custom",
    english: "",
    spanish: "",
  },
];


const workOrderTemplates: {
  label: string;
  jobTypes: string[];
  customWork: string;
  notes: string;
  priority: "normal" | "urgent";
}[] = [
  {
    label: "Water Leak Turnover",
    jobTypes: ["Repair Damage Walls Due To Water Leak", "Full Unit Painting"],
    customWork: "Prime affected areas as needed.\nPaint repaired walls and complete touch-ups.\nClean work area when finished.",
    notes: "Take before and after photos of water damage repairs.",
    priority: "urgent",
  },
  {
    label: "Full Paint Turnover",
    jobTypes: ["Full Unit Painting"],
    customWork: "Prep walls before painting.\nRepair minor wall imperfections as needed.\nApply two coats where required.\nComplete final touch-ups.",
    notes: "Take completion photos before leaving unit.",
    priority: "normal",
  },
  {
    label: "Trash Out",
    jobTypes: ["Trash Removal"],
    customWork: "Remove trash and unwanted items from the unit.\nSweep affected areas.\nNotify office if large items or hazardous materials are found.",
    notes: "Take before and after photos of all removed trash areas.",
    priority: "normal",
  },
  {
    label: "Occupied Unit Repair",
    jobTypes: ["Occupied Unit", "Repair Damage Walls"],
    customWork: "Complete assigned repair inside occupied unit.\nProtect resident belongings.\nKeep work area clean before leaving.",
    notes: "Communicate any access issue or additional repair needed.",
    priority: "normal",
  },
  {
    label: "Turnover Touch Ups",
    jobTypes: ["Touch Ups", "Finish Painting"],
    customWork: "Complete paint and repair touch-ups as needed.\nCheck details before leaving.\nClean work area when finished.",
    notes: "Confirm unit is ready for final inspection.",
    priority: "normal",
  },
];


function assignmentScopeFor(label: string, language: AssignmentLanguage) {
  const preset = assignmentPresets.find((item) => item.label === label);
  if (!preset || label === "Custom") return "";
  if (language === "english") return preset.english;
  if (language === "both") return `${preset.english}\n\n--- Español ---\n${preset.spanish}`.trim();
  return preset.spanish;
}


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
  invoices: [],
  estimates: [],
  assignments: [],
  properties: defaultProperties,
  propertyProfiles: defaultPropertyProfiles,
  jobTypeOptions: defaultJobTypes,
  workItems: defaultWorkItems,
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
  const invoiceAddress = invoice.propertyAddress || getPropertyAddress(invoice.property);
  const balance = Math.max(total - safeNumber(invoice.paidAmount), 0);
  const lines = invoice.lineItems
    .map((item) => `- ${item.description} | Qty: ${item.qty} | Amount: ${money(item.rate)} | Total: ${money(item.qty * item.rate)}`)
    .join("\n");

  const beforeCount = invoice.beforePhotos?.length || 0;
  const afterCount = invoice.afterPhotos?.length || 0;

  return [
    `Hello,`,
    ``,
    `Please see invoice ${invoice.invoiceNumber} from 1 Stop Turnover Specialist LLC.`,
    ``,
    `Property: ${invoice.property}${invoice.unitNumber ? ` - Unit ${invoice.unitNumber}` : ""}`,
    invoiceAddress ? `Address: ${invoiceAddress}` : "",
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
  invoice = customerSafeInvoice(invoice);
  alert("The invoice PDF will open first. Save it as a PDF, then attach that clean PDF to your email.");
  printInvoiceDocument(invoice, invoice.beforePhotos || [], invoice.afterPhotos || []);
  const subject = encodeURIComponent(invoiceEmailSubject(invoice));
  const body = encodeURIComponent(`Hello,\n\nPlease see attached PDF invoice ${invoice.invoiceNumber}.\n\nThank you,\n1 Stop Turnover Specialist LLC`);
  const to = encodeURIComponent(invoice.clientEmail || "");
  setTimeout(() => { window.location.href = `mailto:${to}?subject=${subject}&body=${body}`; }, 650);
}

function openInvoiceMessage(invoice: Invoice) {
  invoice = customerSafeInvoice(invoice);
  alert("The invoice PDF will open first. Save it as a PDF, then attach that clean PDF to your text/message.");
  printInvoiceDocument(invoice, invoice.beforePhotos || [], invoice.afterPhotos || []);
  const text = encodeURIComponent(`Invoice ${invoice.invoiceNumber} is ready. Please see the attached PDF invoice from 1 Stop Turnover Specialist LLC. Thank you.`);
  setTimeout(() => { window.location.href = `sms:?&body=${text}`; }, 650);
}


function escapePrintHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function invoiceStatusIsPaid(invoice: Invoice) {
  const total = invoiceTotal(invoice);
  return invoice.status === "paid" && total > 0 && safeNumber(invoice.paidAmount) >= total;
}

function stripInternalInvoiceText(text: string) {
  return String(text || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part && !/(employee\s*pay|worker\s*pay|payroll|pay\s+the\s+employee|paid\s+to\s+workers|kept\s+separate|separate\s+from\s+employee|separate\s+from\s+what\s+you\s+pay)/i.test(part))
    .join(" ")
    .trim();
}

function customerSafeInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    notes: stripInternalInvoiceText(invoice.notes) || "Thank you for your business. God bless.",
    lineItems: invoice.lineItems.map((item) => ({
      ...item,
      description: stripInternalInvoiceText(item.description) || item.description || "Labor and materials",
    })),
  };
}

function printInvoiceDocument(invoice: Invoice, beforePhotos: string[] = [], afterPhotos: string[] = []) {
  if (typeof window === "undefined") return;
  invoice = customerSafeInvoice(invoice);
  const total = invoiceTotal(invoice);
  const paid = safeNumber(invoice.paidAmount);
  const balance = Math.max(total - paid, 0);
  const isPaid = invoiceStatusIsPaid(invoice);
  const invoiceAddress = invoice.propertyAddress || getPropertyAddress(invoice.property);
  const lineRows = invoice.lineItems.map((item) => `
    <tr>
      <td>${escapePrintHtml(item.description)}</td>
      <td class="center">${escapePrintHtml(item.qty)}</td>
      <td class="right">${money(item.rate)}</td>
      <td class="right strong">${money(safeNumber(item.qty) * safeNumber(item.rate))}</td>
    </tr>
  `).join("");
  const photoSection = (title: string, photos: string[]) => photos.length ? `
    <section class="photos">
      <h3>${escapePrintHtml(title)}</h3>
      <div class="photoGrid">
        ${photos.map((photo, index) => `
          <figure>
            <img src="${photo}" alt="${escapePrintHtml(title)} ${index + 1}" />
            <figcaption>${escapePrintHtml(title)} #${index + 1}</figcaption>
          </figure>
        `).join("")}
      </div>
    </section>
  ` : "";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapePrintHtml(invoice.invoiceNumber)} - 1 Stop Invoice</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: white; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .invoice { width: 100%; max-width: 820px; margin: 0 auto; padding: 28px; }
    .header { background: #020617; color: white; border-radius: 18px; padding: 22px; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
    .brand { display: flex; gap: 14px; align-items: center; }
    .brand img { width: 72px; height: 72px; border-radius: 18px; object-fit: cover; background: black; }
    h1, h2, h3, p { margin: 0; }
    .company { font-size: 24px; font-weight: 900; }
    .tagline { margin-top: 5px; color: #cbd5e1; font-size: 13px; font-weight: 700; }
    .invoiceTitle { text-align: right; }
    .invoiceTitle h2 { color: #22c55e; font-size: 32px; font-weight: 900; letter-spacing: .04em; }
    .badge { display: inline-block; margin-top: 10px; padding: 7px 12px; border-radius: 999px; background: ${isPaid ? "#22c55e" : "#f59e0b"}; color: #020617; font-weight: 900; font-size: 12px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 22px; padding-bottom: 18px; border-bottom: 1px solid #e5e7eb; }
    .label { color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: .08em; font-weight: 900; margin-bottom: 6px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .strong { font-weight: 900; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
    th { background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; text-align: left; padding: 11px; }
    td { border-top: 1px solid #e5e7eb; padding: 13px 11px; font-size: 13px; vertical-align: top; }
    .totals { margin-top: 20px; margin-left: auto; width: 300px; border: 1px solid #e5e7eb; background: #f8fafc; border-radius: 14px; padding: 14px; }
    .totals div { display: flex; justify-content: space-between; margin: 8px 0; }
    .balance { border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 20px; font-weight: 900; }
    .balance b { color: ${balance > 0 ? "#dc2626" : "#15803d"}; }
    .notes { margin-top: 20px; border: 1px solid #e5e7eb; background: #f8fafc; border-radius: 14px; padding: 14px; font-size: 13px; }
    .photos { margin-top: 22px; page-break-inside: avoid; }
    .photos h3 { margin-bottom: 10px; font-size: 16px; font-weight: 900; }
    .photoGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    figure { margin: 0; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; background: #f8fafc; page-break-inside: avoid; }
    figure img { width: 100%; height: 220px; object-fit: cover; display: block; }
    figcaption { padding: 7px 9px; color: #64748b; font-size: 11px; font-weight: 800; }
    .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 12px; display: flex; justify-content: space-between; gap: 12px; }
    @page { margin: 0.45in; }
    @media print { .invoice { padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="header">
      <div class="brand">
        <img src="/icon-192.png" alt="1 Stop logo" />
        <div>
          <h1 class="company">1 Stop Turnover Specialist LLC</h1>
          <p class="tagline">Turnover • Painting • Repairs • Work Orders</p>
        </div>
      </div>
      <div class="invoiceTitle">
        <h2>INVOICE</h2>
        <p class="strong">${escapePrintHtml(invoice.invoiceNumber)}</p>
        <span class="badge">${isPaid ? "PAID" : "BALANCE DUE"}</span>
      </div>
    </section>

    <section class="meta">
      <div>
        <p class="label">Bill To</p>
        <p class="strong">${escapePrintHtml(invoice.clientName || "Client Name")}</p>
        ${invoice.clientEmail ? `<p>${escapePrintHtml(invoice.clientEmail)}</p>` : ""}
        ${invoiceAddress ? `<p>${escapePrintHtml(invoiceAddress)}</p>` : ""}
      </div>
      <div class="right">
        <p><b>Invoice Date:</b> ${escapePrintHtml(invoice.invoiceDate)}</p>
        <p><b>Due Date:</b> ${escapePrintHtml(invoice.dueDate)}</p>
        <p><b>Status:</b> ${isPaid ? "PAID" : escapePrintHtml(invoice.status.toUpperCase())}</p>
      </div>
    </section>

    <table>
      <thead><tr><th>Description</th><th class="center">Qty</th><th class="right">Amount</th><th class="right">Total</th></tr></thead>
      <tbody>${lineRows || `<tr><td colspan="4">No line items added.</td></tr>`}</tbody>
    </table>

    <section class="totals">
      <div><span>Total</span><b>${money(total)}</b></div>
      <div><span>Paid</span><b>${money(paid)}</b></div>
      <div class="balance"><span>Balance</span><b>${money(balance)}</b></div>
    </section>

    ${invoice.notes ? `<section class="notes"><b>Notes / Terms:</b><p>${escapePrintHtml(invoice.notes).replace(/\n/g, "<br />")}</p></section>` : ""}
    ${photoSection("Before Photos", beforePhotos)}
    ${photoSection("After / Completed Photos", afterPhotos)}

    <section class="footer">
      <span>Thank you for your business.</span>
      <span>1 Stop Turnover Specialist LLC</span>
    </section>
  </main>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    alert("Please allow pop-ups so the invoice PDF preview can open for printing/saving.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
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

function nextInvoiceNumber(existing: Invoice[]) {
  const next = existing.length + 1;
  return `INV-${String(next).padStart(5, "0")}`;
}

function nextEstimateNumber(existing: Estimate[] = []) {
  const next = existing.length + 1;
  return `EST-${String(next).padStart(5, "0")}`;
}

function estimateTotal(estimate: Pick<Estimate, "lineItems">) {
  return estimate.lineItems.reduce((sum, item) => sum + safeNumber(item.qty) * safeNumber(item.rate), 0);
}

export default function PayrollProEliteOperationsX() {
  const [state, setState] = useState<AppState>(starterState);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedWeek, setSelectedWeek] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<WorkAssignment | null>(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingPropertyName, setEditingPropertyName] = useState<string | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "employee" | "job" | "property" | "invoice" | "estimate" | "assignment"; id: string } | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const week = useMemo(() => getWeekRange(selectedWeek), [selectedWeek]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const savedPropertyProfiles = loadSavedPropertyProfiles();
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        const mergedPropertyProfiles = { ...defaultPropertyProfiles, ...(parsed.propertyProfiles || {}), ...savedPropertyProfiles };
        setState({
          companyName: parsed.companyName || starterState.companyName,
          employees: Array.isArray(parsed.employees)
            ? parsed.employees.map((employee) => ({ ...employee, borrowed: safeNumber(employee.borrowed || 0), borrowedByWeek: employee.borrowedByWeek || {} }))
            : starterState.employees,
          jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
          estimates: Array.isArray(parsed.estimates) ? parsed.estimates : [],
          assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
          properties: Array.isArray(parsed.properties) ? parsed.properties : defaultProperties,
          propertyProfiles: mergedPropertyProfiles,
          jobTypeOptions: Array.isArray(parsed.jobTypeOptions) ? parsed.jobTypeOptions : defaultJobTypes,
          workItems: Array.isArray(parsed.workItems) ? parsed.workItems : defaultWorkItems,
        });
      } else if (Object.keys(savedPropertyProfiles).length > 0) {
        setState((prev) => ({
          ...prev,
          propertyProfiles: { ...defaultPropertyProfiles, ...savedPropertyProfiles },
          properties: [...new Set([...prev.properties, ...Object.keys(savedPropertyProfiles)])].filter(Boolean),
        }));
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
      savePropertyProfilesToStorage(state.propertyProfiles || {});
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

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.assignments
      .filter((assignment) => {
        if (!q) return true;
        const employeeName = employeesById.get(assignment.employeeId)?.name || "";
        return [employeeName, assignment.property, assignment.address, assignment.unitNumber, assignment.status, assignment.priority, assignment.scope, assignment.notes]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.assignments, search, employeesById]);

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

  const filteredEstimates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.estimates || [])
      .filter((estimate) => {
        if (!q) return true;
        return [estimate.estimateNumber, estimate.clientName, estimate.property, estimate.unitNumber, estimate.status, estimate.notes]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.estimateDate.localeCompare(a.estimateDate));
  }, [state.estimates, search]);

  const totals = useMemo(() => {
    const earned = weekJobs.reduce((sum, job) => sum + safeNumber(job.pay), 0);
    const paid = weekJobs.reduce((sum, job) => sum + safeNumber(job.paidAmount), 0);
    const borrowed = state.employees.reduce((sum, employee) => sum + getBorrowedForWeek(employee, week.start), 0);
    const owed = Math.max(earned - paid - borrowed, 0);
    const invoiceOpen = state.invoices.reduce((sum, invoice) => sum + Math.max(invoiceTotal(invoice) - safeNumber(invoice.paidAmount), 0), 0);
    const draftEstimates = (state.estimates || []).filter((estimate) => estimate.status === "draft").length;
    const readyToInvoice = weekJobs.filter((job) => job.workStatus === "ready-to-invoice").length;
    return { earned, paid, borrowed, owed, invoiceOpen, draftEstimates, readyToInvoice };
  }, [weekJobs, state.employees, state.invoices, week.start]);

  const workOrderTotals = useMemo(() => {
    const total = weekJobs.length;
    const unpaid = weekJobs.filter((job) => job.status !== "paid").length;
    const paid = weekJobs.filter((job) => job.status === "paid").length;
    const photos = weekJobs.reduce((sum, job) => sum + (job.photos?.length || 0), 0);
    return { total, unpaid, paid, photos };
  }, [weekJobs]);

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

  function getSavedPropertyProfile(property: string): PropertyContactProfile {
    const clean = normalizePropertyName(property);
    const fallback = getPropertyProfile(clean);
    const savedProfiles = state.propertyProfiles || {};
    const savedKey = Object.keys(savedProfiles).find((name) => name === clean || name.toLowerCase() === clean.toLowerCase());
    const saved = savedKey ? savedProfiles[savedKey] : undefined;

    // Important: do not let an older saved blank address erase the default/property address.
    return normalizePropertyProfile(clean, {
      ...fallback,
      ...(saved || {}),
      address: saved?.address?.trim() || fallback.address || getPropertyAddress(clean),
      billingName: saved?.billingName?.trim() || fallback.billingName || clean,
    });
  }

  function getSavedPropertyAddress(property: string) {
    const profileAddress = getSavedPropertyProfile(property).address?.trim();
    return profileAddress || getPropertyAddress(property);
  }

  function getSavedPropertyBillingName(property: string) {
    return getSavedPropertyProfile(property).billingName || property;
  }

  function getSavedPropertyEmail(property: string) {
    return getSavedPropertyProfile(property).email || "";
  }

  function savePropertyProfile(propertyName: string, profile: PropertyContactProfile, previousName?: string | null) {
    const cleanName = normalizePropertyName(propertyName);
    const oldName = normalizePropertyName(previousName || "");
    if (!cleanName) return;

    setState((prev) => {
      const currentProfiles = prev.propertyProfiles || {};
      const existingProfile = oldName && currentProfiles[oldName] ? currentProfiles[oldName] : currentProfiles[cleanName];
      const nextProfile = normalizePropertyProfile(cleanName, {
        ...existingProfile,
        ...profile,
        billingName: normalizePropertyName(profile.billingName) || cleanName,
      });
      const nextProfiles = { ...currentProfiles };
      if (oldName && oldName !== cleanName) delete nextProfiles[oldName];
      nextProfiles[cleanName] = nextProfile;

      const nextProperties = prev.properties.map((item) => (oldName && item === oldName ? cleanName : item));
      const finalProperties = [...new Set([...nextProperties, cleanName].map(normalizePropertyName).filter(Boolean))];

      savePropertyProfilesToStorage(nextProfiles);

      return {
        ...prev,
        properties: finalProperties,
        propertyProfiles: nextProfiles,
      };
    });
  }

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

  function upsertAssignment(assignment: WorkAssignment) {
    setState((prev) => {
      const exists = prev.assignments.some((row) => row.id === assignment.id);
      return {
        ...prev,
        assignments: exists ? prev.assignments.map((row) => (row.id === assignment.id ? assignment : row)) : [assignment, ...prev.assignments],
      };
    });
  }

  function upsertInvoice(invoice: Invoice) {
    const cleanInvoice = customerSafeInvoice(invoice);
    setState((prev) => {
      const exists = prev.invoices.some((row) => row.id === cleanInvoice.id);
      return { ...prev, invoices: exists ? prev.invoices.map((row) => (row.id === cleanInvoice.id ? cleanInvoice : row)) : [cleanInvoice, ...prev.invoices] };
    });
  }

  function createInvoiceFromWeekJobs() {
    if (!confirmAction("Create an invoice from all work orders in the selected week?\n\nYou can edit every company charge amount before saving.")) return;
    if (weekJobs.length === 0) {
      alert("There are no work orders in the selected week to invoice.");
      return;
    }
    const first = weekJobs[0];
    const invoice: Invoice = {
      id: uid(),
      invoiceNumber: nextInvoiceNumber(state.invoices),
      clientName: getSavedPropertyBillingName(first.property),
      clientEmail: getSavedPropertyEmail(first.property),
      property: first.property,
      propertyAddress: getSavedPropertyAddress(first.property),
      unitNumber: first.unitNumber || "",
      invoiceDate: todayISO(),
      dueDate: addDaysISO(todayISO(), 14),
      status: "due",
      paidAmount: 0,
      beforePhotos: [],
      afterPhotos: weekJobs.flatMap((job) => job.photos || []),
      notes: `Thank you for your business. God bless.`,
      sourceJobIds: weekJobs.map((job) => job.id),
      lineItems: weekJobs.map((job) => ({
        id: uid(),
        description: `${formatJobDate(job.date)} — ${propertyWithUnit(job)} — ${[...job.jobTypes, job.customWork].filter(Boolean).join(" / ") || "Labor"}`,
        qty: 1,
        rate: 0,
      })),
    };
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
    setActiveTab("office");
    
  }

  function openInvoiceDraft(invoice: Invoice) {
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
    setActiveTab("office");
    
  }

  function createInvoiceFromJob(job: JobEntry) {
    // Phase 23.1: No more pop-up asking for the company charge first.
    // Open the full Invoice Center so the amount, notes, photos, PDF preview,
    // email, text, WhatsApp, and print options are all in one clean screen.
    const invoice: Invoice = {
      id: uid(),
      invoiceNumber: nextInvoiceNumber(state.invoices),
      clientName: getSavedPropertyBillingName(job.property),
      clientEmail: getSavedPropertyEmail(job.property),
      property: job.property,
      propertyAddress: getSavedPropertyAddress(job.property),
      unitNumber: job.unitNumber || "",
      invoiceDate: todayISO(),
      dueDate: addDaysISO(todayISO(), 14),
      status: "due",
      paidAmount: 0,
      beforePhotos: [],
      afterPhotos: job.photos || [],
      notes: `Thank you for your business. God bless.`,
      sourceJobIds: [job.id],
      lineItems: [{
        id: uid(),
        description: `${formatJobDate(job.date)} — ${propertyWithUnit(job)} — ${[...job.jobTypes, job.customWork].filter(Boolean).join(" / ") || "Labor"}`,
        qty: 1,
        rate: 0,
      }],
    };
    openInvoiceDraft(invoice);
  }

  function upsertEstimate(estimate: Estimate) {
    setState((prev) => {
      const exists = (prev.estimates || []).some((row) => row.id === estimate.id);
      return {
        ...prev,
        estimates: exists ? (prev.estimates || []).map((row) => (row.id === estimate.id ? estimate : row)) : [estimate, ...(prev.estimates || [])],
      };
    });
  }

  function createEstimateFromJob(job: JobEntry) {
    const estimate: Estimate = {
      id: uid(),
      estimateNumber: nextEstimateNumber(state.estimates || []),
      clientName: getSavedPropertyBillingName(job.property),
      clientEmail: getSavedPropertyEmail(job.property),
      property: job.property,
      propertyAddress: getSavedPropertyAddress(job.property),
      unitNumber: job.unitNumber || "",
      estimateDate: todayISO(),
      status: "draft",
      beforePhotos: [],
      afterPhotos: job.photos || [],
      notes: "Thank you for the opportunity to provide this estimate. God bless.",
      sourceJobIds: [job.id],
      lineItems: [{ id: uid(), description: `${formatJobDate(job.date)} — ${propertyWithUnit(job)} — ${[...job.jobTypes, job.customWork].filter(Boolean).join(" / ") || "Labor"}`, qty: 1, rate: 0 }],
    };
    setEditingEstimate(estimate);
    setShowEstimateForm(true);
    setActiveTab("estimates");
  }

  function convertEstimateToInvoice(estimate: Estimate) {
    const invoice: Invoice = {
      id: uid(),
      invoiceNumber: nextInvoiceNumber(state.invoices),
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      property: estimate.property,
      propertyAddress: estimate.propertyAddress || getSavedPropertyAddress(estimate.property),
      unitNumber: estimate.unitNumber || "",
      invoiceDate: todayISO(),
      dueDate: addDaysISO(todayISO(), 14),
      status: "due",
      paidAmount: 0,
      beforePhotos: estimate.beforePhotos || [],
      afterPhotos: estimate.afterPhotos || [],
      notes: estimate.notes || "Thank you for your business. God bless.",
      sourceJobIds: estimate.sourceJobIds || [],
      lineItems: estimate.lineItems.map((item) => ({ ...item, id: uid() })),
    };
    setState((prev) => ({
      ...prev,
      invoices: [customerSafeInvoice(invoice), ...prev.invoices],
      estimates: (prev.estimates || []).map((row) => row.id === estimate.id ? { ...row, status: "converted", convertedInvoiceId: invoice.id } : row),
    }));
    setActiveTab("office");
  }

  function convertInvoiceToEstimate(invoice: Invoice) {
    const estimate: Estimate = {
      id: uid(),
      estimateNumber: nextEstimateNumber(state.estimates || []),
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      property: invoice.property,
      propertyAddress: invoice.propertyAddress || getSavedPropertyAddress(invoice.property),
      unitNumber: invoice.unitNumber || "",
      estimateDate: todayISO(),
      status: "draft",
      beforePhotos: invoice.beforePhotos || [],
      afterPhotos: invoice.afterPhotos || [],
      notes: invoice.notes || "Thank you for the opportunity to provide this estimate. God bless.",
      sourceJobIds: invoice.sourceJobIds || [],
      lineItems: invoice.lineItems.map((item) => ({ ...item, id: uid() })),
    };
    setEditingEstimate(estimate);
    setShowEstimateForm(true);
    setActiveTab("estimates");
  }

  function duplicateWorkOrder(job: JobEntry) {
    const duplicate: JobEntry = { ...job, id: uid(), date: todayISO(), paidAmount: 0, status: "unpaid", workStatus: "open", notes: `${job.notes || ""}${job.notes ? "\n" : ""}Duplicated from previous work order.`.trim(), photos: [] };
    addJob(duplicate);
    setActiveTab("field");
  }

  function deleteConfirmed() {
    if (!confirmDelete) return;
    setState((prev) => {
      if (confirmDelete.type === "employee") {
        return { ...prev, employees: prev.employees.filter((employee) => employee.id !== confirmDelete.id), jobs: prev.jobs.filter((job) => job.employeeId !== confirmDelete.id) };
      }
      if (confirmDelete.type === "job") return { ...prev, jobs: prev.jobs.filter((job) => job.id !== confirmDelete.id) };
      if (confirmDelete.type === "invoice") return { ...prev, invoices: prev.invoices.filter((item) => item.id !== confirmDelete.id) };
      if (confirmDelete.type === "estimate") return { ...prev, estimates: (prev.estimates || []).filter((item) => item.id !== confirmDelete.id) };
      if (confirmDelete.type === "assignment") return { ...prev, assignments: prev.assignments.filter((item) => item.id !== confirmDelete.id) };
      const nextProfiles = { ...(prev.propertyProfiles || {}) };
      delete nextProfiles[confirmDelete.id];
      savePropertyProfilesToStorage(nextProfiles);
      return { ...prev, properties: prev.properties.filter((property) => property !== confirmDelete.id), propertyProfiles: nextProfiles };
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
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
          estimates: Array.isArray(parsed.estimates) ? parsed.estimates : [],
          assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
          properties: Array.isArray(parsed.properties) ? parsed.properties : defaultProperties,
          propertyProfiles: { ...defaultPropertyProfiles, ...(parsed.propertyProfiles || {}), ...loadSavedPropertyProfiles() },
          jobTypeOptions: Array.isArray(parsed.jobTypeOptions) ? parsed.jobTypeOptions : defaultJobTypes,
          workItems: Array.isArray(parsed.workItems) ? parsed.workItems : defaultWorkItems,
        });
      } catch {
        alert("Could not import this file.");
      }
    };
    reader.readAsText(file);
  }

  function closeWeekAsPaid() {
    if (!confirmAction("Confirm: mark every work order in this selected week as paid?")) return;
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

        {activeTab === "dashboard" && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => setShowJobForm(true)} className="flex items-center justify-center gap-2 rounded-[1.15rem] border border-green-300/20 bg-gradient-to-r from-green-500 to-green-600 px-4 py-4 text-sm font-black text-white shadow-[0_20px_45px_rgba(34,197,94,0.24)] transition active:scale-[.99]">
                <Plus size={24} /> New Work Order
              </button>
              <button onClick={() => { setActiveTab("office"); setEditingInvoice(null); setShowInvoiceForm(true); }} className="flex items-center justify-center gap-2 rounded-[1.15rem] border border-blue-300/20 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4 text-sm font-black text-white shadow-[0_20px_45px_rgba(59,130,246,0.24)] transition active:scale-[.99]">
                <ReceiptText size={24} /> New Invoice
              </button>
            </div>
            <section className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">Operations Snapshot</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-zinc-300">
                <div className="rounded-xl bg-zinc-900/80 p-3">Open Work Orders<br /><span className="text-lg text-white">{workOrderTotals.total}</span></div>
                <div className="rounded-xl bg-zinc-900/80 p-3">Ready To Invoice<br /><span className="text-lg text-white">{totals.readyToInvoice}</span></div>
                <div className="rounded-xl bg-zinc-900/80 p-3">Draft Estimates<br /><span className="text-lg text-white">{totals.draftEstimates}</span></div>
                <div className="rounded-xl bg-zinc-900/80 p-3">Outstanding<br /><span className="text-lg text-white">{money(totals.invoiceOpen)}</span></div>
              </div>
            </section>
            <p className="mt-3 text-center text-xs font-semibold text-zinc-500">Payroll, work orders, estimates, invoices, photos, and messages in one app.</p>
          </>
        )}

        {(activeTab === "office" || activeTab === "invoices" || activeTab === "estimates" || activeTab === "reports") && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-zinc-300">Office Pipeline</h2>
              <p className="px-1 text-xs font-black text-green-400">✣ {week.start} to {week.end}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard label="Payroll Cost" value={money(totals.earned)} description="Worker Pay This Week" icon={<CircleDollarSign size={20} />} variant="earned" />
              <StatCard label="Paid Out" value={money(totals.paid)} description="Paid To Workers" icon={<ArrowDown size={20} />} variant="paid" />
              <StatCard label="Borrowed" value={money(totals.borrowed || 0)} description="Employee Advances" icon={<CreditCard size={20} />} variant="borrowed" />
              <StatCard label="Worker Owed" value={money(totals.owed)} description="Still Left To Pay" icon={<Minus size={20} />} variant="owed" />
            </div>

            <div className="mt-3 rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-xs font-semibold text-green-200">
              Office shows the money side: payroll cost, employee balances, invoices, and company charges. Work Orders stays clean for job entry and photos.
            </div>
          </>
        )}

        <div className="sticky top-[68px] z-20 -mx-4 mt-5 border-y border-white/10 bg-[#02070a]/90 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, property, work order, estimate, invoice..." className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-3 text-sm outline-none ring-amber-400/40 placeholder:text-zinc-500 focus:border-green-400/60 focus:ring-4" />
          </div>
          <p className="mt-2 text-xs text-zinc-500">{activeTab === "field" ? <><span className="font-black text-green-400">Work mode:</span> work orders, worker pay, units, turnover work, and photos.</> : activeTab === "office" || activeTab === "invoices" ? <><span className="font-black text-green-400">Office mode:</span> invoices, company charges, customer balances, and billing.</> : <>Historical work orders stay saved.</>}</p>
        </div>

        <main className="mt-5">
          {activeTab === "dashboard" && (
            <Dashboard employeeTotals={employeeTotals} filteredJobs={filteredJobs} employeesById={employeesById} workOrderTotals={workOrderTotals} totals={totals} onAddJob={() => setShowJobForm(true)} onGoEmployees={() => setActiveTab("employees")} onGoReports={() => setActiveTab("reports")} onGoWorkOrders={() => setActiveTab("field")} onGoInvoices={() => setActiveTab("office")} />
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

          {(activeTab === "field" || activeTab === "ops" || activeTab === "jobs") && (
            <section className="space-y-4">
              <SectionTop title="Work Orders" subtitle="One clean field area for every job: unit, assigned employee, photos, pay, message, and invoice creation.">
                <button onClick={() => setShowJobForm(true)} className="goldButton"><Plus size={18} /> New Work Order</button>
              </SectionTop>

              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-sm font-semibold text-blue-200">
                Phase 26: Estimates are active and Work Items can create new common job categories as your work changes.
              </div>

              <JobList jobs={filteredJobs} employees={state.employees} employeesById={employeesById} properties={state.properties} jobTypeOptions={state.workItems?.length ? state.workItems.filter((type) => type.active).map((type) => type.name) : state.jobTypeOptions} onDelete={(id) => setConfirmDelete({ type: "job", id })} onUpdate={updateJob} onCreateInvoice={createInvoiceFromJob} onCreateEstimate={createEstimateFromJob} onDuplicate={duplicateWorkOrder} />
            </section>
          )}

          {activeTab === "estimates" && (
            <section className="space-y-4">
              <SectionTop title="Estimates" subtitle="Create estimates and convert approved estimates into invoices.">
                <button onClick={() => { setEditingEstimate(null); setShowEstimateForm(true); }} className="goldButton"><Plus size={18} /> New Estimate</button>
              </SectionTop>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
                Estimates are for proposed work. When approved, convert the estimate into an invoice without retyping.
              </div>
              <EstimatesPanel estimates={filteredEstimates} onAdd={() => { setEditingEstimate(null); setShowEstimateForm(true); }} onEdit={(estimate) => { setEditingEstimate(estimate); setShowEstimateForm(true); }} onDelete={(id) => setConfirmDelete({ type: "estimate", id })} onUpdate={upsertEstimate} onConvertToInvoice={convertEstimateToInvoice} />
            </section>
          )}

          {(activeTab === "office" || activeTab === "invoices") && (
            <section className="space-y-4">
              <SectionTop title="Office" subtitle="Manage the complete office pipeline: Ready to Invoice, Invoiced, Outstanding, and Paid.">
                <button onClick={() => { setEditingInvoice(null); setShowInvoiceForm(true); }} className="goldButton"><Plus size={18} /> New Invoice</button>
              </SectionTop>
              <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm font-semibold text-green-200">
                Office is your billing side: what you charge the company is separate from what you pay the employee.
              </div>
              <InvoicesPanel invoices={filteredInvoices} jobs={state.jobs} weekJobs={weekJobs} onAdd={() => { setEditingInvoice(null); setShowInvoiceForm(true); }} onCreateFromWeek={createInvoiceFromWeekJobs} onCreateFromJob={createInvoiceFromJob} onEdit={(invoice) => { setEditingInvoice(invoice); setShowInvoiceForm(true); }} onDelete={(id) => setConfirmDelete({ type: "invoice", id })} onUpdate={upsertInvoice} onConvertToEstimate={convertInvoiceToEstimate} />
            </section>
          )}

          {activeTab === "properties" && (
            <section className="space-y-4">
              <SectionTop title="Property Profiles" subtitle="Save address, contact, phone, email, billing name, and notes for auto-fill.">
                <button onClick={() => { setEditingPropertyName(null); setShowPropertyForm(true); }} className="goldButton"><Building2 size={18} /> Add Property</button>
              </SectionTop>
              <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm font-semibold text-green-200">
                Tap <span className="font-black">Edit</span> on any property to add address, contact name, phone, email, billing contact, and notes.
              </div>
              <div className="grid gap-3">
                {state.properties.map((property) => {
                  const profile = getSavedPropertyProfile(property);
                  const contactLine = [profile.contactName, profile.email, profile.phone].filter(Boolean).join(" • ");
                  return (
                    <div key={property} className="blackCard p-4">
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-50">{property}</p>
                          <p className="mt-1 text-xs font-semibold text-zinc-400">{profile.address || "No address saved yet"}</p>
                          {contactLine ? <p className="mt-1 text-xs font-semibold text-green-300">{contactLine}</p> : <p className="mt-1 text-xs font-semibold text-zinc-600">No contact info saved yet</p>}
                          {profile.billingName && profile.billingName !== property && <p className="mt-1 text-xs font-semibold text-blue-300">Billing: {profile.billingName}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button onClick={() => { setEditingPropertyName(property); setShowPropertyForm(true); }} className="darkButton !p-3"><Pencil size={16} /></button>
                          <button onClick={() => setConfirmDelete({ type: "property", id: property })} className="iconDanger"><Trash2 size={17} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}


          {activeTab === "workItems" && (
            <section className="space-y-4">
              <SectionTop title="Work Items" subtitle="Create and manage common job types used inside New Work Order.">
                <button
                  onClick={() => {
                    const name = prompt("Enter new Work Item name:");
                    const cleanName = normalizePropertyName(name || "");
                    if (!cleanName) return;
                    setState((prev) => ({
                      ...prev,
                      jobTypeOptions: [...new Set([...(prev.jobTypeOptions || []), cleanName])],
                      workItems: [
                        ...((prev.workItems && prev.workItems.length ? prev.workItems : defaultWorkItems)),
                        { id: uid(), name: cleanName, defaultScope: "", defaultNotes: "", defaultPriority: "normal", active: true },
                      ],
                    }));
                  }}
                  className="goldButton"
                >
                  <Plus size={18} /> Add Work Item
                </button>
              </SectionTop>

              <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm font-semibold text-green-200">
                Work Items are your reusable job categories. Add new ones here as new common jobs come into play.
              </div>

              <div className="grid gap-3">
                {((state.workItems && state.workItems.length ? state.workItems : defaultWorkItems)).map((workType) => (
                  <div key={workType.id} className="blackCard p-4">
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-50">{workType.name}</p>
                        <p className="mt-1 text-xs font-semibold text-zinc-400">
                          Priority: {workType.defaultPriority === "urgent" ? "Urgent" : "Normal"} • {workType.active ? "Active" : "Inactive"}
                        </p>
                        {workType.defaultScope ? <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-500">{workType.defaultScope}</p> : <p className="mt-2 text-xs text-zinc-600">No default scope saved yet.</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => {
                            const nextName = prompt("Edit Work Item name:", workType.name);
                            const cleanName = normalizePropertyName(nextName || "");
                            if (!cleanName) return;
                            setState((prev) => ({
                              ...prev,
                              jobTypeOptions: [...new Set((prev.jobTypeOptions || []).map((name) => name === workType.name ? cleanName : name))],
                              workItems: ((prev.workItems && prev.workItems.length ? prev.workItems : defaultWorkItems)).map((item) => item.id === workType.id ? { ...item, name: cleanName } : item),
                            }));
                          }}
                          className="darkButton !p-3"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (!confirm("Delete this Work Item? Existing work orders will not be deleted.")) return;
                            setState((prev) => ({
                              ...prev,
                              jobTypeOptions: (prev.jobTypeOptions || []).filter((name) => name !== workType.name),
                              workItems: ((prev.workItems && prev.workItems.length ? prev.workItems : defaultWorkItems)).filter((item) => item.id !== workType.id),
                            }));
                          }}
                          className="iconDanger"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
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

      {showEstimateForm && (
        <EstimateModal estimate={editingEstimate} properties={state.properties} getAddressForProperty={getSavedPropertyAddress} getBillingNameForProperty={getSavedPropertyBillingName} getEmailForProperty={getSavedPropertyEmail} onClose={() => { setShowEstimateForm(false); setEditingEstimate(null); }} onSave={(estimate) => { upsertEstimate(estimate); setShowEstimateForm(false); setEditingEstimate(null); }} nextNumber={nextEstimateNumber(state.estimates || [])} />
      )}

      {showEmployeeForm && <EmployeeModal onClose={() => setShowEmployeeForm(false)} onSave={(employee) => { upsertEmployee(employee); setShowEmployeeForm(false); }} />}

      {showJobForm && (
        <JobModal employees={state.employees} properties={state.properties} jobTypeOptions={state.jobTypeOptions} getAddressForProperty={getSavedPropertyAddress} onAddProperty={(newProperty) => { const cleanProperty = newProperty.trim(); if (!cleanProperty) return; setState((prev) => ({ ...prev, properties: [...new Set([...prev.properties, cleanProperty])], propertyProfiles: { ...(prev.propertyProfiles || {}), [cleanProperty]: prev.propertyProfiles?.[cleanProperty] || getPropertyProfile(cleanProperty) } })); }} onClose={() => setShowJobForm(false)} onSave={(job, assignment) => { addJob(job); if (assignment) upsertAssignment(assignment); setShowJobForm(false); }} />
      )}

      {showAssignmentForm && (
        <AssignmentModal employees={state.employees} properties={state.properties} getAddressForProperty={getSavedPropertyAddress} initial={editingAssignment} onClose={() => { setShowAssignmentForm(false); setEditingAssignment(null); }} onSave={(assignment) => { if (assignment.property && assignment.address) savePropertyProfile(assignment.property, { ...getSavedPropertyProfile(assignment.property), address: assignment.address }, assignment.property); upsertAssignment(assignment); setShowAssignmentForm(false); setEditingAssignment(null); }} />
      )}

      {showPropertyForm && <PropertyModal initialName={editingPropertyName || ""} initialProfile={editingPropertyName ? getSavedPropertyProfile(editingPropertyName) : undefined} onClose={() => { setShowPropertyForm(false); setEditingPropertyName(null); }} onSave={(property, profile) => { savePropertyProfile(property, profile, editingPropertyName); setShowPropertyForm(false); setEditingPropertyName(null); }} />}

      {/* Phase 24A: Make Ready modal removed. All turnover/unit work now starts from New Work Order. */}

      {showInvoiceForm && (
        <InvoiceModal invoices={state.invoices} properties={state.properties} getProfileForProperty={getSavedPropertyProfile} initial={editingInvoice} onClose={() => { setShowInvoiceForm(false); setEditingInvoice(null); }} onSave={(invoice) => { upsertInvoice(invoice); setShowInvoiceForm(false); setEditingInvoice(null); }} />
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
    { tab: "field", label: "Work Orders", subtitle: "Jobs, turnover work, photos", icon: <BriefcaseBusiness size={20} /> },
    { tab: "office", label: "Office", subtitle: "Office Pipeline, charges, billing", icon: <ReceiptText size={20} /> },
    { tab: "employees", label: "Employees", subtitle: "Employees and balances", icon: <Users size={20} /> },
    { tab: "properties", label: "Properties", subtitle: "Property dropdown list", icon: <Building2 size={20} /> },
    { tab: "reports", label: "Reports", subtitle: "Payroll closeout", icon: <ClipboardList size={20} /> },
    { tab: "more", label: "Backup / More", subtitle: "Export, import, restore", icon: <MoreVertical size={20} /> },
  ];
  function goTo(tab: ActiveTab) { setActiveTab(tab); setMenuOpen(false); }
  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-[#02070a]/92 px-4 pb-3 pt-3 shadow-[0_12px_35px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open navigation menu" onClick={() => setMenuOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-100 shadow-lg transition active:scale-95"><span className="text-2xl leading-none">☰</span></button>
            <img src="/icon-192.png" alt="1 Stop Turnover Specialist logo" className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 bg-black object-cover shadow-[0_0_24px_rgba(34,197,94,0.18)]" />
            <div className="min-w-0"><h1 className="truncate text-lg font-black leading-tight">1 Stop Ops Pro</h1><p className="truncate text-xs font-semibold text-zinc-400">Home • Work • Office • Employees</p></div>
          </div>
          <div className="flex items-center gap-2 text-zinc-100"><button type="button" aria-label="Go to office" onClick={() => goTo("office")} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition active:scale-95"><ReceiptText size={21} /></button><button type="button" aria-label="Open more controls" onClick={() => goTo("more")} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition active:scale-95"><MoreVertical size={21} /></button></div>
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

function Dashboard({ employeeTotals, filteredJobs, employeesById, workOrderTotals, totals, onAddJob, onGoEmployees, onGoReports, onGoWorkOrders, onGoInvoices }: { employeeTotals: { employee: Employee; jobs: JobEntry[]; earned: number; paid: number; borrowed: number; owed: number }[]; filteredJobs: JobEntry[]; employeesById: Map<string, Employee>; workOrderTotals: { total: number; unpaid: number; paid: number; photos: number }; totals: { invoiceOpen: number }; onAddJob: () => void; onGoEmployees: () => void; onGoReports: () => void; onGoWorkOrders: () => void; onGoInvoices: () => void }) {
  // PHASE 24D: Dashboard sections collapsed by default to reduce scrolling on phones.
  const [openBalances, setOpenBalances] = useState(false);
  const [openWeekWork, setOpenWeekWork] = useState(false);
  const [openRecentActivity, setOpenRecentActivity] = useState(false);
  const [openInvoiceSummary, setOpenInvoiceSummary] = useState(false);

  const topOwed = [...employeeTotals].sort((a, b) => b.owed - a.owed).slice(0, 6);
  const openBalanceCount = topOwed.filter((row) => row.owed > 0).length;
  const totalEmployeeOwed = employeeTotals.reduce((sum, row) => sum + safeNumber(row.owed), 0);
  const recentJobs = filteredJobs.slice(0, 5);

  return (
    <section className="grid gap-4">
      <div className="space-y-4">
        <SectionTop title="Command Center" subtitle="Clean dashboard. Tap a section to open only what you need." />
        <div className="grid grid-cols-2 gap-3">
          <QuickTile onClick={onAddJob} icon={<Plus />} title="New Work" subtitle="Create order" />
          <QuickTile onClick={onGoWorkOrders} icon={<BriefcaseBusiness />} title="Work Orders" subtitle="All jobs in one place" />
          <QuickTile onClick={onGoInvoices} icon={<ReceiptText />} title="Office" subtitle={`${money(totals.invoiceOpen)} open`} />
          <QuickTile onClick={onGoEmployees} icon={<Users />} title="Employees" subtitle="Names + balances" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MiniMetric label="Orders" value={workOrderTotals.total} />
          <MiniMetric label="Unpaid" value={workOrderTotals.unpaid} danger={workOrderTotals.unpaid > 0} />
          <MiniMetric label="Paid" value={workOrderTotals.paid} />
          <MiniMetric label="Photos" value={workOrderTotals.photos} />
        </div>
      </div>

      <div className="blackCard overflow-hidden">
        <button type="button" onClick={() => setOpenInvoiceSummary(!openInvoiceSummary)} className="relative z-10 flex w-full items-center justify-between gap-3 p-4 text-left">
          <div>
            <h3 className="font-black">Invoice Summary</h3>
            <p className="text-xs font-semibold text-zinc-500">Outstanding Balance: <span className="font-black text-green-400">{money(totals.invoiceOpen)}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${totals.invoiceOpen > 0 ? "border-orange-400/30 bg-orange-500/10 text-orange-300" : "border-green-400/25 bg-green-500/10 text-green-300"}`}>{money(totals.invoiceOpen)}</span>
            {openInvoiceSummary ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>
        {openInvoiceSummary && (
          <div className="relative z-10 space-y-3 border-t border-white/10 p-3">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onGoInvoices} className="goldButton w-full"><ReceiptText size={18} /> Open Invoices</button>
              <button type="button" onClick={onGoReports} className="darkButton w-full"><FileText size={18} /> Reports</button>
            </div>
            <p className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-xs font-semibold text-green-200">Invoice tools stay in Office. Dashboard only shows the quick summary so the home page stays clean.</p>
          </div>
        )}
      </div>

      <div className="blackCard overflow-hidden">
        <button type="button" onClick={() => setOpenBalances(!openBalances)} className="relative z-10 flex w-full items-center justify-between gap-3 p-4 text-left">
          <div>
            <h3 className="font-black">Balances by Employee</h3>
            <p className="text-xs font-semibold text-zinc-500">{openBalanceCount} employee(s) with open balance • Total owed {money(totalEmployeeOwed)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">{openBalanceCount}</span>
            {openBalances ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>
        {openBalances && <div className="relative z-10 space-y-2 border-t border-white/10 p-3">{topOwed.map(({ employee, earned, paid, owed, borrowed }) => <button key={employee.id} type="button" onClick={onGoEmployees} className="w-full rounded-2xl border border-zinc-800 bg-black/30 p-3 text-left transition active:scale-[.99]"><div className="flex items-center justify-between gap-3"><p className="font-black">{employee.name}</p><p className={`${owed > 0 ? "text-red-300" : "text-green-400"} font-black`}>{money(owed)}</p></div><div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-zinc-400"><span>Earned {money(earned)}</span><span>Paid {money(paid)}</span><span>Borrowed {money(borrowed)}</span><span>Owed {money(owed)}</span></div></button>)}{topOwed.length === 0 && <EmptyText text="No employee payroll yet this week." />}</div>}
      </div>

      <div className="blackCard overflow-hidden">
        <button type="button" onClick={() => setOpenWeekWork(!openWeekWork)} className="relative z-10 flex w-full items-center justify-between gap-3 p-4 text-left">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-zinc-300">Work Orders This Week</h3>
            <p className="text-xs font-semibold text-zinc-500">{filteredJobs.length} job(s). Tap to open quick list.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="darkButton !px-3 !py-2 text-xs"><Filter size={14} /> Week</span>
            {openWeekWork ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>
        {openWeekWork && <div className="relative z-10 divide-y divide-white/10 border-t border-white/10">{filteredJobs.slice(0, 7).map((job) => <JobMini key={job.id} job={job} employee={employeesById.get(job.employeeId)} onClick={onGoWorkOrders} />)}{filteredJobs.length === 0 && <EmptyText text="No work orders found for this selected week." />}</div>}
      </div>

      <div className="blackCard overflow-hidden">
        <button type="button" onClick={() => setOpenRecentActivity(!openRecentActivity)} className="relative z-10 flex w-full items-center justify-between gap-3 p-4 text-left">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-zinc-300">Recent Activity</h3>
            <p className="text-xs font-semibold text-zinc-500">Latest {recentJobs.length} work order update(s). Tap to view.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">{recentJobs.length}</span>
            {openRecentActivity ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>
        {openRecentActivity && <div className="relative z-10 divide-y divide-white/10 border-t border-white/10">{recentJobs.map((job) => <JobMini key={`recent-${job.id}`} job={job} employee={employeesById.get(job.employeeId)} onClick={onGoWorkOrders} />)}{recentJobs.length === 0 && <EmptyText text="No recent activity for this selected week." />}</div>}
      </div>
    </section>
  );
}

function QuickTile({ onClick, icon, title, subtitle }: { onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) { return <button onClick={onClick} className="blackCard p-5 text-left transition active:scale-[.99]"><div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-green-500/10 text-green-400">{icon}</div><p className="relative z-10 mt-3 text-lg font-black">{title}</p><p className="relative z-10 text-xs text-zinc-500">{subtitle}</p></button>; }
function MiniMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <div className={`rounded-2xl border p-3 text-center ${danger ? "border-red-400/25 bg-red-500/10" : "border-white/10 bg-black/25"}`}><p className={`text-xl font-black ${danger ? "text-red-300" : "text-green-400"}`}>{value}</p><p className="text-[10px] font-black uppercase text-zinc-500">{label}</p></div>; }

function JobMini({ job, employee, onClick }: { job: JobEntry; employee?: Employee; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="relative z-10 block w-full p-3 text-left transition active:scale-[.99]"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.8)]" /><p className="truncate font-black">{propertyWithUnit(job)}</p></div><p className="ml-4 text-xs text-zinc-500">{employee?.name || "Unknown Employee"} • {formatJobDate(job.date)}</p></div><div className="shrink-0 text-right"><p className="font-black text-green-400">{money(job.pay)}</p><p className="text-[10px] font-black uppercase text-zinc-500">Tap to open</p></div></div></button>;
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

  return <div className="blackCard p-4"><div className="flex items-start justify-between gap-3"><button onClick={onToggle} className="flex flex-1 items-start gap-3 text-left"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-green-500/10 font-black text-green-400">{employee.name.slice(0, 1).toUpperCase()}</div><div><p className="text-lg font-black">{employee.name}</p><p className="text-xs text-zinc-500">{employee.phone || "No phone saved"}</p></div></button><button onClick={onToggle} className="rounded-xl border border-zinc-800 p-2 text-zinc-400">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></div><div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2"><span className="text-xs font-black uppercase text-zinc-500">Tap employee to open details</span><span className={`${owed > 0 ? "text-red-300" : "text-green-400"} text-sm font-black`}>{money(owed)} owed</span></div>{expanded && <div className="mt-4 grid grid-cols-4 gap-2 text-center"><BalancePill label="Earned" value={money(earned)} /><BalancePill label="Paid" value={money(paid)} /><BalancePill label="Borrowed" value={money(currentBorrowed)} /><BalancePill label="Owed" value={money(owed)} danger={owed > 0} /></div>}{expanded && <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">{editing ? <div className="space-y-3"><Operations label="Name"><input className="inputElite" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Operations><Operations label="Phone"><input className="inputElite" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Operations><Operations label="Default Rate"><MoneyInput value={draft.defaultRate} onValueChange={(value) => setDraft({ ...draft, defaultRate: value })} /></Operations><Operations label="Notes"><textarea className="inputElite min-h-20" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Operations><Operations label="Borrowed Advance"><MoneyInput value={getBorrowedForWeek(draft, weekStart)} onValueChange={(value) => setDraft(setBorrowedForWeek(draft, weekStart, value))} /></Operations><div className="flex gap-2"><button className="goldButton flex-1" onClick={() => { onSave(draft); setEditing(false); }}><Check size={18} /> Save</button><button className="darkButton" onClick={() => setEditing(false)}><X size={18} /></button></div></div> : <><p className="text-sm text-zinc-400">{employee.notes || "No employee notes saved."}</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => onMarkWeekPaid(employee.id)} className="goldButton w-full"><ShieldCheck size={18} /> Paid</button><button type="button" onClick={() => onMarkWeekUnpaid(employee.id)} className={owed <= 0 ? "darkButton w-full text-zinc-300" : "flex items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-3 text-sm font-black text-red-300"}><RotateCcw size={16} /> Unpay</button></div><div className="rounded-2xl border border-white/10 bg-black/30 p-3"><button type="button" onClick={() => setShowHistory(!showHistory)} className="flex w-full items-center justify-between gap-3 text-left"><span className="text-sm font-black text-green-400">Weekly Work History</span><span className="rounded-xl border border-white/10 bg-black/30 px-3 py-1 text-xs font-black text-zinc-400">{showHistory ? "Hide" : "Show"}</span></button>{showHistory && <div className="mt-3 space-y-3">{jobsByDay(totals?.jobs || []).map(({ day, jobs, total }) => <div key={day} className="rounded-2xl border border-zinc-800 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wider text-zinc-400">{day}</p><p className="text-xs font-black text-green-400">{jobs.length} {jobs.length === 1 ? "Job" : "Work Orders"} • {money(total)}</p></div>{jobs.length > 0 ? <div className="mt-2 space-y-2">{jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/5 bg-black/30 p-2"><p className="font-bold text-zinc-100">{propertyWithUnit(job)}</p><p className="text-xs text-zinc-400">{[...job.jobTypes, job.customWork].filter(Boolean).join(" • ") || "No work detail"}</p><p className="mt-1 text-sm font-black text-green-400">{money(job.pay)}</p></div>)}</div> : <p className="mt-2 text-xs text-zinc-500">No Work Orders</p>}</div>)}</div>}</div><Operations label="Borrowed Advance"><MoneyInput value={currentBorrowed} onValueChange={(value) => onSave(setBorrowedForWeek(employee, weekStart, value))} placeholder="Enter Amount" /></Operations><p className="text-xs font-semibold text-zinc-500">Cash advance borrowed before payday. It subtracts from the final owed amount.</p><div className="flex gap-2"><button className="darkButton flex-1" onClick={() => setEditing(true)}><MoreVertical size={18} /> Extra Info</button><button className="iconDanger" onClick={onDelete}><Trash2 size={18} /></button></div></>}</div>}</div>;
}

function BalancePill({ label, value, gold = false, danger = false }: { label: string; value: string; gold?: boolean; danger?: boolean }) { return <div className={`rounded-2xl border p-2 ${danger ? "border-red-400/30 bg-red-500/10" : gold ? "border-green-400/25 bg-green-500/10" : "border-zinc-800 bg-black/30"}`}><p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</p><p className={`text-sm font-black ${danger ? "text-red-300" : gold ? "text-green-400" : "text-zinc-100"}`}>{value}</p></div>; }



function formatAssignmentDate(dateISO: string) {
  if (!dateISO) return "No date";
  const date = new Date(`${dateISO}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(date);
}

function assignmentStatusLabel(status: AssignmentStatus) {
  if (status === "assigned") return "Assigned";
  if (status === "sent") return "Sent";
  if (status === "in-progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "approved") return "Approved";
  if (status === "ready-to-invoice") return "Ready To Invoice";
  return "Assigned";
}

function assignmentStatusClass(status: AssignmentStatus) {
  if (status === "ready-to-invoice") return "border-emerald-400/50 bg-emerald-500/15 text-emerald-300";
  if (status === "approved") return "border-green-400/50 bg-green-500/15 text-green-300";
  if (status === "completed") return "border-teal-400/50 bg-teal-500/15 text-teal-300";
  if (status === "in-progress") return "border-blue-400/40 bg-blue-500/10 text-blue-300";
  if (status === "sent") return "border-amber-400/40 bg-amber-500/10 text-amber-300";
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}


function buildWorkOrderMessage(job: JobEntry, employeeName: string, language: AssignmentLanguage = job.workLanguage || "both") {
  const assignment: WorkAssignment = {
    id: job.id,
    employeeId: job.employeeId,
    date: job.date,
    property: job.property,
    address: getPropertyAddress(job.property),
    unitNumber: job.unitNumber || "",
    priority: "normal",
    language,
    status: "assigned",
    scope: [...job.jobTypes, job.customWork].filter(Boolean).join("\n") || "Work details to be confirmed.",
    notes: job.notes || "",
    photos: job.photos || [],
    createdAt: new Date().toISOString(),
  };
  return buildAssignmentMessage(assignment, employeeName);
}

async function copyWorkOrderMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Work order message copied. You can paste it into text, WhatsApp, or email.");
  } catch {
    window.prompt("Copy this work order message:", text);
  }
}

function textWorkOrderMessage(text: string) {
  window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
}

function whatsappWorkOrderMessage(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function printWorkOrderDocument(job: JobEntry, employeeName: string, messageText?: string) {
  if (typeof window === "undefined") return;
  const text = messageText || buildWorkOrderMessage(job, employeeName);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Work Order - ${escapePrintHtml(job.property)}${job.unitNumber ? ` Unit ${escapePrintHtml(job.unitNumber)}` : ""}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: white; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .page { max-width: 820px; margin: 0 auto; padding: 28px; }
    .header { background: #020617; color: white; border-radius: 18px; padding: 22px; display: flex; justify-content: space-between; gap: 18px; }
    h1, h2, p { margin: 0; }
    .company { font-size: 24px; font-weight: 900; }
    .title { color: #22c55e; font-size: 28px; font-weight: 900; text-align: right; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 16px; background: #f8fafc; }
    .label { color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: .08em; font-weight: 900; margin-bottom: 4px; }
    .message { margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px; white-space: pre-wrap; line-height: 1.45; font-size: 14px; }
    .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; color: #64748b; font-size: 12px; display: flex; justify-content: space-between; }
    @page { margin: 0.45in; }
    @media print { .page { padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div>
        <h1 class="company">1 Stop Turnover Specialist LLC</h1>
        <p>Professional Work Order Assignment</p>
      </div>
      <div class="title">WORK ORDER</div>
    </section>
    <section class="meta">
      <div><p class="label">Assigned To</p><p><b>${escapePrintHtml(employeeName || "Employee")}</b></p></div>
      <div><p class="label">Date</p><p><b>${escapePrintHtml(formatJobDate(job.date))}</b></p></div>
      <div><p class="label">Property</p><p><b>${escapePrintHtml(job.property)}</b></p><p>${escapePrintHtml(getPropertyAddress(job.property))}</p></div>
      <div><p class="label">Unit</p><p><b>${escapePrintHtml(job.unitNumber || "N/A")}</b></p></div>
    </section>
    <section class="message">${escapePrintHtml(text)}</section>
    <section class="footer"><span>Thank you and God bless.</span><span>1 Stop Turnover Specialist LLC</span></section>
  </main>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body>
</html>`;
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    alert("Please allow pop-ups so the Work Order PDF preview can open.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function emailWorkOrderPdf(job: JobEntry, employeeName: string, messageText: string) {
  printWorkOrderDocument(job, employeeName, messageText);
  const subject = encodeURIComponent(`Work Order - ${job.property}${job.unitNumber ? ` Unit ${job.unitNumber}` : ""}`);
  const body = encodeURIComponent(`Hello,\n\nPlease see the attached PDF work order.\n\nThank you,\n1 Stop Turnover Specialist LLC`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function messageWorkOrderPdf(job: JobEntry, employeeName: string, messageText: string) {
  printWorkOrderDocument(job, employeeName, messageText);
  const text = encodeURIComponent(`Work Order for ${job.property}${job.unitNumber ? ` Unit ${job.unitNumber}` : ""}. Please see the attached PDF work order from 1 Stop Turnover Specialist LLC.`);
  window.location.href = `sms:?&body=${text}`;
}

function buildAssignmentMessage(assignment: WorkAssignment, employeeName: string) {
  const autoAddress = assignment.address || getPropertyAddress(assignment.property);
  const unitValue = assignment.unitNumber?.trim() || "";
  const divider = `━━━━━━━━━━━━━━━━━━━━`;

  const cleanScopeLines = assignment.scope
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `• ${line.replace(/^•\s*/, "")}`)
    .join("\n");

  const notes = assignment.notes.trim();

  const englishStatus =
    assignment.status === "ready-to-invoice" ? "Ready To Invoice" :
    assignment.status === "in-progress" ? "In Progress" :
    assignment.status === "completed" ? "Completed" :
    assignment.status === "approved" ? "Approved" :
    assignment.status === "sent" ? "Sent" :
    "Assigned";

  const spanishStatus =
    assignment.status === "ready-to-invoice" ? "Listo Para Facturar" :
    assignment.status === "in-progress" ? "En Proceso" :
    assignment.status === "completed" ? "Completado" :
    assignment.status === "approved" ? "Aprobado" :
    assignment.status === "sent" ? "Enviado" :
    "Asignado";

  function compactMessage(lines: Array<string | false | null | undefined>) {
    return lines
      .filter((line) => line !== false && line !== null && line !== undefined)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const english = compactMessage([
    `1 STOP TURNOVER SPECIALIST LLC`,
    `WORK ORDER ASSIGNMENT`,
    divider,
    `Hello ${employeeName || "Team"},`,
    `Please review the work order assignment below.`,
    ``,
    `📅 DATE: ${formatAssignmentDate(assignment.date)}`,
    ``,
    `📍 PROPERTY / ADDRESS`,
    assignment.property,
    autoAddress || false,
    ``,
    unitValue ? `🏠 UNIT: ${unitValue}` : false,
    ``,
    `🛠️ SCOPE OF WORK`,
    cleanScopeLines || "• Work details to be confirmed.",
    ``,
    assignment.priority === "urgent" ? `⚠️ PRIORITY: URGENT` : `✅ PRIORITY: Normal`,
    `📌 STATUS: ${englishStatus}`,
    ``,
    `📸 REQUIRED PHOTOS`,
    `• Before photos before starting`,
    `• After photos when completed`,
    notes ? `` : false,
    notes ? `📝 NOTES: ${notes}` : false,
    ``,
    `Please protect the unit, keep the work area clean, and report any additional damage or access issue immediately.`,
    ``,
    `Thank you and God bless.`,
    divider,
    `1 Stop Turnover Specialist LLC`,
  ]);

  const spanish = compactMessage([
    `1 STOP TURNOVER SPECIALIST LLC`,
    `ASIGNACIÓN DE TRABAJO`,
    divider,
    `Dios te bendiga ${employeeName || "Equipo"},`,
    `Favor de revisar la asignación de trabajo abajo.`,
    ``,
    `📅 FECHA: ${formatAssignmentDate(assignment.date)}`,
    ``,
    `📍 PROPIEDAD / DIRECCIÓN`,
    assignment.property,
    autoAddress || false,
    ``,
    unitValue ? `🏠 UNIDAD: ${unitValue}` : false,
    ``,
    `🛠️ TRABAJO A REALIZAR`,
    cleanScopeLines || "• Detalles del trabajo por confirmar.",
    ``,
    assignment.priority === "urgent" ? `⚠️ PRIORIDAD: URGENTE` : `✅ PRIORIDAD: Normal`,
    `📌 ESTATUS: ${spanishStatus}`,
    ``,
    `📸 FOTOS REQUERIDAS`,
    `• Fotos antes de comenzar`,
    `• Fotos después de terminar`,
    notes ? `` : false,
    notes ? `📝 NOTAS: ${notes}` : false,
    ``,
    `Favor de proteger la unidad, mantener el área limpia, y reportar cualquier daño adicional o problema de acceso inmediatamente.`,
    ``,
    `Gracias y Dios te bendiga.`,
    divider,
    `1 Stop Turnover Specialist LLC`,
  ]);

  if (assignment.language === "english") return english;
  if (assignment.language === "spanish") return spanish;
  return `${english}\n\n${divider}\n\n${spanish}`;
}

async function copyAssignmentMessage(assignment: WorkAssignment, employeeName: string) {
  const text = buildAssignmentMessage(assignment, employeeName);
  try {
    await navigator.clipboard.writeText(text);
    alert("Assignment copied. You can paste it into text, WhatsApp, or email.");
  } catch {
    window.prompt("Copy this assignment message:", text);
  }
}

function openAssignmentText(assignment: WorkAssignment, employee: Employee | undefined) {
  const body = encodeURIComponent(buildAssignmentMessage(assignment, employee?.name || ""));
  const phone = (employee?.phone || "").replace(/[^0-9+]/g, "");
  window.location.href = `sms:${phone ? phone : ""}?&body=${body}`;
}

function openAssignmentWhatsApp(assignment: WorkAssignment, employee: Employee | undefined) {
  const text = encodeURIComponent(buildAssignmentMessage(assignment, employee?.name || ""));
  const phone = (employee?.phone || "").replace(/[^0-9]/g, "");
  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
}

function AssignmentBoard({ assignments, employeesById, onAdd, onEdit, onDelete, onUpdate }: { assignments: WorkAssignment[]; employees: Employee[]; employeesById: Map<string, Employee>; onAdd: () => void; onEdit: (item: WorkAssignment) => void; onDelete: (id: string) => void; onUpdate: (item: WorkAssignment) => void }) {
  if (assignments.length === 0) return <div className="blackCard p-4"><EmptyText text="No separate assignments needed. Assign the employee inside the Work Order." /><button className="goldButton mt-2 w-full" onClick={onAdd}><Plus size={18} /> Work Message</button></div>;
  return <div className="grid gap-3">{assignments.map((assignment) => { const employee = employeesById.get(assignment.employeeId); const employeeName = employee?.name || "Employee"; return <div key={assignment.id} className="blackCard p-4"><div className="relative z-10"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-green-400">{assignment.priority === "urgent" ? "Urgent Assignment" : "Work Assignment"}</p><h3 className="mt-1 text-lg font-black">{assignment.property}{assignment.unitNumber ? ` — Unit ${assignment.unitNumber}` : ""}</h3><p className="mt-1 text-xs font-semibold text-zinc-500">{formatAssignmentDate(assignment.date)} • {employeeName}</p></div><span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${assignmentStatusClass(assignment.status)}`}>{assignmentStatusLabel(assignment.status)}</span></div><p className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-3 text-sm font-semibold text-zinc-300">{assignment.scope || "No scope added yet."}</p>{assignment.notes && <p className="mt-2 text-xs font-semibold text-zinc-500">Notes: {assignment.notes}</p>}<div className="mt-3 grid grid-cols-2 gap-2"><button className="goldButton" onClick={() => copyAssignmentMessage(assignment, employeeName)}><ClipboardList size={16} /> Copy</button><button className="darkButton" onClick={() => openAssignmentText(assignment, employee)}><FileText size={16} /> Text</button><button className="darkButton" onClick={() => openAssignmentWhatsApp(assignment, employee)}><Mail size={16} /> WhatsApp</button><button className="darkButton" onClick={() => onEdit(assignment)}><Pencil size={16} /> Edit</button></div><div className="mt-2 grid grid-cols-2 gap-2"><select className="inputElite" value={assignment.status} onChange={(e) => onUpdate({ ...assignment, status: e.target.value as AssignmentStatus })}><option value="assigned">Assigned</option><option value="sent">Sent</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="approved">Approved</option><option value="ready-to-invoice">Ready To Invoice</option></select><button className="iconDanger justify-center" onClick={() => onDelete(assignment.id)}><Trash2 size={16} /> Delete</button></div></div></div>; })}</div>;
}

function AssignmentModal({ employees, properties, getAddressForProperty, initial, onClose, onSave }: { employees: Employee[]; properties: string[]; getAddressForProperty: (property: string) => string; initial: WorkAssignment | null; onClose: () => void; onSave: (assignment: WorkAssignment) => void }) {
  const defaultProperty = properties[0] || "";
  const [selectedPreset, setSelectedPreset] = useState(initial?.scope ? "Custom" : "");
  const [assignment, setAssignment] = useState<WorkAssignment>(initial || { id: uid(), employeeId: employees[0]?.id || "", date: todayISO(), property: defaultProperty, address: getAddressForProperty(defaultProperty), unitNumber: "", priority: "normal", language: "spanish", status: "assigned", scope: "", notes: "", photos: [], createdAt: new Date().toISOString() });
  const employee = employees.find((item) => item.id === assignment.employeeId);
  const employeeName = employee?.name || "Employee";
  const preview = buildAssignmentMessage(assignment, employeeName);

  function applyPreset(label: string, language = assignment.language) {
    setSelectedPreset(label);
    setAssignment((prev) => ({ ...prev, scope: assignmentScopeFor(label, language) }));
  }

  function updateLanguage(language: AssignmentLanguage) {
    setAssignment((prev) => ({ ...prev, language, scope: selectedPreset && selectedPreset !== "Custom" ? assignmentScopeFor(selectedPreset, language) : prev.scope }));
  }

  return <Modal title={initial ? "Edit Assignment" : "Work Message"} onClose={onClose}><div className="space-y-3"><div className="grid grid-cols-2 gap-2"><Operations label="Employee"><select className="inputElite" value={assignment.employeeId} onChange={(e) => setAssignment({ ...assignment, employeeId: e.target.value })}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Operations><Operations label="Date"><input className="inputElite" type="date" value={assignment.date} onChange={(e) => setAssignment({ ...assignment, date: e.target.value })} /></Operations></div><Operations label="Property"><select className="inputElite" value={assignment.property} onChange={(e) => { const selected = e.target.value; setAssignment({ ...assignment, property: selected, address: getAddressForProperty(selected) }); }}>{properties.map((property) => <option key={property} value={property}>{property}</option>)}</select></Operations><Operations label="Address"><input className="inputElite" value={assignment.address} onChange={(e) => setAssignment({ ...assignment, address: e.target.value })} placeholder="460 Charles St, Providence RI" /></Operations><div className="grid grid-cols-2 gap-2"><Operations label="Unit"><input className="inputElite" value={assignment.unitNumber} onChange={(e) => setAssignment({ ...assignment, unitNumber: e.target.value })} placeholder="107" /></Operations><Operations label="Priority"><select className="inputElite" value={assignment.priority} onChange={(e) => setAssignment({ ...assignment, priority: e.target.value as WorkAssignment["priority"] })}><option value="normal">Normal</option><option value="urgent">Urgent</option></select></Operations></div><div className="grid grid-cols-2 gap-2"><Operations label="Language"><select className="inputElite" value={assignment.language} onChange={(e) => updateLanguage(e.target.value as AssignmentLanguage)}><option value="spanish">Español</option><option value="english">English</option><option value="both">Both</option></select></Operations><Operations label="Status"><select className="inputElite" value={assignment.status} onChange={(e) => setAssignment({ ...assignment, status: e.target.value as AssignmentStatus })}><option value="assigned">Assigned</option><option value="sent">Sent</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="approved">Approved</option><option value="ready-to-invoice">Ready To Invoice</option></select></Operations></div><Operations label="Select Job Assignment"><select className="inputElite" value={selectedPreset} onChange={(e) => applyPreset(e.target.value)}><option value="">Choose assignment type...</option>{assignmentPresets.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}</select></Operations><Operations label="Scope of Work"><textarea className="inputElite min-h-32" value={assignment.scope} onChange={(e) => { setSelectedPreset("Custom"); setAssignment({ ...assignment, scope: e.target.value }); }} placeholder="Blank until you choose a job assignment or type your custom scope." /></Operations><Operations label="Notes"><textarea className="inputElite min-h-20" value={assignment.notes} onChange={(e) => setAssignment({ ...assignment, notes: e.target.value })} placeholder="Optional notes for employee" /></Operations><div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3"><p className="mb-2 text-xs font-black uppercase text-green-400">Message Preview</p><pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 text-xs font-semibold text-zinc-200">{preview}</pre></div><div className="grid grid-cols-2 gap-2"><button className="goldButton" onClick={() => onSave({ ...assignment, address: assignment.address.trim() || getAddressForProperty(assignment.property), createdAt: assignment.createdAt || new Date().toISOString() })}><Check size={18} /> Save</button><button className="darkButton" onClick={() => copyAssignmentMessage(assignment, employeeName)}><ClipboardList size={18} /> Copy</button><button className="darkButton" onClick={() => openAssignmentText(assignment, employee)}><FileText size={18} /> Send Text</button><button className="darkButton" onClick={() => openAssignmentWhatsApp(assignment, employee)}><Mail size={18} /> WhatsApp</button></div></div></Modal>;
}


function getWorkOrderStatus(job: JobEntry): WorkOrderStatus {
  if (job.workStatus) return job.workStatus;
  if (job.status === "paid") return "completed";
  if (job.workMessage) return "assigned";
  return "open";
}

function workOrderStatusLabel(status: WorkOrderStatus) {
  if (status === "open") return "OPEN";
  if (status === "assigned") return "ASSIGNED";
  if (status === "in-progress") return "IN PROGRESS";
  if (status === "completed") return "COMPLETED";
  return "READY TO INVOICE";
}

function workOrderStatusBadge(status: WorkOrderStatus) {
  if (status === "open") return "border-zinc-700 bg-zinc-900/70 text-zinc-300";
  if (status === "assigned") return "border-yellow-400/40 bg-yellow-500/10 text-yellow-300";
  if (status === "in-progress") return "border-blue-400/40 bg-blue-500/10 text-blue-300";
  if (status === "completed") return "border-green-400/40 bg-green-500/10 text-green-300";
  return "border-purple-400/40 bg-purple-500/10 text-purple-300";
}

function JobList({ jobs, employees, employeesById, properties, jobTypeOptions, onDelete, onUpdate, onCreateInvoice }: { jobs: JobEntry[]; employees: Employee[]; employeesById: Map<string, Employee>; properties: string[]; jobTypeOptions: string[]; onDelete: (id: string) => void; onUpdate: (job: JobEntry) => void; onCreateInvoice: (job: JobEntry) => void }) {
  const [openList, setOpenList] = useState(true);
  const [filter, setFilter] = useState<"all" | WorkOrderStatus>("all");
  const totalPay = jobs.reduce((sum, job) => sum + safeNumber(job.pay), 0);
  const counts = {
    all: jobs.length,
    open: jobs.filter((job) => getWorkOrderStatus(job) === "open").length,
    assigned: jobs.filter((job) => getWorkOrderStatus(job) === "assigned").length,
    "in-progress": jobs.filter((job) => getWorkOrderStatus(job) === "in-progress").length,
    completed: jobs.filter((job) => getWorkOrderStatus(job) === "completed").length,
    "ready-to-invoice": jobs.filter((job) => getWorkOrderStatus(job) === "ready-to-invoice").length,
  };
  const visibleJobs = filter === "all" ? jobs : jobs.filter((job) => getWorkOrderStatus(job) === filter);

  return <section className="blackCard overflow-hidden"><button type="button" onClick={() => setOpenList(!openList)} className="relative z-10 flex w-full items-center justify-between gap-3 p-4 text-left"><div><h3 className="font-black">Work Orders</h3><p className="text-xs font-semibold text-zinc-500">{jobs.length} job(s) • {money(totalPay)} employee pay</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-green-400/25 bg-green-500/10 px-3 py-1 text-xs font-black text-green-300">Tap</span>{openList ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div></button>{openList && <div className="relative z-10 space-y-3 border-t border-white/10 p-3"><div className="grid grid-cols-2 gap-2"><FilterChip label={`All ${counts.all}`} active={filter === "all"} onClick={() => setFilter("all")} /><FilterChip label={`Open ${counts.open}`} active={filter === "open"} onClick={() => setFilter("open")} /><FilterChip label={`Assigned ${counts.assigned}`} active={filter === "assigned"} onClick={() => setFilter("assigned")} /><FilterChip label={`In Progress ${counts["in-progress"]}`} active={filter === "in-progress"} onClick={() => setFilter("in-progress")} /><FilterChip label={`Completed ${counts.completed}`} active={filter === "completed"} onClick={() => setFilter("completed")} /><FilterChip label={`Ready Invoice ${counts["ready-to-invoice"]}`} active={filter === "ready-to-invoice"} onClick={() => setFilter("ready-to-invoice")} /></div>{visibleJobs.map((job) => <JobRow key={job.id} job={job} employees={employees} employee={employeesById.get(job.employeeId)} properties={properties} jobTypeOptions={jobTypeOptions} onDelete={() => onDelete(job.id)} onUpdate={onUpdate} onCreateInvoice={() => onCreateInvoice(job)} />)}{visibleJobs.length === 0 && <div className="p-3"><EmptyText text={filter === "all" ? "No work orders found for this selected week." : `No ${String(filter).replace("-", " ")} work orders for this selected week.`} /></div>}</div>}</section>;
}

function FilterChip({ label, active, danger, onClick }: { label: string; active: boolean; danger?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`${active ? "border-green-400/40 bg-green-500/15 text-green-300" : danger ? "border-red-400/30 bg-red-500/10 text-red-300" : "border-zinc-800 bg-black/30 text-zinc-400"} rounded-2xl border px-3 py-2 text-xs font-black transition active:scale-[.98]`}>{label}</button>;
}

function JobRow({ job, employees, employee, properties, jobTypeOptions, onDelete, onUpdate, onCreateInvoice }: { job: JobEntry; employees: Employee[]; employee?: Employee; properties: string[]; jobTypeOptions: string[]; onDelete: () => void; onUpdate: (job: JobEntry) => void; onCreateInvoice: () => void }) {
  const [open, setOpen] = useState(false);
  const owed = Math.max(safeNumber(job.pay) - safeNumber(job.paidAmount), 0);
  const isFullyPaid = owed <= 0 || job.status === "paid";
  const normalizedStatus: JobEntry["status"] = owed <= 0 ? "paid" : job.status === "partial" ? "partial" : "unpaid";
  const pipelineStatus = getWorkOrderStatus(job);
  function toggleType(type: string) { const next = job.jobTypes.includes(type) ? job.jobTypes.filter((item) => item !== type) : [...job.jobTypes, type]; onUpdate({ ...job, jobTypes: next }); }
  function confirmJobPaid() { const ok = confirmAction(`Confirm Payment

Employee: ${employee?.name || "Unknown Employee"}
Property: ${propertyWithUnit(job)}
Amount: ${money(job.pay)}

Only confirm if payment was actually made.`); if (!ok) return; onUpdate({ ...job, paidAmount: job.pay, status: "paid", workStatus: "completed" }); }
  function confirmJobUnpaid() { const ok = confirmAction(`Warning: Revert Payment

Mark this job as UNPAID?

Employee: ${employee?.name || "Unknown Employee"}
Property: ${propertyWithUnit(job)}
Amount returning to owed: ${money(job.pay)}

This will move the amount back into owed balance.`); if (!ok) return; onUpdate({ ...job, paidAmount: 0, status: "unpaid", workStatus: job.workStatus === "completed" ? "open" : job.workStatus }); }
  async function addPhotos(files: FileList | null) { const newPhotos = await readPhotoFiles(files); if (newPhotos.length) onUpdate({ ...job, photos: [...(job.photos || []), ...newPhotos] }); }
  const currentLanguage: AssignmentLanguage = job.workLanguage || "both";
  const generatedWorkMessage = buildWorkOrderMessage(job, employee?.name || "Employee", currentLanguage);
  const currentWorkMessage = job.workMessage || generatedWorkMessage;
  function changeWorkMessageLanguage(language: AssignmentLanguage) {
    onUpdate({ ...job, workLanguage: language, workMessage: buildWorkOrderMessage({ ...job, workLanguage: language }, employee?.name || "Employee", language) });
  }
  function resetWorkMessage() {
    onUpdate({ ...job, workMessage: generatedWorkMessage });
  }

  return <div className="blackCard p-3"><button onClick={() => setOpen(!open)} className="w-full text-left"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-black">{employee?.name || "Unknown Employee"}</p><p className="truncate text-xs text-zinc-500">{formatJobDate(job.date)} • {propertyWithUnit(job)}</p></div><div className="shrink-0 text-right"><p className="font-black text-green-400">{money(job.pay)}</p><p className={`${owed > 0 ? "text-red-300" : "text-green-300"} text-xs font-black`}>Owed {money(owed)}</p></div></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${workOrderStatusBadge(pipelineStatus)}`}>{workOrderStatusLabel(pipelineStatus)}</span><span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${jobStatusColor(normalizedStatus, owed)}`}>{owed <= 0 ? "PAID" : job.status === "partial" ? "PARTIAL" : "UNPAID"}</span></div><span className="text-[10px] font-black uppercase text-zinc-500">{open ? "Close" : "Tap to open"}</span></div></button><div className="mt-3 grid grid-cols-2 gap-2"><button className="goldButton !py-2 text-sm" onClick={() => setOpen(true)}><FileText size={16} /> Message</button><button className="darkButton !py-2 text-sm" onClick={() => setOpen(!open)}><Pencil size={16} /> Edit</button><button className="goldButton !py-2 text-sm" onClick={onCreateInvoice}><ReceiptText size={16} /> Invoice</button><button className={`${isFullyPaid ? "goldButton shadow-[0_0_28px_rgba(34,197,94,0.45)]" : "darkButton"} !py-2 text-sm`} onClick={confirmJobPaid}><Check size={16} /> {isFullyPaid ? "Paid ✓" : "Paid"}</button><button className={`${isFullyPaid ? "darkButton text-zinc-300" : "flex items-center justify-center gap-1 rounded-2xl border border-red-400/30 bg-red-500/10 px-2 py-2 text-sm font-black text-red-300"} col-span-2`} onClick={confirmJobUnpaid}><RotateCcw size={15} /> Unpay</button></div>{open && <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4"><Operations label="Work Order Status"><select className="inputElite" value={pipelineStatus} onChange={(e) => onUpdate({ ...job, workStatus: e.target.value as WorkOrderStatus })}><option value="open">Open</option><option value="assigned">Assigned</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="ready-to-invoice">Ready To Invoice</option></select></Operations><div className="grid grid-cols-2 gap-2"><Operations label="Employee"><select className="inputElite" value={job.employeeId} onChange={(e) => onUpdate({ ...job, employeeId: e.target.value })}>{employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Operations><Operations label={`Date — ${formatJobDate(job.date)}`}><input className="inputElite cursor-pointer" type="date" value={job.date} onClick={(e) => e.currentTarget.showPicker?.()} onFocus={(e) => e.currentTarget.showPicker?.()} onChange={(e) => onUpdate({ ...job, date: e.target.value })} /></Operations><Operations label="Property"><select className="inputElite" value={job.property} onChange={(e) => onUpdate({ ...job, property: e.target.value })}>{properties.map((property) => <option key={property} value={property}>{property}</option>)}</select></Operations><Operations label="Unit #"><input className="inputElite" value={job.unitNumber || ""} onChange={(e) => onUpdate({ ...job, unitNumber: e.target.value })} placeholder="Example: 204" /></Operations><Operations label="Pay"><MoneyInput value={job.pay} onValueChange={(value) => onUpdate({ ...job, pay: value, status: statusFrom(value, job.paidAmount) })} placeholder="Enter Amount" /></Operations><Operations label="Paid"><MoneyInput value={job.paidAmount} onValueChange={(value) => { if (value >= job.pay && job.pay > 0 && !confirmAction(`Confirm Payment

Mark this job paid?

Amount: ${money(value)}`)) return; onUpdate({ ...job, paidAmount: value, status: statusFrom(job.pay, value) }); }} placeholder="Enter Amount" /></Operations></div><Operations label="Work Item"><div className="grid grid-cols-2 gap-2">{jobTypeOptions.map((type) => <button type="button" key={type} onClick={() => toggleType(type)} className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${job.jobTypes.includes(type) ? "border-green-400/50 bg-green-500/20 text-green-300" : "border-zinc-800 bg-black/30 text-zinc-400"}`}>{job.jobTypes.includes(type) ? "✓ " : ""}{type}</button>)}</div></Operations><Operations label="Custom Work"><input className="inputElite" value={job.customWork} onChange={(e) => onUpdate({ ...job, customWork: e.target.value })} placeholder="Edit custom work description..." /></Operations><Operations label="Communication Center"><div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-green-400">Work Order Message</p><p className="mt-1 text-xs font-semibold text-zinc-400">View, edit, translate, print, email, text, WhatsApp, or copy from inside this Work Order.</p></div><button type="button" className="goldButton !py-2 text-xs" onClick={() => printWorkOrderDocument({ ...job, workLanguage: currentLanguage }, employee?.name || "Employee", currentWorkMessage)}>Preview PDF</button></div><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => changeWorkMessageLanguage("english")} className={`${currentLanguage === "english" ? "goldButton" : "darkButton"} !py-2 text-xs`}>English</button><button type="button" onClick={() => changeWorkMessageLanguage("spanish")} className={`${currentLanguage === "spanish" ? "goldButton" : "darkButton"} !py-2 text-xs`}>Español</button><button type="button" onClick={() => changeWorkMessageLanguage("both")} className={`${currentLanguage === "both" ? "goldButton" : "darkButton"} !py-2 text-xs`}>Both</button></div><textarea className="inputElite mt-3 min-h-64 text-xs" value={currentWorkMessage} onChange={(e) => onUpdate({ ...job, workMessage: e.target.value })} /><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="goldButton !py-2 text-xs" onClick={() => printWorkOrderDocument({ ...job, workLanguage: currentLanguage }, employee?.name || "Employee", currentWorkMessage)}>Print / Save PDF</button><button type="button" className="darkButton !py-2 text-xs" onClick={resetWorkMessage}>Regenerate</button><button type="button" className="darkButton !py-2 text-xs" onClick={() => copyWorkOrderMessage(currentWorkMessage)}>Copy Message</button><button type="button" className="darkButton !py-2 text-xs" onClick={() => textWorkOrderMessage(currentWorkMessage)}>Text Message</button><button type="button" className="darkButton !py-2 text-xs" onClick={() => whatsappWorkOrderMessage(currentWorkMessage)}>WhatsApp</button><button type="button" className="goldButton !py-2 text-xs" onClick={() => emailWorkOrderPdf({ ...job, workLanguage: currentLanguage }, employee?.name || "Employee", currentWorkMessage)}>Email PDF</button><button type="button" className="goldButton !py-2 text-xs" onClick={() => messageWorkOrderPdf({ ...job, workLanguage: currentLanguage }, employee?.name || "Employee", currentWorkMessage)}>Message PDF</button></div><p className="mt-3 text-[11px] font-semibold leading-relaxed text-zinc-400">PDF opens first so you can save, print, or share the clean work order file from your phone/computer.</p></div></Operations><Operations label="Job Photos"><div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-4"><div className="grid grid-cols-2 gap-2"><label className="goldButton w-full cursor-pointer"><Camera size={18} /> Take Photo<input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={async (e) => { await addPhotos(e.target.files); e.currentTarget.value = ""; }} /></label><label className="darkButton w-full cursor-pointer"><ImageIcon size={18} /> Upload<input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { await addPhotos(e.target.files); e.currentTarget.value = ""; }} /></label></div>{(job.photos || []).length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3">{(job.photos || []).map((photo, index) => <div key={`${job.id}-photo-${index}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40"><img src={photo} alt={`Job photo ${index + 1}`} className="h-32 w-full object-cover" /><button type="button" className="absolute right-2 top-2 rounded-full border border-red-400/30 bg-black/70 p-2 text-red-200" onClick={() => { const ok = window.confirm("Remove this photo from the job?"); if (!ok) return; onUpdate({ ...job, photos: (job.photos || []).filter((_, photoIndex) => photoIndex !== index) }); }}><Trash2 size={15} /></button></div>)}</div> : <p className="mt-3 text-center text-sm font-semibold text-zinc-500">No photos attached yet.</p>}</div></Operations><Operations label="Notes"><textarea className="inputElite min-h-28" value={job.notes} onChange={(e) => onUpdate({ ...job, notes: e.target.value })} placeholder="Edit notes for this saved job..." /></Operations><div className="flex items-center justify-between gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-black ${jobStatusColor(normalizedStatus, owed)}`}>{normalizedStatus.toUpperCase()}</span><button className="iconDanger" onClick={onDelete}><Trash2 size={18} /></button></div></div>}</div>;
}

function InvoicesPanel({ invoices, jobs, weekJobs, onAdd, onCreateFromWeek, onCreateFromJob, onEdit, onDelete, onUpdate }: { invoices: Invoice[]; jobs: JobEntry[]; weekJobs: JobEntry[]; onAdd: () => void; onCreateFromWeek: () => void; onCreateFromJob: (job: JobEntry) => void; onEdit: (invoice: Invoice) => void; onDelete: (id: string) => void; onUpdate: (invoice: Invoice) => void }) {
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "due" | "sent" | "paid" | "overdue">("all");
  const invoiceIsPaid = (invoice: Invoice) => invoiceStatusIsPaid(invoice);
  const invoiceIsOverdue = (invoice: Invoice) => !invoiceIsPaid(invoice) && (invoice.status === "overdue" || (!!invoice.dueDate && invoice.dueDate < todayISO()));
  const dueInvoices = invoices.filter((invoice) => !invoiceIsPaid(invoice) && !invoiceIsOverdue(invoice) && invoice.status === "due");
  const sentInvoices = invoices.filter((invoice) => !invoiceIsPaid(invoice) && !invoiceIsOverdue(invoice) && invoice.status === "sent");
  const paidInvoices = invoices.filter((invoice) => invoiceIsPaid(invoice));
  const overdueInvoices = invoices.filter((invoice) => invoiceIsOverdue(invoice));
  const visibleInvoices = invoiceFilter === "paid" ? paidInvoices : invoiceFilter === "due" ? dueInvoices : invoiceFilter === "sent" ? sentInvoices : invoiceFilter === "overdue" ? overdueInvoices : invoices;
  const outstandingBalance = invoices.reduce((sum, invoice) => sum + Math.max(invoiceTotal(invoice) - safeNumber(invoice.paidAmount), 0), 0);
  const dueBalance = dueInvoices.reduce((sum, invoice) => sum + Math.max(invoiceTotal(invoice) - safeNumber(invoice.paidAmount), 0), 0);
  const overdueBalance = overdueInvoices.reduce((sum, invoice) => sum + Math.max(invoiceTotal(invoice) - safeNumber(invoice.paidAmount), 0), 0);
  const paidTotal = paidInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);

  const filterButtons = [
    { id: "all" as const, label: "All", count: invoices.length },
    { id: "due" as const, label: "Due", count: dueInvoices.length },
    { id: "sent" as const, label: "Sent", count: sentInvoices.length },
    { id: "paid" as const, label: "Paid", count: paidInvoices.length },
    { id: "overdue" as const, label: "Overdue", count: overdueInvoices.length },
  ];

  return (
    <section className="space-y-4">
      <SectionTop title="Invoice Center" subtitle="Phase 24C: filter invoices by All, Due, Sent, Paid, or Overdue and manage PDF, email, text, and payments from one place.">
        <div className="flex flex-col gap-2">
          <button onClick={onAdd} className="goldButton"><Plus size={18} /> New Invoice</button>
          <button onClick={onCreateFromWeek} className="darkButton"><Sparkles size={16} /> Invoice This Week</button>
        </div>
      </SectionTop>

      <div className="rounded-[1.3rem] border border-red-400/25 bg-gradient-to-br from-red-500/15 to-orange-500/10 p-4 shadow-[0_0_28px_rgba(239,68,68,0.10)]">
        <p className="text-[10px] font-black uppercase tracking-wide text-red-200">Outstanding Balance</p>
        <p className="mt-1 text-3xl font-black text-white">{money(outstandingBalance)}</p>
        <p className="mt-1 text-xs font-semibold text-zinc-400">Total still open across due, sent, and overdue invoices.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniMetric label="Due" value={dueInvoices.length} />
        <MiniMetric label="Sent" value={sentInvoices.length} />
        <MiniMetric label="Paid" value={paidInvoices.length} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-center"><p className="text-sm font-black text-amber-200">{money(dueBalance)}</p><p className="text-[10px] font-black uppercase text-zinc-500">Due</p></div>
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-center"><p className="text-sm font-black text-red-200">{money(overdueBalance)}</p><p className="text-[10px] font-black uppercase text-zinc-500">Overdue</p></div>
        <div className="rounded-2xl border border-green-400/25 bg-green-500/10 p-3 text-center"><p className="text-sm font-black text-green-200">{money(paidTotal)}</p><p className="text-[10px] font-black uppercase text-zinc-500">Paid Total</p></div>
      </div>

      <div className="grid grid-cols-5 gap-1 rounded-[1.2rem] border border-white/10 bg-black/30 p-1">
        {filterButtons.map((button) => (
          <button
            key={button.id}
            type="button"
            onClick={() => setInvoiceFilter(button.id)}
            className={`rounded-2xl px-1 py-3 text-[11px] font-black transition ${invoiceFilter === button.id ? "bg-green-500 text-black shadow-[0_10px_25px_rgba(34,197,94,0.22)]" : "text-zinc-400"}`}
          >
            <span className="block">{button.label}</span>
            <span className="mt-1 block text-[10px] font-black opacity-75">{button.count}</span>
          </button>
        ))}
      </div>

      {weekJobs.length > 0 && <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm font-semibold text-green-200">Selected week has {weekJobs.length} jobs ready to invoice. Enter the company charge amount separately from employee pay.</div>}

      {weekJobs.length > 0 && (
        <details className="blackCard p-4">
          <summary className="cursor-pointer list-none font-black">Ready To Invoice <span className="text-xs font-semibold text-zinc-500">— tap to open</span></summary>
          <p className="mt-2 text-xs font-semibold text-zinc-500">Tap a job to open the full Invoice Center. No pop-up. Enter the company charge, preview the PDF, then email/text/print from that invoice screen.</p>
          <div className="mt-3 space-y-2">
            {weekJobs.map((job) => (
              <div key={`ready-invoice-${job.id}`} className="rounded-2xl border border-zinc-800 bg-black/30 p-3">
                <p className="font-black text-zinc-100">{propertyWithUnit(job)}</p>
                <p className="text-xs text-zinc-500">{formatJobDate(job.date)} • {[...job.jobTypes, job.customWork].filter(Boolean).join(" / ") || "Labor"}</p>
                <button type="button" className="goldButton mt-3 w-full" onClick={() => onCreateFromJob(job)}><ReceiptText size={16} /> Open Invoice Center</button>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="space-y-3">
        {visibleInvoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} jobs={jobs} onEdit={() => onEdit(invoice)} onDelete={() => onDelete(invoice.id)} onUpdate={onUpdate} />)}
        {visibleInvoices.length === 0 && <div className="blackCard p-6"><EmptyText text={invoiceFilter === "paid" ? "No paid invoices yet." : invoiceFilter === "overdue" ? "No overdue invoices right now." : invoiceFilter === "sent" ? "No sent invoices yet." : invoiceFilter === "due" ? "No due invoices right now." : "No invoices yet. Create one manually or from this week’s jobs."} /></div>}
      </div>
    </section>
  );
}

function InvoiceCard({ invoice, jobs, onEdit, onDelete, onUpdate }: { invoice: Invoice; jobs: JobEntry[]; onEdit: () => void; onDelete: () => void; onUpdate: (invoice: Invoice) => void }) {
  const [preview, setPreview] = useState(false);
  const total = invoiceTotal(invoice);
  const open = Math.max(total - invoice.paidAmount, 0);
  const isPaid = invoice.status === "paid" && total > 0 && safeNumber(invoice.paidAmount) >= total;
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
        <button className="darkButton" onClick={() => setPreview(!preview)}><Eye size={16} /> {preview ? "Hide Preview" : "Preview PDF"}</button>
        <button className={`${isPaid ? "goldButton shadow-[0_0_28px_rgba(34,197,94,0.45)]" : "darkButton"}`} onClick={confirmMarkPaid}><Check size={16} /> {isPaid ? "Paid ✓" : "Mark Paid"}</button>
        <button className="darkButton" onClick={() => { setPreview(true); printInvoiceDocument(invoice, beforePhotos, afterPhotos); }}><Printer size={16} /> Open PDF</button>
        <button className="goldButton" onClick={() => { setPreview(true); openInvoiceEmail(invoice); }}><Mail size={16} /> Email PDF</button>
        <button className="darkButton" onClick={() => { setPreview(true); openInvoiceMessage(invoice); }}><FileText size={16} /> Message PDF</button>
        <button className="iconDanger" onClick={onDelete}><Trash2 size={18} /> Delete</button>
      </div>

      {preview && (
        <InvoicePreview invoice={invoice} total={total} open={open} beforePhotos={beforePhotos} afterPhotos={afterPhotos} onMarkPaid={confirmMarkPaid} />
      )}
    </div>
  );
}

function InvoicePreview({ invoice, total, open, beforePhotos, afterPhotos, onMarkPaid }: { invoice: Invoice; total: number; open: number; beforePhotos: string[]; afterPhotos: string[]; onMarkPaid: () => void }) {
  const isPaid = invoice.status === "paid" && total > 0 && safeNumber(invoice.paidAmount) >= total;
  return (
    <div className="printArea mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white text-black shadow-2xl">
      <div className="bg-zinc-950 p-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="1 Stop Turnover Specialist LLC logo" className="h-16 w-16 rounded-2xl border border-white/15 bg-black object-cover" />
            <div>
              <h2 className="text-xl font-black leading-tight">1 Stop Turnover Specialist LLC</h2>
              <p className="text-xs font-semibold text-zinc-400">Turnover • Painting • Repairs • Work Orders</p>
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

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-5 text-sm">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Authorized Signature</p>
            <div className="mt-8 border-b border-zinc-400" />
            <p className="mt-1 text-xs text-zinc-500">1 Stop Turnover Specialist LLC</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Client Approval</p>
            <div className="mt-8 border-b border-zinc-400" />
            <p className="mt-1 text-xs text-zinc-500">Name / Date</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center text-xs text-zinc-500">
          Thank you for your business. God bless. • Your 1 Stop for building repairs, painting, and turnover work turnovers.
        </div>
      </div>

      <div className="noPrint border-t border-zinc-200 bg-zinc-100 p-3"><p className="mb-2 text-center text-xs font-bold text-zinc-600">Review this invoice before sending. Use Print / Save PDF when it looks correct.</p><div className="grid grid-cols-2 gap-2">
        <button className="goldButton" onClick={() => printInvoiceDocument(invoice, beforePhotos, afterPhotos)}><Printer size={16} /> Print / Save PDF</button>
        <button className={`${isPaid ? "goldButton shadow-[0_0_28px_rgba(34,197,94,0.45)]" : "darkButton"}`} onClick={onMarkPaid}><Check size={16} /> {isPaid ? "Paid ✓" : "Mark Paid"}</button>
        <button className="darkButton" onClick={() => openInvoiceEmail(invoice)}><Mail size={16} /> Email PDF</button><button className="darkButton" onClick={() => openInvoiceMessage(invoice)}><FileText size={16} /> Message PDF</button>
        </div>
      </div>
    </div>
  );
}

function PhotoPrintGrid({ title, photos }: { title: string; photos: string[] }) {
  return <div className="mt-3 break-inside-avoid"><p className="mb-2 text-sm font-black uppercase tracking-wide text-zinc-700">{title}</p><div className="grid grid-cols-2 gap-2">{photos.map((photo, index) => <figure key={`${title}-${index}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"><img src={photo} alt={`${title} ${index + 1}`} className="h-36 w-full object-cover" /><figcaption className="px-2 py-1 text-[10px] font-bold text-zinc-500">{title} #{index + 1}</figcaption></figure>)}</div></div>;
}

function Reports({ totals, employeeTotals, jobs, employeesById, onCloseWeek, onExport, onCreateInvoice }: { totals: { earned: number; paid: number; borrowed?: number; owed: number }; employeeTotals: { employee: Employee; earned: number; paid: number; borrowed: number; owed: number }[]; jobs: JobEntry[]; employeesById: Map<string, Employee>; onCloseWeek: () => void; onExport: () => void; onCreateInvoice: () => void }) {
  return <section className="space-y-4"><SectionTop title="Reports" subtitle="Weekly summary, payroll closeout, invoice creation, and backup export."><button className="goldButton" onClick={onExport}><Download size={18} /> Export</button></SectionTop><div className="grid grid-cols-2 gap-3"><StatCard label="Earned" value={money(totals.earned)} description="Total Earned" icon={<CircleDollarSign size={20} />} variant="earned" /><StatCard label="Paid" value={money(totals.paid)} description="Total Paid" icon={<ArrowDown size={20} />} variant="paid" /><StatCard label="Borrowed" value={money(totals.borrowed || 0)} description="Total Borrowed" icon={<CreditCard size={20} />} variant="borrowed" /><StatCard label="Owed" value={money(totals.owed)} description="Still Owed" icon={<Minus size={20} />} variant="owed" /></div><div className="blackCard p-4"><div className="flex flex-col gap-3"><div><h3 className="font-black">Weekly Closeout</h3><p className="text-sm text-zinc-500">Mark every job in the selected week as paid, or create an invoice from the selected week.</p></div><div className="grid grid-cols-2 gap-2"><button className="goldButton" onClick={onCloseWeek}><ShieldCheck size={18} /> Close Paid</button><button className="darkButton" onClick={onCreateInvoice}><ReceiptText size={18} /> Invoice Week</button></div></div></div><div className="blackCard overflow-hidden p-4"><h3 className="font-black">Employee Payroll Breakdown</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="py-2">Employee</th><th>Earned</th><th>Paid</th><th>Borrowed</th><th>Owed</th></tr></thead><tbody>{employeeTotals.map((row) => <tr key={row.employee.id} className="border-t border-zinc-800"><td className="py-3 font-bold">{row.employee.name}</td><td>{money(row.earned)}</td><td>{money(row.paid)}</td><td>{money(row.borrowed || 0)}</td><td className="font-black text-green-400">{money(row.owed)}</td></tr>)}</tbody></table></div></div><div className="blackCard p-4"><h3 className="font-black">Job Report</h3><div className="mt-3 space-y-2">{jobs.map((job) => <div key={job.id} className="rounded-2xl border border-zinc-800 bg-black/30 p-3 text-sm"><div className="flex justify-between gap-3"><b>{employeesById.get(job.employeeId)?.name || "Unknown"}</b><b className="text-green-400">{money(job.pay)}</b></div><p className="text-zinc-500">{formatJobDate(job.date)} • {propertyWithUnit(job)}</p></div>)}{jobs.length === 0 && <EmptyText text="No job report yet." />}</div></div></section>;
}

function MorePanel({ onExport, onImport, onReset }: { onExport: () => void; onImport: () => void; onReset: () => void }) { return <section className="space-y-4"><SectionTop title="Control Center" subtitle="Backup, restore, and app controls." /><div className="grid gap-3"><button onClick={onExport} className="blackCard p-5 text-left"><Download className="text-green-400" /><p className="mt-3 font-black">Export Backup</p><p className="text-sm text-zinc-500">Save all data as JSON.</p></button><button onClick={onImport} className="blackCard p-5 text-left"><Upload className="text-green-400" /><p className="mt-3 font-black">Import Backup</p><p className="text-sm text-zinc-500">Restore from saved JSON.</p></button><button onClick={onReset} className="blackCard p-5 text-left"><RotateCcw className="text-red-300" /><p className="mt-3 font-black">Reset App</p><p className="text-sm text-zinc-500">Start fresh only after backup.</p></button></div></section>; }

function EmployeeModal({ onClose, onSave }: { onClose: () => void; onSave: (employee: Employee) => void }) {
  const [employee, setEmployee] = useState<Employee>({ id: uid(), name: "", phone: "", defaultRate: 0, notes: "", borrowed: 0, borrowedByWeek: {}, active: true });
  return <Modal title="Add Employee" onClose={onClose}><div className="space-y-3"><Operations label="Employee Name"><input className="inputElite" value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} placeholder="Worker name" /></Operations><Operations label="Phone"><input className="inputElite" value={employee.phone} onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} placeholder="Phone number" /></Operations><Operations label="Default Rate"><MoneyInput value={employee.defaultRate} onValueChange={(value) => setEmployee({ ...employee, defaultRate: value })} /></Operations><Operations label="Notes"><textarea className="inputElite min-h-20" value={employee.notes} onChange={(e) => setEmployee({ ...employee, notes: e.target.value })} /></Operations><button className="goldButton w-full" onClick={() => employee.name.trim() && onSave({ ...employee, name: employee.name.trim() })}><Check size={18} /> Save Employee</button></div></Modal>;
}

function JobModal({ employees, properties, jobTypeOptions, getAddressForProperty, onAddProperty, onClose, onSave }: { employees: Employee[]; properties: string[]; jobTypeOptions: string[]; getAddressForProperty: (property: string) => string; onAddProperty: (property: string) => void; onClose: () => void; onSave: (job: JobEntry, assignment?: WorkAssignment) => void }) {
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
  const [createAssignment, setCreateAssignment] = useState(true);
  const [assignmentAddress, setAssignmentAddress] = useState(getAddressForProperty(property));
  const [assignmentPriority, setAssignmentPriority] = useState<WorkAssignment["priority"]>("normal");
  const [assignmentLanguage, setAssignmentLanguage] = useState<AssignmentLanguage>("spanish");
  const [selectedWorkTemplate, setSelectedWorkTemplate] = useState("");

  function toggleType(type: string) { setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type])); }

  function applyWorkOrderTemplate(label: string) {
    setSelectedWorkTemplate(label);
    const template = workOrderTemplates.find((item) => item.label === label);
    if (!template) return;
    setSelectedTypes(template.jobTypes);
    setCustomWork(template.customWork);
    setAssignmentPriority(template.priority);
    if (!notes.trim()) setNotes(template.notes);
  }

  const assignedEmployee = employees.find((employee) => employee.id === employeeId);
  const scopeText = [...selectedTypes, customWork].filter(Boolean).join("\n") || "Job details to be confirmed.";
  const assignmentPreview: WorkAssignment = {
    id: uid(),
    employeeId,
    date,
    property,
    address: assignmentAddress,
    unitNumber,
    priority: assignmentPriority,
    language: assignmentLanguage,
    status: "assigned",
    scope: scopeText,
    notes,
    photos,
    createdAt: new Date().toISOString(),
  };

  function saveJobAndAssignment() {
    if (!employeeId || !property) return;
    const cleanPaid = Math.min(safeNumber(paidAmount), safeNumber(pay));
    const job: JobEntry = {
      id: uid(),
      employeeId,
      date,
      property,
      unitNumber,
      jobTypes: selectedTypes,
      customWork,
      pay,
      paidAmount: cleanPaid,
      status: statusFrom(pay, cleanPaid),
      notes,
      photos,
      workMessage: buildAssignmentMessage(assignmentPreview, assignedEmployee?.name || ""),
    };
    const assignment: WorkAssignment | undefined = createAssignment ? { ...assignmentPreview, id: uid(), photos: [...photos], createdAt: new Date().toISOString() } : undefined;
    onSave(job, assignment);
  }

  return <Modal title="New Work Order Entry" onClose={onClose}><div className="space-y-3"><div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm font-semibold text-green-100"><b>One entry workflow:</b> this saves the payroll job and can create the employee assignment message at the same time.</div><Operations label="Employee / Assigned To"><select className="inputElite" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Operations><div className="grid grid-cols-2 gap-3"><Operations label="Date"><input className="inputElite cursor-pointer" type="date" value={date} onClick={(e) => e.currentTarget.showPicker?.()} onFocus={(e) => e.currentTarget.showPicker?.()} onChange={(e) => setDate(e.target.value)} /></Operations><Operations label="Property"><select className="inputElite" value={property} onChange={(e) => { const selected = e.target.value; if (selected === "__add_new_property__") { const entered = window.prompt("Enter new property name:"); const cleanProperty = entered?.trim() || ""; if (cleanProperty) { onAddProperty(cleanProperty); setProperty(cleanProperty); setAssignmentAddress(""); } return; } setProperty(selected); setAssignmentAddress(getAddressForProperty(selected)); }}>{properties.map((item) => <option key={item} value={item}>{item}</option>)}<option value="__add_new_property__">+ Add New Property</option></select></Operations></div><Operations label="Unit #"><input className="inputElite" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="Example: 212" /></Operations><Operations label="Work Order Template"><select className="inputElite" value={selectedWorkTemplate} onChange={(e) => applyWorkOrderTemplate(e.target.value)}><option value="">Choose quick template...</option>{workOrderTemplates.map((template) => <option key={template.label} value={template.label}>{template.label}</option>)}</select></Operations><Operations label="Work Item"><div className="grid grid-cols-2 gap-2">{jobTypeOptions.map((type) => <button type="button" key={type} onClick={() => toggleType(type)} className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${selectedTypes.includes(type) ? "border-green-400/50 bg-green-500/20 text-green-300" : "border-zinc-800 bg-black/30 text-zinc-400"}`}>{selectedTypes.includes(type) ? "✓ " : ""}{type}</button>)}</div></Operations><Operations label="Custom Work"><input className="inputElite" value={customWork} onChange={(e) => setCustomWork(e.target.value)} placeholder="Extra scope or work description" /></Operations><div className="grid grid-cols-2 gap-3"><Operations label="Pay"><MoneyInput value={pay} onValueChange={setPay} placeholder="Enter Amount" /></Operations><Operations label="Paid"><MoneyInput value={paidAmount} onValueChange={setPaidAmount} placeholder="Enter Amount" /></Operations></div><div className="rounded-2xl border border-white/10 bg-black/25 p-3"><label className="flex items-center gap-3 text-sm font-black text-zinc-100"><input type="checkbox" checked={createAssignment} onChange={(e) => setCreateAssignment(e.target.checked)} /> Create employee assignment message</label>{createAssignment && <div className="mt-3 space-y-3"><Operations label="Job Address for Message"><input className="inputElite" value={assignmentAddress} onChange={(e) => setAssignmentAddress(e.target.value)} placeholder="460 Charles St, Providence RI" /></Operations><div className="grid grid-cols-2 gap-3"><Operations label="Priority"><select className="inputElite" value={assignmentPriority} onChange={(e) => setAssignmentPriority(e.target.value as WorkAssignment["priority"])}><option value="normal">Normal</option><option value="urgent">Urgent</option></select></Operations><Operations label="Language"><select className="inputElite" value={assignmentLanguage} onChange={(e) => setAssignmentLanguage(e.target.value as AssignmentLanguage)}><option value="spanish">Español</option><option value="english">English</option><option value="both">Both</option></select></Operations></div><div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3"><p className="mb-2 text-xs font-black uppercase text-green-400">Message Preview</p><pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 text-xs font-semibold text-zinc-200">{buildAssignmentMessage(assignmentPreview, assignedEmployee?.name || "")}</pre></div></div>}</div><Operations label="Photos"><div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-4"><div className="grid grid-cols-2 gap-2"><label className="goldButton w-full cursor-pointer"><Camera size={18} /> Take Photo<input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={async (e) => { const newPhotos = await readPhotoFiles(e.target.files); setPhotos((prev) => [...prev, ...newPhotos]); e.currentTarget.value = ""; }} /></label><label className="darkButton w-full cursor-pointer"><ImageIcon size={18} /> Upload<input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { const newPhotos = await readPhotoFiles(e.target.files); setPhotos((prev) => [...prev, ...newPhotos]); e.currentTarget.value = ""; }} /></label></div>{photos.length > 0 && <p className="mt-3 text-center text-sm text-zinc-400">{photos.length} photo(s) attached.</p>}</div></Operations><Operations label="Notes"><textarea className="inputElite min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" /></Operations><button className="goldButton w-full" onClick={saveJobAndAssignment}><Check size={18} /> Save Job{createAssignment ? " + Assignment" : ""}</button></div></Modal>;
}

function InvoiceModal({ invoices, properties, getProfileForProperty, initial, onClose, onSave }: { invoices: Invoice[]; properties: string[]; getProfileForProperty: (property: string) => PropertyContactProfile; initial: Invoice | null; onClose: () => void; onSave: (invoice: Invoice) => void }) {
  const [invoice, setInvoice] = useState<Invoice>(initial || { id: uid(), invoiceNumber: nextInvoiceNumber(invoices), clientName: getProfileForProperty(properties[0] || "").billingName || "", clientEmail: getProfileForProperty(properties[0] || "").email || "", property: properties[0] || "", propertyAddress: getProfileForProperty(properties[0] || "").address || "", unitNumber: "", invoiceDate: todayISO(), dueDate: addDaysISO(todayISO(), 14), status: "due", lineItems: [{ id: uid(), description: "Labor and materials", qty: 1, rate: 0 }], notes: "Thank you for your business. God bless.", paidAmount: 0, beforePhotos: [], afterPhotos: [] });
  const total = invoiceTotal(invoice);
  return <Modal title={initial ? "Edit Invoice" : "New Invoice"} onClose={onClose}><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Operations label="Invoice #"><input className="inputElite" value={invoice.invoiceNumber} onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })} /></Operations><Operations label="Status"><select className="inputElite" value={invoice.status} onChange={(e) => setInvoice({ ...invoice, status: e.target.value as Invoice["status"] })}><option value="due">Due</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></Operations><Operations label="Client"><input className="inputElite" value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} placeholder="Example: Wingate Companies" /></Operations><Operations label="Client Email"><input className="inputElite" type="email" value={invoice.clientEmail || ""} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} placeholder="manager@email.com" /></Operations><Operations label="Property"><select className="inputElite" value={invoice.property} onChange={(e) => { const selected = e.target.value; const profile = getProfileForProperty(selected); setInvoice({ ...invoice, property: selected, propertyAddress: profile.address || "", clientName: invoice.clientName || profile.billingName || selected, clientEmail: invoice.clientEmail || profile.email || "" }); }}>{properties.map((property) => <option key={property} value={property}>{property}</option>)}</select></Operations><Operations label="Unit #"><input className="inputElite" value={invoice.unitNumber} onChange={(e) => setInvoice({ ...invoice, unitNumber: e.target.value })} /></Operations><Operations label="Invoice Date"><input className="inputElite" type="date" value={invoice.invoiceDate} onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })} /></Operations><Operations label="Due Date"><input className="inputElite" type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} /></Operations><Operations label="Paid Amount"><MoneyInput value={invoice.paidAmount} onValueChange={(value) => { const cleanValue = safeNumber(value); if (cleanValue >= total && total > 0) { if (!confirmAction("Confirm: mark this invoice paid?")) return; setInvoice({ ...invoice, paidAmount: cleanValue, status: "paid" }); return; } setInvoice({ ...invoice, paidAmount: cleanValue, status: invoice.status === "paid" ? "sent" : invoice.status }); }} /></Operations></div><Operations label="Line Items"><div className="space-y-3">{invoice.lineItems.map((line) => <div key={line.id} className="rounded-2xl border border-zinc-800 bg-black/25 p-3"><Operations label="Description"><input className="inputElite" value={line.description} onChange={(e) => setInvoice({ ...invoice, lineItems: invoice.lineItems.map((item) => item.id === line.id ? { ...item, description: e.target.value } : item) })} /></Operations><div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2"><Operations label="Qty"><input className="inputElite" type="number" value={line.qty} onChange={(e) => setInvoice({ ...invoice, lineItems: invoice.lineItems.map((item) => item.id === line.id ? { ...item, qty: safeNumber(e.target.value) } : item) })} /></Operations><Operations label="Rate"><MoneyInput value={line.rate} onValueChange={(value) => setInvoice({ ...invoice, lineItems: invoice.lineItems.map((item) => item.id === line.id ? { ...item, rate: value } : item) })} /></Operations><button className="iconDanger self-end" onClick={() => { if (!confirmAction("Remove this line item from the invoice?")) return; setInvoice({ ...invoice, lineItems: invoice.lineItems.filter((item) => item.id !== line.id) }); }}><Trash2 size={16} /></button></div></div>)}<button className="darkButton w-full" onClick={() => setInvoice({ ...invoice, lineItems: [...invoice.lineItems, { id: uid(), description: "New line item", qty: 1, rate: 0 }] })}><Plus size={16} /> Add Line Item</button></div></Operations><div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-right"><p className="text-xs font-black uppercase text-green-400">Invoice Total</p><p className="text-2xl font-black">{money(total)}</p><p className="mt-1 text-xs font-semibold text-zinc-400">This is the customer/company charge shown on the PDF invoice.</p></div><div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-xs font-semibold text-blue-100"><b>Invoice Center:</b> This screen is for customer/company invoices only. Add the charge amount, photos, and notes, then open the PDF before emailing, texting, WhatsApping, printing, or saving.</div><Operations label="Before Photos"><InvoicePhotoPicker photos={invoice.beforePhotos || []} label="Add Before Photos" onChange={(photos) => setInvoice({ ...invoice, beforePhotos: photos })} /></Operations><Operations label="After / Completed Job Photos"><InvoicePhotoPicker photos={invoice.afterPhotos || []} label="Add After Photos" onChange={(photos) => setInvoice({ ...invoice, afterPhotos: photos })} /></Operations><Operations label="Notes / Terms"><textarea className="inputElite min-h-24" value={invoice.notes} onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })} /></Operations><div className="grid grid-cols-2 gap-2"><button className="goldButton" onClick={() => { const cleanTotal = invoiceTotal(invoice); const cleanPaid = safeNumber(invoice.paidAmount); const cleanStatus = invoice.status === "paid" && !(cleanTotal > 0 && cleanPaid >= cleanTotal) ? "sent" : invoice.status; onSave({ ...invoice, paidAmount: cleanPaid, status: cleanStatus }); }}><Check size={18} /> Save Invoice</button><button className="darkButton" onClick={() => { const cleanTotal = invoiceTotal(invoice); const cleanPaid = safeNumber(invoice.paidAmount); const cleanInvoice = { ...invoice, status: invoice.status === "paid" && !(cleanTotal > 0 && cleanPaid >= cleanTotal) ? "sent" as Invoice["status"] : invoice.status, paidAmount: cleanPaid }; setInvoice(cleanInvoice); printInvoiceDocument(cleanInvoice, cleanInvoice.beforePhotos || [], cleanInvoice.afterPhotos || []); }}><Eye size={18} /> Preview PDF</button><button className="darkButton" onClick={() => printInvoiceDocument(invoice, invoice.beforePhotos || [], invoice.afterPhotos || [])}><Printer size={18} /> Print / Save PDF</button><button className="darkButton" onClick={() => openInvoiceMessage(invoice)}><FileText size={18} /> Text PDF</button><button className="darkButton" onClick={() => { openInvoiceMessage(invoice); setTimeout(() => { window.location.href = `https://wa.me/?text=${encodeURIComponent(`Invoice ${invoice.invoiceNumber} is ready. Please see the attached PDF invoice from 1 Stop Turnover Specialist LLC.`)}`; }, 900); }}><FileText size={18} /> WhatsApp PDF</button><button className="goldButton" onClick={() => openInvoiceEmail({ ...invoice, status: invoice.status === "paid" && !(invoiceTotal(invoice) > 0 && safeNumber(invoice.paidAmount) >= invoiceTotal(invoice)) ? "sent" : invoice.status })}><Mail size={18} /> Email PDF</button></div></div></Modal>;
}

function InvoicePhotoPicker({ photos, label, onChange }: { photos: string[]; label: string; onChange: (photos: string[]) => void }) {
  async function addInvoicePhotos(files: FileList | null) {
    const newPhotos = await readPhotoFiles(files);
    if (newPhotos.length) onChange([...photos, ...newPhotos]);
  }
  return <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-3"><div className="grid grid-cols-2 gap-2"><label className="goldButton w-full cursor-pointer"><Camera size={18} /> Take<input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={async (e) => { await addInvoicePhotos(e.target.files); e.currentTarget.value = ""; }} /></label><label className="darkButton w-full cursor-pointer"><ImageIcon size={18} /> Upload<input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { await addInvoicePhotos(e.target.files); e.currentTarget.value = ""; }} /></label></div><p className="mt-2 text-center text-xs font-semibold text-zinc-500">{label}</p>{photos.length > 0 ? <div className="mt-3 grid grid-cols-3 gap-2">{photos.map((photo, index) => <div key={`invoice-photo-${index}`} className="relative overflow-hidden rounded-xl border border-white/10"><img src={photo} alt={`Invoice photo ${index + 1}`} className="h-24 w-full object-cover" /><button type="button" className="absolute right-1 top-1 rounded-full border border-red-400/30 bg-black/70 p-1 text-red-200" onClick={() => { if (!confirmAction("Remove this invoice photo?")) return; onChange(photos.filter((_, photoIndex) => photoIndex !== index)); }}><Trash2 size={13} /></button></div>)}</div> : <p className="mt-2 text-center text-xs font-semibold text-zinc-500">No photos attached yet.</p>}</div>;
}

function PropertyModal({ initialName = "", initialProfile, onClose, onSave }: { initialName?: string; initialProfile?: PropertyContactProfile; onClose: () => void; onSave: (property: string, profile: PropertyContactProfile) => void }) {
  const [property, setProperty] = useState(initialName);
  const [profile, setProfile] = useState<PropertyContactProfile>(initialProfile || { address: "", contactName: "", email: "", phone: "", billingName: initialName, notes: "" });
  return <Modal title={initialName ? "Edit Property Profile" : "Add Property Profile"} onClose={onClose}><div className="space-y-3"><Operations label="Property Name"><input className="inputElite" value={property} onChange={(e) => { setProperty(e.target.value); if (!profile.billingName) setProfile({ ...profile, billingName: e.target.value }); }} placeholder="Property name" /></Operations><Operations label="Full Address"><input className="inputElite" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="460 Charles St, Providence RI" /></Operations><div className="grid grid-cols-2 gap-3"><Operations label="Contact Name"><input className="inputElite" value={profile.contactName} onChange={(e) => setProfile({ ...profile, contactName: e.target.value })} placeholder="Manager name" /></Operations><Operations label="Phone"><input className="inputElite" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone number" /></Operations></div><Operations label="Email"><input className="inputElite" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="manager@email.com" /></Operations><Operations label="Billing Name"><input className="inputElite" value={profile.billingName} onChange={(e) => setProfile({ ...profile, billingName: e.target.value })} placeholder="Company/client name for invoices" /></Operations><Operations label="Notes"><textarea className="inputElite min-h-20" value={profile.notes} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} placeholder="Gate codes, office notes, billing instructions, etc." /></Operations><button className="goldButton w-full" onClick={() => { const cleanName = property.trim(); if (!cleanName) return; onSave(cleanName, { address: profile.address.trim(), contactName: profile.contactName.trim(), email: profile.email.trim(), phone: profile.phone.trim(), billingName: profile.billingName.trim() || cleanName, notes: profile.notes.trim() }); }}><Check size={18} /> Save Property Profile</button></div></Modal>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"><div className="modalCard blackCard w-full max-w-[520px] p-4"><div className="relative z-10 mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-black">{title}</h2><button onClick={onClose} className="darkButton !p-3"><X size={18} /></button></div><div className="relative z-10">{children}</div></div></div>; }
function Operations({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="labelElite">{label}</span>{children}</label>; }
function MoneyInput({ value, onValueChange, placeholder = "Enter Amount" }: { value: number; onValueChange: (value: number) => void; placeholder?: string }) { return <input className="inputElite" type="number" inputMode="decimal" min="0" step="0.01" value={value === 0 ? "" : String(value)} placeholder={placeholder} onChange={(e) => onValueChange(safeNumber(e.target.value))} />; }


function EmptyText({ text }: { text: string }) { return <p className="relative z-10 py-4 text-center text-sm font-semibold text-zinc-500">{text}</p>; }
function ConfirmModal({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) { return <Modal title={title} onClose={onCancel}><div className="space-y-4"><div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-red-300" /><p className="text-sm text-red-100">{message}</p></div></div><div className="grid grid-cols-2 gap-2"><button className="darkButton" onClick={onCancel}>Cancel</button><button className="iconDanger justify-center" onClick={onConfirm}><Trash2 size={18} /> Delete</button></div></div></Modal>; }

function BottomNav({ activeTab, setActiveTab }: { activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void }) {
  const tabs: { tab: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { tab: "dashboard", label: "Home", icon: <Home size={20} /> },
    { tab: "field", label: "Work", icon: <BriefcaseBusiness size={20} /> },
    { tab: "office", label: "Office", icon: <ReceiptText size={20} /> },
    { tab: "employees", label: "Employees", icon: <Users size={20} /> },
  ];
  return <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#02070a]/95 px-2 pb-3 pt-2 backdrop-blur-xl"><div className="mx-auto grid max-w-[540px] grid-cols-4 gap-1">{tabs.map((item) => { const active = activeTab === item.tab || (item.tab === "field" && (activeTab === "ops" || activeTab === "jobs")) || (item.tab === "office" && (activeTab === "invoices" || activeTab === "reports")); return <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-black transition active:scale-95 ${active ? "bg-green-500 text-black" : "text-zinc-500"}`}>{item.icon}<span>{item.label}</span></button>; })}</div></nav>;
}


function EstimatesPanel({ estimates, onAdd, onEdit, onDelete, onUpdate, onConvertToInvoice }: { estimates: Estimate[]; onAdd: () => void; onEdit: (estimate: Estimate) => void; onDelete: (id: string) => void; onUpdate: (estimate: Estimate) => void; onConvertToInvoice: (estimate: Estimate) => void; }) {
  return (
    <section className="space-y-3">
      {estimates.length === 0 ? (
        <div className="blackCard p-5 text-center">
          <p className="font-black text-zinc-200">No estimates yet</p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">Create your first estimate or convert a work order into an estimate.</p>
          <button onClick={onAdd} className="goldButton mx-auto mt-4"><Plus size={18} /> New Estimate</button>
        </div>
      ) : estimates.map((estimate) => {
        const total = estimateTotal(estimate);
        return (
          <div key={estimate.id} className="blackCard p-4">
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">{estimate.estimateNumber}</p>
                <h3 className="mt-1 text-base font-black text-white">{estimate.clientName || estimate.property}</h3>
                <p className="mt-1 text-xs font-semibold text-zinc-400">{estimate.property}{estimate.unitNumber ? ` — Unit ${estimate.unitNumber}` : ""}</p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">{estimate.propertyAddress || "No address saved"}</p>
                <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase text-amber-200">{estimate.status}</span><span className="rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1 text-[11px] font-black text-green-200">{money(total)}</span></div>
              </div>
              <div className="flex shrink-0 flex-col gap-2"><button onClick={() => onEdit(estimate)} className="darkButton !px-3 !py-2"><Pencil size={15} /></button><button onClick={() => onDelete(estimate.id)} className="iconDanger"><Trash2 size={15} /></button></div>
            </div>
            <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => onUpdate({ ...estimate, id: uid(), estimateNumber: `${estimate.estimateNumber}-COPY`, status: "draft" })} className="darkButton justify-center"><ClipboardList size={15} /> Duplicate</button>
              <button onClick={() => onConvertToInvoice(estimate)} className="goldButton justify-center"><ReceiptText size={15} /> Convert</button>
              <button onClick={() => onUpdate({ ...estimate, status: "sent" })} className="darkButton justify-center"><Mail size={15} /> Mark Sent</button>
              <button onClick={() => onUpdate({ ...estimate, status: "approved" })} className="darkButton justify-center"><Check size={15} /> Approved</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function EstimateModal({ estimate, properties, getAddressForProperty, getBillingNameForProperty, getEmailForProperty, onClose, onSave, nextNumber }: { estimate: Estimate | null; properties: string[]; getAddressForProperty: (property: string) => string; getBillingNameForProperty: (property: string) => string; getEmailForProperty: (property: string) => string; onClose: () => void; onSave: (estimate: Estimate) => void; nextNumber: string; }) {
  const [draft, setDraft] = useState<Estimate>(() => estimate || { id: uid(), estimateNumber: nextNumber, clientName: properties[0] ? getBillingNameForProperty(properties[0]) : "", property: properties[0] || "", propertyAddress: properties[0] ? getAddressForProperty(properties[0]) : "", unitNumber: "", estimateDate: todayISO(), status: "draft", lineItems: [{ id: uid(), description: "", qty: 1, rate: 0 }], notes: "Thank you for the opportunity to provide this estimate. God bless.", clientEmail: properties[0] ? getEmailForProperty(properties[0]) : "", beforePhotos: [], afterPhotos: [], sourceJobIds: [] });
  function updateLineItem(id: string, patch: Partial<InvoiceLineItem>) { setDraft((prev) => ({ ...prev, lineItems: prev.lineItems.map((item) => item.id === id ? { ...item, ...patch } : item) })); }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur"><div className="mx-auto max-w-[540px] rounded-[1.5rem] border border-white/10 bg-zinc-950 p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Estimate</p><h2 className="text-xl font-black text-white">{draft.estimateNumber}</h2></div><button onClick={onClose} className="iconDanger"><X size={18} /></button></div>
      <div className="grid gap-3">
        <select value={draft.property} onChange={(e) => { const property = e.target.value; setDraft((prev) => ({ ...prev, property, clientName: getBillingNameForProperty(property), clientEmail: getEmailForProperty(property), propertyAddress: getAddressForProperty(property) })); }} className="input">{properties.map((property) => <option key={property} value={property}>{property}</option>)}</select>
        <input value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} placeholder="Client / Billing name" className="input" />
        <input value={draft.propertyAddress || ""} onChange={(e) => setDraft({ ...draft, propertyAddress: e.target.value })} placeholder="Property address" className="input" />
        <input value={draft.unitNumber} onChange={(e) => setDraft({ ...draft, unitNumber: e.target.value })} placeholder="Unit number optional" className="input" />
        <input value={draft.clientEmail || ""} onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value })} placeholder="Client email optional" className="input" />
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-zinc-400">Estimate Items</p><button onClick={() => setDraft((prev) => ({ ...prev, lineItems: [...prev.lineItems, { id: uid(), description: "", qty: 1, rate: 0 }] }))} className="darkButton !px-3 !py-2"><Plus size={14} /> Add</button></div><div className="space-y-2">{draft.lineItems.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-white/10 bg-black/30 p-2"><input value={item.description} onChange={(e) => updateLineItem(item.id, { description: e.target.value })} placeholder="Description" className="input" /><div className="grid grid-cols-2 gap-2"><input type="number" value={item.qty} onChange={(e) => updateLineItem(item.id, { qty: safeNumber(e.target.value) })} placeholder="Qty" className="input" /><input type="number" value={item.rate} onChange={(e) => updateLineItem(item.id, { rate: safeNumber(e.target.value) })} placeholder="Amount" className="input" /></div></div>)}</div></div>
        <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" className="input min-h-[100px]" />
        <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm font-black text-green-200">Total: {money(estimateTotal(draft))}</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={onClose} className="darkButton justify-center">Cancel</button><button onClick={() => onSave(draft)} className="goldButton justify-center"><Check size={18} /> Save Estimate</button></div>
    </div></div>
  );
}
