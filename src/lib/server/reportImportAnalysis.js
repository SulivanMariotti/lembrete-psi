import admin from "@/lib/firebaseAdmin";
import { parseXlsxBuffer } from "@/lib/server/xlsxLite";
import {
  REPORT_IMPORT_TEMPLATE,
  validateTemplateHeaders,
  normalizeImportedRow,
} from "@/lib/shared/reportImportTemplate";
import {
  REPORT_DEMAND_CATEGORY_OPTIONS,
  normalizeDemandName,
  extractDemandCategory,
  resolveDemandCidByBirthDate,
  formatBirthDateDisplay,
} from "@/lib/shared/reportDemands";
import {
  REPORT_SPECIALTY_DEMAND_SOURCE_MODES,
  normalizeSpecialtyName,
} from "@/lib/shared/reportSpecialties";
import { mapTemplateToForm } from "@/lib/shared/reportTemplates";

const REPORT_IMPORT_SPECIALTIES_CACHE_TTL_MS = 15_000;
const REPORT_IMPORT_ALLOW_LEGACY_CATALOG_FALLBACK =
  String(process.env.REPORT_IMPORT_ALLOW_LEGACY_CATALOG_FALLBACK || "true").trim().toLowerCase() !== "false";

export function getReportImportCatalogPolicy() {
  return {
    primaryStrategy: "collectionGroup(demands)",
    legacyFallbackEnabled: REPORT_IMPORT_ALLOW_LEGACY_CATALOG_FALLBACK,
    cacheTtlMs: REPORT_IMPORT_SPECIALTIES_CACHE_TTL_MS,
  };
}

const specialtiesCache = {
  expiresAt: 0,
  value: null,
  promise: null,
};

function buildRowObject(headers = [], values = []) {
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? "";
  });
  return row;
}

function isEmptyRow(values = []) {
  return !values.some((value) => String(value || "").trim());
}

function serializeFirestoreValue(value) {
  if (value == null) return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = serializeFirestoreValue(nested);
    }
    return out;
  }
  return value;
}

function serializeTemplateDoc(doc) {
  return mapTemplateToForm({
    id: doc.id,
    ...serializeFirestoreValue(doc.data() || {}),
  });
}

function coerceText(value) {
  return String(value || "").trim();
}

function serializeDemandDoc(doc) {
  const demand = { id: doc.id, ...serializeFirestoreValue(doc.data() || {}) };
  const demandNormalized = String(demand?.nameNormalized || normalizeDemandName(demand?.name || "")).trim();
  return {
    ...demand,
    nameNormalized: demandNormalized,
  };
}

function buildSpecialtiesIndex(specialtyDocs = [], demandsBySpecialtyId = new Map()) {
  const byNormalized = new Map();

  specialtyDocs.forEach((doc) => {
    const specialty = { id: doc.id, ...serializeFirestoreValue(doc.data() || {}) };
    const normalized = String(specialty?.nameNormalized || normalizeSpecialtyName(specialty?.name || "")).trim();
    if (!normalized || byNormalized.has(normalized)) return;

    const demands = Array.isArray(demandsBySpecialtyId.get(doc.id)) ? demandsBySpecialtyId.get(doc.id) : [];

    byNormalized.set(normalized, {
      ...specialty,
      nameNormalized: normalized,
      demandSourceMode:
        String(specialty?.demandSourceMode || "").trim() || REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL,
      defaultDemandId: String(specialty?.defaultDemandId || "").trim(),
      demands,
      demandsByNormalized: new Map(demands.map((demand) => [demand.nameNormalized, demand])),
    });
  });

  return byNormalized;
}

async function loadSpecialtiesWithDemandsViaCollectionGroup(db) {
  const [specialtiesSnap, allDemandsSnap] = await Promise.all([
    db.collection("report_specialties").limit(200).get(),
    db.collectionGroup("demands").get(),
  ]);

  const demandsBySpecialtyId = new Map();

  allDemandsSnap.docs.forEach((doc) => {
    const specialtyRef = doc.ref.parent?.parent;
    const specialtyId = String(specialtyRef?.id || "").trim();
    const specialtyCollectionId = String(specialtyRef?.parent?.id || "").trim();

    if (!specialtyId || specialtyCollectionId !== "report_specialties") return;

    const list = demandsBySpecialtyId.get(specialtyId) || [];
    list.push(serializeDemandDoc(doc));
    demandsBySpecialtyId.set(specialtyId, list);
  });

  return buildSpecialtiesIndex(specialtiesSnap.docs, demandsBySpecialtyId);
}

async function loadSpecialtiesWithDemandsLegacy(db) {
  const snap = await db.collection("report_specialties").limit(200).get();
  const demandSnaps = await Promise.all(
    snap.docs.map((doc) =>
      doc.ref.collection("demands").limit(500).get().catch(() => null)
    )
  );

  const demandsBySpecialtyId = new Map();
  snap.docs.forEach((doc, index) => {
    const demandsSnap = demandSnaps[index];
    const demands = demandsSnap?.docs?.map(serializeDemandDoc) || [];
    demandsBySpecialtyId.set(doc.id, demands);
  });

  return buildSpecialtiesIndex(snap.docs, demandsBySpecialtyId);
}

export function invalidateReportImportCatalogCache() {
  specialtiesCache.expiresAt = 0;
  specialtiesCache.value = null;
  specialtiesCache.promise = null;
}

async function listSpecialtiesWithDemands({ forceFresh = false } = {}) {
  const now = Date.now();
  if (!forceFresh && specialtiesCache.value && specialtiesCache.expiresAt > now) {
    return specialtiesCache.value;
  }

  if (!forceFresh && specialtiesCache.promise) {
    return specialtiesCache.promise;
  }

  const db = admin.firestore();
  specialtiesCache.promise = (async () => {
    let byNormalized = null;
    try {
      byNormalized = await loadSpecialtiesWithDemandsViaCollectionGroup(db);
    } catch (error) {
      if (!REPORT_IMPORT_ALLOW_LEGACY_CATALOG_FALLBACK) {
        throw error;
      }
      byNormalized = await loadSpecialtiesWithDemandsLegacy(db);
    }

    specialtiesCache.value = byNormalized;
    specialtiesCache.expiresAt = Date.now() + REPORT_IMPORT_SPECIALTIES_CACHE_TTL_MS;
    return byNormalized;
  })();

  try {
    return await specialtiesCache.promise;
  } finally {
    specialtiesCache.promise = null;
  }
}

export async function listReportTemplates() {
  const snap = await admin.firestore().collection("report_templates").limit(100).get();
  const items = snap.docs.map(serializeTemplateDoc);
  items.sort((a, b) => {
    if (Boolean(b?.isActive) !== Boolean(a?.isActive)) return Number(Boolean(b?.isActive)) - Number(Boolean(a?.isActive));
    return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR");
  });
  return items;
}

export async function resolveSelectedReportTemplate(templateId) {
  const db = admin.firestore();
  const explicitId = String(templateId || "").trim();

  if (explicitId) {
    const snap = await db.collection("report_templates").doc(explicitId).get();
    if (snap.exists) {
      return serializeTemplateDoc(snap);
    }
  }

  const activeSnap = await db.collection("report_templates").where("isActive", "==", true).limit(1).get();
  if (!activeSnap.empty) {
    return serializeTemplateDoc(activeSnap.docs[0]);
  }

  return null;
}

export function parseSelectedCategory(rawValue) {
  const parsed = Number(String(rawValue || "1").trim());
  if (REPORT_DEMAND_CATEGORY_OPTIONS.includes(parsed)) return parsed;
  return 1;
}

function buildPreparedRow(sourceRow = {}, index = 0) {
  const normalized = normalizeImportedRow(sourceRow);

  return {
    rowIndex: index + 2,
    ...normalized,
    codigoPaciente: coerceText(sourceRow["Cód paciente"]),
    dataNascimento: formatBirthDateDisplay(sourceRow["Data de Nascimento"]),
    dataHoraCriada: coerceText(sourceRow["Data e hora Criada"]),
    tipoAtendimento: coerceText(sourceRow["Tipo de atendimento"]),
    valor: coerceText(sourceRow["Valor"]),
    recebido: coerceText(sourceRow["Recebido"]),
    statusSecundario: coerceText(sourceRow["Status secundário"]),
    telefone: coerceText(sourceRow["Telefone"]),
    cidade: coerceText(sourceRow["Cidade"]),
    observacao: coerceText(sourceRow["Observação"]),
    cpf: coerceText(sourceRow["CPF"]),
    plano: coerceText(sourceRow["Plano"]),
    nomeAgendou: coerceText(sourceRow["Nome agendou"]),
    entradaPaciente: coerceText(sourceRow["Entrada do paciente"]),
    saidaPaciente: coerceText(sourceRow["Saída do paciente"]),
    entradaProfissional: coerceText(sourceRow["Entrada do profissional"]),
    saidaProfissional: coerceText(sourceRow["Saída do profissional"]),
    motivoBloqueio: coerceText(sourceRow["Motivo de Bloqueio"]),
    motivoCancelamento: coerceText(sourceRow["Motivo do cancelamento"]),
    sourceRow,
  };
}

function buildDemandResolution(row, specialty) {
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

    return {
      demandSourceUsed: REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT,
      excelDemandInput,
      excelDemandNormalized,
      demand,
      missingDemandStatus: demand ? "" : "specialty-without-default-demand",
      missingDemandLabel: demand ? "" : "Especialidade sem Demanda padrão",
    };
  }

  const demand = excelDemandNormalized
    ? specialty?.demandsByNormalized?.get(excelDemandNormalized) || null
    : null;

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

  return {
    demandSourceUsed: REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL,
    excelDemandInput,
    excelDemandNormalized,
    demand,
    missingDemandStatus: demand ? "" : "excel-demand-not-found",
    missingDemandLabel: demand ? "" : "Demanda da planilha não encontrada",
  };
}

export function bindDemandMetadata(row, specialty, demand, selectedCategory, resolution = {}) {
  const specialtyName = coerceText(specialty?.name);
  const specialtyNormalized = normalizeSpecialtyName(row?.especialidade || specialtyName);
  const category = demand
    ? extractDemandCategory(demand, selectedCategory)
    : { number: selectedCategory, title: "", content: "" };
  const resolvedCid = resolveDemandCidByBirthDate(demand || {}, row?.dataNascimento || "");

  let status = "ready";
  let statusLabel = "Pronto";

  if (!coerceText(row?.especialidade)) {
    status = "missing-specialty";
    statusLabel = "Especialidade em branco";
  } else if (!specialty) {
    status = "specialty-not-found";
    statusLabel = "Especialidade não encontrada";
  } else if (specialty?.isActive === false) {
    status = "inactive-specialty";
    statusLabel = "Especialidade inativa";
  } else if (!demand) {
    status = resolution?.missingDemandStatus || "missing-demand";
    statusLabel = resolution?.missingDemandLabel || "Demanda não encontrada";
  } else if (demand?.isActive === false) {
    status = "inactive-demand";
    statusLabel = "Demanda inativa";
  } else if (!category.content) {
    status = "missing-category";
    statusLabel = `Categoria ${selectedCategory} vazia`;
  }

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
  const initialMatchSummary = {
    ready: 0,
    missingSpecialty: 0,
    specialtyNotFound: 0,
    inactiveSpecialty: 0,
    excelMissingDemand: 0,
    excelDemandNotFound: 0,
    specialtyWithoutDefaultDemand: 0,
    inactiveDemand: 0,
    missingCategory: 0,
  };

  return rows.reduce((acc, row) => {
    if (row.categoryStatus === "ready") acc.ready += 1;
    if (row.categoryStatus === "missing-specialty") acc.missingSpecialty += 1;
    if (row.categoryStatus === "specialty-not-found") acc.specialtyNotFound += 1;
    if (row.categoryStatus === "inactive-specialty") acc.inactiveSpecialty += 1;
    if (row.categoryStatus === "excel-missing-demand") acc.excelMissingDemand += 1;
    if (row.categoryStatus === "excel-demand-not-found") acc.excelDemandNotFound += 1;
    if (row.categoryStatus === "specialty-without-default-demand") acc.specialtyWithoutDefaultDemand += 1;
    if (row.categoryStatus === "inactive-demand") acc.inactiveDemand += 1;
    if (row.categoryStatus === "missing-category") acc.missingCategory += 1;
    return acc;
  }, initialMatchSummary);
}

export async function analyzeReportImportFile({
  fileName = "",
  fileSize = 0,
  buffer,
  selectedCategory = 1,
  templateId = "",
}) {
  const workbook = parseXlsxBuffer(buffer, { sheetIndex: 0 });
  const [headerRow = [], ...dataRows] = workbook.rows || [];
  const headers = (headerRow || []).map((value) => String(value || "").trim());

  if (!headers.length) {
    throw new Error("A planilha está vazia ou sem cabeçalho legível.");
  }

  const validation = validateTemplateHeaders(headers);
  if (!validation?.ok) {
    const error = new Error("A planilha não corresponde ao template esperado.");
    error.code = "invalid-template-headers";
    error.validation = validation;
    throw error;
  }

  const nonEmptyRows = dataRows.filter((row) => !isEmptyRow(row));
  const rowObjects = nonEmptyRows.map((values) => buildRowObject(headers, values));
  const preparedRows = rowObjects.map((row, index) => buildPreparedRow(row, index));
  const specialtiesByNormalizedName = await listSpecialtiesWithDemands();
  const selectedTemplate = await resolveSelectedReportTemplate(templateId);

  const distinctProfessionals = new Set();
  const distinctStatuses = new Set();
  const distinctConvenios = new Set();
  const distinctSpecialties = new Set();

  const matchedRows = preparedRows.map((row) => {
    if (row.profissional) distinctProfessionals.add(row.profissional);
    if (row.status) distinctStatuses.add(row.status);
    if (row.convenio) distinctConvenios.add(row.convenio);
    if (row.especialidade) distinctSpecialties.add(row.especialidade);

    const normalizedSpecialty = normalizeSpecialtyName(row.especialidade);
    const specialty = normalizedSpecialty ? specialtiesByNormalizedName.get(normalizedSpecialty) : null;
    const resolution = buildDemandResolution(row, specialty);
    return bindDemandMetadata(row, specialty, resolution.demand, selectedCategory, resolution);
  });

  const matchSummary = buildMatchSummary(matchedRows);

  return {
    template: {
      id: REPORT_IMPORT_TEMPLATE.id,
      sourceLabel: REPORT_IMPORT_TEMPLATE.sourceLabel,
      expectedHeaders: REPORT_IMPORT_TEMPLATE.requiredHeaders,
      previewColumns: REPORT_IMPORT_TEMPLATE.previewColumns,
    },
    selectedTemplate,
    file: {
      name: String(fileName || ""),
      size: Number(fileSize || 0),
    },
    workbook: {
      sheetName: workbook.sheetName,
      sheetCount: workbook.sheetCount,
    },
    validation,
    summary: {
      totalRows: rowObjects.length,
      professionals: distinctProfessionals.size,
      statuses: Array.from(distinctStatuses).sort((a, b) => a.localeCompare(b, "pt-BR")),
      convenios: Array.from(distinctConvenios).sort((a, b) => a.localeCompare(b, "pt-BR")),
      specialties: Array.from(distinctSpecialties).sort((a, b) => a.localeCompare(b, "pt-BR")),
    },
    selectedCategory,
    matchSummary,
    matchedRows,
    readyRows: matchedRows.filter((row) => row.categoryStatus === "ready"),
    previewRows: matchedRows.slice(0, 20),
    importedAt: new Date().toISOString(),
    assumptions: [
      "Leitura da primeira aba do arquivo.",
      "Pré-análise do arquivo antes do snapshot temporário do resultado.",
      "Especialidade é a validação principal do lote.",
      "Especialidades em modo excel usam a coluna Demanda e fazem fallback em Tags quando ela vier vazia.",
      "CID e Categoria são resolvidos a partir da Demanda encontrada no sistema.",
      "Catálogo de Especialidades/Demandas com cache curto em memória e fallback seguro para leitura tradicional.",
      selectedTemplate
        ? `Modelo aplicado no lote: ${selectedTemplate.name}.`
        : "Sem modelo ativo/selecionado; o PDF usa a estrutura padrão de segurança.",
    ],
  };
}
