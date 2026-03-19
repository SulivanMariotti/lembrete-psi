export const REPORT_DEMAND_CATEGORY_OPTIONS = [1, 2, 3, 4, 5];

export function normalizeDemandName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugifyDemandName(value) {
  const normalized = normalizeDemandName(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "demanda";
}

export function getDemandCategoryFieldNames(categoryNumber) {
  const num = Number(categoryNumber || 0);
  if (!REPORT_DEMAND_CATEGORY_OPTIONS.includes(num)) {
    throw new Error("Categoria inválida.");
  }

  return {
    title: `category${num}Title`,
    content: `category${num}Content`,
  };
}

export function extractDemandCategory(demand = {}, categoryNumber = 1) {
  const fields = getDemandCategoryFieldNames(categoryNumber);
  return {
    number: Number(categoryNumber || 1),
    title: String(demand?.[fields.title] || "").trim(),
    content: String(demand?.[fields.content] || "").trim(),
  };
}

export function countFilledDemandCategories(demand = {}) {
  return REPORT_DEMAND_CATEGORY_OPTIONS.reduce((count, categoryNumber) => {
    const category = extractDemandCategory(demand, categoryNumber);
    return category.content ? count + 1 : count;
  }, 0);
}



function parseBrDateParts(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const dateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const year = Number(dateMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatBirthDateDisplay(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const dateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const day = String(Number(dateMatch[1])).padStart(2, "0");
    const month = String(Number(dateMatch[2])).padStart(2, "0");
    const year = String(Number(dateMatch[3]));
    return `${day}/${month}/${year}`;
  }

  const parsed = parseBrDateParts(text);
  if (!parsed) return text;

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear());
  return `${day}/${month}/${year}`;
}

export function calculateAgeFromBirthDate(value, referenceDate = new Date()) {
  const birthDate = parseBrDateParts(value);
  if (!birthDate) return null;

  const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate || Date.now());
  if (Number.isNaN(reference.getTime())) return null;

  let age = reference.getFullYear() - birthDate.getFullYear();
  const monthDiff = reference.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

export function resolveDemandCidByBirthDate(demand = {}, birthDateValue = "", referenceDate = new Date()) {
  const cidInf = String(demand?.cidInf || "").trim();
  const cidAdult = String(demand?.cidAdult || "").trim();
  const age = calculateAgeFromBirthDate(birthDateValue, referenceDate);

  if (age != null && age < 18) {
    return {
      value: cidInf || cidAdult,
      source: cidInf ? "cidInf" : cidAdult ? "cidAdultFallback" : "",
      age,
      ageBand: "infantil",
    };
  }

  return {
    value: cidAdult || cidInf,
    source: cidAdult ? "cidAdult" : cidInf ? "cidInfFallback" : "",
    age,
    ageBand: "adulto",
  };
}

export function createEmptyDemandForm() {
  const form = {
    name: "",
    description: "",
    isActive: true,
    cidInf: "",
    cidAdult: "",
  };

  REPORT_DEMAND_CATEGORY_OPTIONS.forEach((categoryNumber) => {
    form[`category${categoryNumber}Title`] = `Categoria ${categoryNumber}`;
    form[`category${categoryNumber}Content`] = "";
  });

  return form;
}

export function mapDemandToForm(demand = {}) {
  return {
    ...createEmptyDemandForm(),
    name: String(demand?.name || "").trim(),
    description: String(demand?.description || "").trim(),
    isActive: demand?.isActive == null ? true : Boolean(demand.isActive),
    cidInf: String(demand?.cidInf || "").trim(),
    cidAdult: String(demand?.cidAdult || "").trim(),
    ...REPORT_DEMAND_CATEGORY_OPTIONS.reduce((acc, categoryNumber) => {
      const category = extractDemandCategory(demand, categoryNumber);
      acc[`category${categoryNumber}Title`] = category.title || `Categoria ${categoryNumber}`;
      acc[`category${categoryNumber}Content`] = category.content || "";
      return acc;
    }, {}),
  };
}
