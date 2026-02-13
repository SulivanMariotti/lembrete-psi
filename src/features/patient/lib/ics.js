// src/features/patient/lib/ics.js

import { addMinutes, parseDateFromAny } from "./dates";

export function makeIcsDataUrl({ title, description, startISO, endISO }) {
  const dt = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const da = pad(d.getUTCDate());
    const h = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const s = pad(d.getUTCSeconds());
    return `${y}${m}${da}T${h}${mi}${s}Z`;
  };

  const uid = `lembretepsi-${Math.random().toString(16).slice(2)}@local`;
  const ics =
    "BEGIN:VCALENDAR\n" +
    "VERSION:2.0\n" +
    "PRODID:-//Lembrete Psi//PT-BR\n" +
    "CALSCALE:GREGORIAN\n" +
    "METHOD:PUBLISH\n" +
    "BEGIN:VEVENT\n" +
    `UID:${uid}\n` +
    `DTSTAMP:${dt(new Date().toISOString())}\n` +
    `DTSTART:${dt(startISO)}\n` +
    `DTEND:${dt(endISO)}\n` +
    `SUMMARY:${String(title || "Atendimento").replace(/\n/g, " ")}\n` +
    `DESCRIPTION:${String(description || "").replace(/\n/g, " ")}\n` +
    "END:VEVENT\n" +
    "END:VCALENDAR";

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function startDateTimeFromAppointment(a) {
  const iso = a?.isoDate || a?.date || "";
  const t = String(a?.time || "").trim();
  const d = parseDateFromAny(iso);
  if (!d) return null;

  if (t && /^\d{2}:\d{2}$/.test(t)) {
    return new Date(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${t}:00`
    );
  }
  return d;
}

// Helpers para ICS com base no Appointment
export function buildIcsForAppointment({ appointment, title, description, minutes = 50 }) {
  const start = startDateTimeFromAppointment(appointment);
  if (!start) return null;
  const end = addMinutes(start, minutes);
  return makeIcsDataUrl({
    title,
    description,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  });
}
