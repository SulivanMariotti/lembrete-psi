// src/features/patient/lib/dates.js

export function parseDateFromAny(a) {
  const s = String(a || "").trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);

  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00`);

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function brDateParts(dateStrOrIso) {
  const d = parseDateFromAny(dateStrOrIso);
  if (!d) return { day: "--", mon: "---", label: String(dateStrOrIso || "") };
  const day = String(d.getDate()).padStart(2, "0");
  const monNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const mon = monNames[d.getMonth()];
  const label = d.toLocaleDateString("pt-BR");
  return { day, mon, label };
}

export function monthLabelFromIso(isoDate) {
  const d = parseDateFromAny(isoDate);
  if (!d) return "";
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

export function startOfWeek(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function weekLabelPT(d) {
  const s = startOfWeek(d);
  const e = endOfWeek(d);
  const ds = s.toLocaleDateString("pt-BR");
  const de = e.toLocaleDateString("pt-BR");
  return `Semana ${ds} → ${de}`;
}

export function relativeLabelForDate(dt) {
  if (!dt) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return { text: "Hoje", style: "today" };
  if (diffDays === 1) return { text: "Amanhã", style: "tomorrow" };
  if (diffDays > 1) return { text: `Em ${diffDays} dias`, style: "future" };
  if (diffDays === -1) return { text: "Ontem", style: "past" };
  return { text: `${Math.abs(diffDays)} dias atrás`, style: "past" };
}

// 🔹 Normaliza Timestamp/Date/string → millis
export function toMillis(v) {
  if (!v) return null;
  // Firestore Timestamp
  if (typeof v === "object" && typeof v.seconds === "number") return v.seconds * 1000;
  // Date
  if (v instanceof Date) return v.getTime();
  // number
  if (typeof v === "number") return v;
  // string date
  const d = new Date(String(v));
  if (!Number.isNaN(d.getTime())) return d.getTime();
  return null;
}

export function formatDateTimeBR(ms) {
  if (!ms || !Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
