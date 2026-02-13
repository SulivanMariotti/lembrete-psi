/**
 * Utils de telefone (Paciente)
 * - Mantém funções puras, sem dependência de React/Firebase
 */

/** Remove tudo que não for dígito */
export function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

/**
 * Retorna número "canônico" sem código do país (55) e sem zeros à esquerda.
 * Ex.: "+55 (11) 98888-7777" => "11988887777"
 */
export function toCanonical(v) {
  let d = onlyDigits(v).replace(/^0+/, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d;
}

/**
 * Normaliza para padrão WhatsApp com DDI 55 quando aplicável.
 * - 10/11 dígitos => prefixa "55"
 * - já vem com 55 (12/13 dígitos) => mantém
 */
export function normalizeWhatsappPhone(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

/** Formata número BR (com ou sem 55) para exibição: (11) 98888-7777 */
export function formatPhoneBR(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  const pure = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;

  if (pure.length === 11) return `(${pure.slice(0, 2)}) ${pure.slice(2, 7)}-${pure.slice(7)}`;
  if (pure.length === 10) return `(${pure.slice(0, 2)}) ${pure.slice(2, 6)}-${pure.slice(6)}`;
  return pure;
}
