// src/features/patient/lib/phone.js

export function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

// Canonical phone (sem +55). Ex.: 11999998888
export function toCanonical(v) {
  let d = onlyDigits(v).replace(/^0+/, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d;
}

// WhatsApp phone (com 55). Ex.: 5511999998888
export function normalizeWhatsappPhone(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

// Formata no padrão BR: (11) 99999-8888
export function formatPhoneBR(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  const pure = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;

  if (pure.length === 11) return `(${pure.slice(0, 2)}) ${pure.slice(2, 7)}-${pure.slice(7)}`;
  if (pure.length === 10) return `(${pure.slice(0, 2)}) ${pure.slice(2, 6)}-${pure.slice(6)}`;
  return pure;
}
