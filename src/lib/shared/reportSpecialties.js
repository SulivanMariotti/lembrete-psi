export const REPORT_SPECIALTY_DEMAND_SOURCE_MODES = {
  EXCEL: "excel",
  SYSTEM_DEFAULT: "system_default",
};

export const REPORT_SPECIALTY_DEFAULTS = {
  isActive: true,
  demandSourceMode: REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL,
};

export function normalizeSpecialtyName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugifySpecialtyName(value) {
  const normalized = normalizeSpecialtyName(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "especialidade";
}

export function isPsychologySpecialty(value) {
  const normalized = normalizeSpecialtyName(value);
  return normalized === "psicologia";
}

export function createEmptySpecialtyForm() {
  return {
    name: "",
    description: "",
    isActive: true,
    demandSourceMode: REPORT_SPECIALTY_DEFAULTS.demandSourceMode,
    defaultDemandId: "",
  };
}

export function mapSpecialtyToForm(item = {}) {
  return {
    ...createEmptySpecialtyForm(),
    name: String(item?.name || "").trim(),
    description: String(item?.description || "").trim(),
    isActive: item?.isActive == null ? true : Boolean(item.isActive),
    demandSourceMode:
      String(item?.demandSourceMode || "").trim() || REPORT_SPECIALTY_DEFAULTS.demandSourceMode,
    defaultDemandId: String(item?.defaultDemandId || "").trim(),
  };
}
