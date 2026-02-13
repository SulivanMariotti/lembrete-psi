// src/features/patient/lib/appointments.js

export function chipClass(style) {
  if (style === "today") return "bg-emerald-50 border-emerald-100 text-emerald-900";
  if (style === "tomorrow") return "bg-violet-50 border-violet-100 text-violet-900";
  if (style === "future") return "bg-slate-50 border-slate-200 text-slate-700";
  return "bg-amber-50 border-amber-100 text-amber-900";
}

export function prettyServiceLabel(serviceType) {
  const s = String(serviceType || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "psicologia") return "Psicologia";
  if (s === "fonoaudiologia") return "Fonoaudiologia";
  if (s === "nutricao") return "Nutrição";
  if (s === "neuropsicologia") return "Neuropsicologia";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// fallback robusto: campo novo `serviceType`, mas suporta variações antigas
export function getServiceTypeFromAppointment(a) {
  return (
    a?.serviceType ||
    a?.servico ||
    a?.service ||
    a?.tipoServico ||
    a?.tipo_servico ||
    ""
  );
}

export function getLocationFromAppointment(a) {
  return a?.location || a?.local || a?.sala || a?.place || "";
}

export function statusChipFor(appointmentStatus, isConfirmed) {
  const s = String(appointmentStatus || "scheduled").toLowerCase();

  if (s === "done") {
    return { text: "Realizada", cls: "bg-emerald-50 border-emerald-100 text-emerald-900" };
  }
  if (s === "no_show") {
    return { text: "Faltou", cls: "bg-amber-50 border-amber-100 text-amber-900" };
  }
  if (s === "cancelled") {
    return { text: "Cancelada", cls: "bg-slate-50 border-slate-200 text-slate-700" };
  }
  if (isConfirmed) {
    return { text: "Confirmada", cls: "bg-violet-50 border-violet-100 text-violet-900" };
  }
  return { text: "Agendada", cls: "bg-slate-50 border-slate-200 text-slate-700" };
}
