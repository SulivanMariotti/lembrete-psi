import {
  extractDemandCategory,
  normalizeDemandName,
  resolveDemandCidByBirthDate,
} from "@/lib/shared/reportDemands";
import {
  REPORT_SPECIALTY_DEMAND_SOURCE_MODES,
  normalizeSpecialtyName,
} from "@/lib/shared/reportSpecialties";

function coerceText(value) {
  return String(value || "").trim();
}

export const REPORT_IMPORT_MATCH_SUMMARY_TEMPLATE = Object.freeze({
  ready: 0,
  missingSpecialty: 0,
  specialtyNotFound: 0,
  inactiveSpecialty: 0,
  excelMissingDemand: 0,
  excelDemandNotFound: 0,
  specialtyWithoutDefaultDemand: 0,
  inactiveDemand: 0,
  missingCategory: 0,
});

function resolveMissingDemandStatus({ specialtyMode, demand }) {
  if (demand) {
    return {
      missingDemandStatus: "",
      missingDemandLabel: "",
    };
  }

  if (specialtyMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT) {
    return {
      missingDemandStatus: "specialty-without-default-demand",
      missingDemandLabel: "Especialidade sem Demanda padrão",
    };
  }

  return {
    missingDemandStatus: "excel-demand-not-found",
    missingDemandLabel: "Demanda da planilha não encontrada",
  };
}

function resolveCategoryStatus({ row, specialty, demand, selectedCategory, resolution }) {
  if (!coerceText(row?.especialidade)) {
    return {
      status: "missing-specialty",
      statusLabel: "Especialidade em branco",
    };
  }

  if (!specialty) {
    return {
      status: "specialty-not-found",
      statusLabel: "Especialidade não encontrada",
    };
  }

  if (specialty?.isActive === false) {
    return {
      status: "inactive-specialty",
      statusLabel: "Especialidade inativa",
    };
  }

  if (!demand) {
    return {
      status: resolution?.missingDemandStatus || "missing-demand",
      statusLabel: resolution?.missingDemandLabel || "Demanda não encontrada",
    };
  }

  if (demand?.isActive === false) {
    return {
      status: "inactive-demand",
      statusLabel: "Demanda inativa",
    };
  }

  const category = extractDemandCategory(demand, selectedCategory);
  if (!category.content) {
    return {
      status: "missing-category",
      statusLabel: `Categoria ${selectedCategory} vazia`,
    };
  }

  return {
    status: "ready",
    statusLabel: "Pronto",
  };
}

export function buildDemandResolution(row = {}, specialty = null) {
  // Regra oficial:
  // - EXCEL: usa a coluna Demanda e, se vier vazia, faz fallback em Tags.
  // - SYSTEM_DEFAULT: ignora Demanda/Tags do arquivo e usa a Demanda padrão da Especialidade.
  const specialtyMode =
    String(specialty?.demandSourceMode || "").trim() || REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL;
  const excelDemandInput = coerceText(row?.demanda || row?.tags || "");
  const excelDemandNormalized = normalizeDemandName(excelDemandInput);

  if (specialtyMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT) {
    const defaultDemandId = String(specialty?.defaultDemandId || "").trim();
    const demand = specialty?.demands?.find((item) => String(item?.id || "").trim() === defaultDemandId) || null;
    const missingDemand = resolveMissingDemandStatus({ specialtyMode, demand });

    return {
      demandSourceUsed: REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT,
      excelDemandInput,
      excelDemandNormalized,
      demand,
      ...missingDemand,
    };
  }

  if (!excelDemandInput) {
    return {
      demandSourceUsed: REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL,
      excelDemandInput,
      excelDemandNormalized,
      demand: null,
      missingDemandStatus: "excel-missing-demand",
      missingDemandLabel: "Sem Demanda/Tags no arquivo",
    };
  }

  const demand = excelDemandNormalized
    ? specialty?.demandsByNormalized?.get(excelDemandNormalized) || null
    : null;
  const missingDemand = resolveMissingDemandStatus({ specialtyMode, demand });

  return {
    demandSourceUsed: REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL,
    excelDemandInput,
    excelDemandNormalized,
    demand,
    ...missingDemand,
  };
}

export function bindDemandMetadata(row, specialty, demand, selectedCategory, resolution = {}) {
  const specialtyName = coerceText(specialty?.name);
  const specialtyNormalized = normalizeSpecialtyName(row?.especialidade || specialtyName);
  const category = demand
    ? extractDemandCategory(demand, selectedCategory)
    : { number: selectedCategory, title: "", content: "" };
  const resolvedCid = resolveDemandCidByBirthDate(demand || {}, row?.dataNascimento || "");
  const { status, statusLabel } = resolveCategoryStatus({
    row,
    specialty,
    demand,
    selectedCategory,
    resolution,
  });

  return {
    ...row,
    specialtyId: specialty?.id || null,
    specialtyName: specialtyName || null,
    specialtyMode: String(specialty?.demandSourceMode || "").trim() || "",
    specialtyNormalized,
    demandSourceUsed: resolution?.demandSourceUsed || "",
    excelDemandInput: resolution?.excelDemandInput || "",
    excelDemandNormalized: resolution?.excelDemandNormalized || "",
    demandId: demand?.id || null,
    demandName: coerceText(demand?.name) || null,
    demandDescription: coerceText(demand?.description) || null,
    demandIsActive: demand?.isActive == null ? null : Boolean(demand.isActive),
    demandCidInf: coerceText(demand?.cidInf) || "",
    demandCidAdult: coerceText(demand?.cidAdult) || "",
    resolvedCid: coerceText(resolvedCid?.value) || "",
    resolvedCidSource: coerceText(resolvedCid?.source) || "",
    resolvedCidAgeBand: coerceText(resolvedCid?.ageBand) || "",
    resolvedCidAge: typeof resolvedCid?.age === "number" ? resolvedCid.age : null,
    selectedCategory,
    categoryTitle: category.title,
    categoryContent: category.content,
    categoryStatus: status,
    categoryStatusLabel: statusLabel,
  };
}

export function buildMatchSummary(rows = []) {
  return rows.reduce((acc, row) => {
    if (row?.categoryStatus === "ready") acc.ready += 1;
    if (row?.categoryStatus === "missing-specialty") acc.missingSpecialty += 1;
    if (row?.categoryStatus === "specialty-not-found") acc.specialtyNotFound += 1;
    if (row?.categoryStatus === "inactive-specialty") acc.inactiveSpecialty += 1;
    if (row?.categoryStatus === "excel-missing-demand") acc.excelMissingDemand += 1;
    if (row?.categoryStatus === "excel-demand-not-found") acc.excelDemandNotFound += 1;
    if (row?.categoryStatus === "specialty-without-default-demand") acc.specialtyWithoutDefaultDemand += 1;
    if (row?.categoryStatus === "inactive-demand") acc.inactiveDemand += 1;
    if (row?.categoryStatus === "missing-category") acc.missingCategory += 1;
    return acc;
  }, { ...REPORT_IMPORT_MATCH_SUMMARY_TEMPLATE });
}
