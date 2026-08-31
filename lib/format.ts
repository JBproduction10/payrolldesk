// lib/format.ts

import type { Currency } from "./types";

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  NGN: "\u20a6",
  GBP: "\u00a3",
  EUR: "\u20ac",
  KES: "KSh",
  ZAR: "R",
  GHS: "\u20b5",
  CDF: "FC",
  XAF: "FCFA",
};

export function money(value: number, currency: Currency = "USD", locale: "en" | "fr" = "en"): string {
  const sym = CURRENCY_SYMBOL[currency] ?? "$";
  const rounded = Math.round(value);
  return `${sym}${rounded.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}`;
}

export function moneyPrecise(value: number, currency: Currency = "USD", locale: "en" | "fr" = "en"): string {
  const sym = CURRENCY_SYMBOL[currency] ?? "$";
  return `${sym}${value.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function compactMoney(value: number, currency: Currency = "USD"): string {
  const sym = CURRENCY_SYMBOL[currency] ?? "$";
  if (Math.abs(value) >= 1_000_000)
    return `${sym}${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `${sym}${Math.round(value / 1000)}k`;
  return `${sym}${Math.round(value)}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** "2026-08" -> "August 2026" (or "août 2026" for locale "fr") */
export function periodLabel(period: string, locale: "en" | "fr" = "en"): string {
  const [y, m] = period.split("-");
  const idx = Number(m) - 1;
  const months = locale === "fr" ? MONTHS_FR : MONTHS;
  return `${months[idx] ?? ""} ${y}`;
}

/** "2026-08" -> "Aug 2026" (or "août 2026" for locale "fr") */
export function periodShort(period: string, locale: "en" | "fr" = "en"): string {
  const [y, m] = period.split("-");
  const idx = Number(m) - 1;
  if (locale === "fr") return `${MONTHS_FR[idx] ?? ""} ${y}`;
  return `${(MONTHS[idx] ?? "").slice(0, 3)} ${y}`;
}

export function toPeriod(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toPeriod(d);
}

/** Last n periods ending at `period` (inclusive), oldest first. */
export function recentPeriods(period: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftPeriod(period, i - (n - 1)));
}

export function payDate(period: string, day: number): Date {
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(day, lastDay));
}

export function formatDate(d: Date | string, locale: "en" | "fr" = "en"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(iso: string, locale: "en" | "fr" = "en"): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (locale === "fr") {
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "hier";
    if (days < 30) return `il y a ${days} j`;
    return formatDate(iso, "fr");
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

let counter = 0;
/** iframe-safe id generator (no crypto.randomUUID) */
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(
    Math.random() * 1e6,
  ).toString(36)}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 5) return phone;
  return `${phone.slice(0, phone.length - 4).replace(/\d(?=\d{0}$)/g, "")}${phone.slice(-4)}`;
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
