
import { parseXlsxBuffer } from "@/lib/server/xlsxLite";

export const ADMIN_ANALYSIS_UPLOAD_CONFIG = {
  acceptedExtensions: [".xlsx"],
  maxFileSizeBytes: 8 * 1024 * 1024,
  maxPreviewRows: 12,
};

export const ADMIN_ANALYSIS_STATUS_OPTIONS = Object.freeze([
  "Agendado",
  "Confirmado",
  "Finalizado",
  "Reagendado",
  "Cancelado",
  "Ncompareceu",
]);

export const ADMIN_ANALYSIS_DEFAULT_FILTERS = Object.freeze({
  statusMode: "all",
  statuses: [],
  dateFrom: "",
  dateTo: "",
  ignorePatientMarkers: ["LIVRE"],
  ignoreEmptyPatientName: true,
});

export const ADMIN_ANALYSIS_RULES = Object.freeze({
  exactDuplicate: {
    id: "duplicidade_exata",
    label: "Duplicidade exata",
    description:
      "Mesmo paciente, mesma especialidade, mesmo profissional e mesma data/hora agendada.",
  },
  professionalConflictSameSpecialty: {
    id: "conflito_profissional_mesma_especialidade",
    label: "Conflito de profissional na mesma especialidade",
    description:
      "Mesmo paciente e mesma especialidade com profissionais diferentes, ignorando linhas cujo convênio contenha 'neuro'.",
  },
});

function cleanCellText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeaderLabel(value) {
  return cleanCellText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeComparableText(value) {
  return normalizeHeaderLabel(value);
}

function toFieldKey(value, index) {
  const normalized = normalizeHeaderLabel(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    return `coluna_${index + 1}`;
  }

  return normalized;
}

function inferFieldTags(label) {
  const normalized = normalizeHeaderLabel(label);
  const tags = [];

  if (/(^|\b)paciente(s)?(\b|$)|nome do paciente/.test(normalized)) tags.push("paciente");
  if (/(^|\b)profissional(\b|$)|terapeuta|psicolog/.test(normalized)) tags.push("profissional");
  if (/convenio|plano/.test(normalized)) tags.push("convenio");
  if (/status|situacao/.test(normalized)) tags.push("status");
  if (/nascimento|birth/.test(normalized)) tags.push("data_nascimento");
  if (/agendad|consulta|atendimento|horario|data e hora/.test(normalized)) tags.push("data_hora");
  if (/codigo|cod/.test(normalized)) tags.push("codigo");

  return tags;
}

function isRowEmpty(values = []) {
  return !values.some((value) => cleanCellText(value));
}

function buildRecord(headers = [], values = []) {
  return headers.reduce((acc, header) => {
    acc[header.key] = cleanCellText(values[header.index] ?? "");
    return acc;
  }, {});
}

function countBy(items = []) {
  return items.reduce((acc, item) => {
    const key = String(item || "").trim() || "desconhecido";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function hasTokens(label = "", tokens = []) {
  return tokens.every((token) => label.includes(token));
}

function findHeader(headers = [], options = {}) {
  const exact = (options.exact || []).map(normalizeComparableText).filter(Boolean);
  const includesAll = (options.includesAll || []).map((tokens) =>
    (Array.isArray(tokens) ? tokens : [tokens]).map(normalizeComparableText).filter(Boolean)
  );
  const includesAny = (options.includesAny || []).map(normalizeComparableText).filter(Boolean);
  const excludes = (options.excludes || []).map(normalizeComparableText).filter(Boolean);

  return (
    headers.find((header) => {
      const normalized = header.normalizedLabel;
      if (!normalized) return false;
      if (excludes.some((token) => normalized.includes(token))) return false;
      if (exact.includes(normalized)) return true;
      if (includesAll.some((tokens) => hasTokens(normalized, tokens))) return true;
      if (includesAny.some((token) => normalized.includes(token))) return true;
      return false;
    }) || null
  );
}

function resolveFieldMapping(headers = []) {
  const patientCode = findHeader(headers, {
    exact: ["cod paciente", "codigo paciente"],
    includesAll: [["paciente", "cod"], ["paciente", "codigo"]],
  });

  const professionalCode = findHeader(headers, {
    exact: ["cod profissional", "codigo profissional"],
    includesAll: [["profissional", "cod"], ["profissional", "codigo"]],
  });

  const specialty = findHeader(headers, {
    exact: ["especialidade"],
    includesAny: ["especialidade"],
  });

  const scheduledAt = findHeader(headers, {
    exact: ["data e hora agendada", "data/hora agendada", "horario agendado", "horario agenda"],
    includesAll: [["agendada", "data"], ["agendado", "data"], ["horario", "agendad"]],
    includesAny: ["data e hora agendada", "agendada"],
  });

  const convenio = findHeader(headers, {
    exact: ["convenio", "plano"],
    includesAny: ["convenio", "plano"],
  });

  const patientName = findHeader(headers, {
    exact: ["paciente", "nome do paciente"],
    includesAny: ["nome do paciente", "paciente"],
    excludes: ["cod", "codigo"],
  });

  const professionalName = findHeader(headers, {
    exact: ["profissional", "terapeuta"],
    includesAny: ["profissional", "terapeuta"],
    excludes: ["cod", "codigo"],
  });

  const status = findHeader(headers, {
    exact: ["status", "situacao"],
    includesAny: ["status", "situacao"],
  });

  return {
    patientCode: patientCode?.key || "",
    patientName: patientName?.key || "",
    professionalCode: professionalCode?.key || "",
    professionalName: professionalName?.key || "",
    specialty: specialty?.key || "",
    scheduledAt: scheduledAt?.key || "",
    convenio: convenio?.key || "",
    status: status?.key || "",
  };
}

function getFieldLabel(headers = [], key = "") {
  return headers.find((header) => header.key === key)?.label || "";
}

function buildFieldMappingDetails(headers = [], fieldMapping = {}) {
  const canonicalFieldLabels = {
    patientCode: "Código do paciente",
    patientName: "Paciente",
    professionalCode: "Código do profissional",
    professionalName: "Profissional",
    specialty: "Especialidade",
    scheduledAt: "Data e hora agendada",
    convenio: "Convênio",
    status: "Status",
  };

  return Object.entries(canonicalFieldLabels).map(([field, label]) => {
    const key = String(fieldMapping[field] || "").trim();
    return {
      field,
      label,
      key,
      sourceLabel: key ? getFieldLabel(headers, key) : "",
      found: Boolean(key),
    };
  });
}

function uniqueCleanList(values = []) {
  const output = [];
  const seen = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const clean = cleanCellText(value);
    const normalized = normalizeComparableText(clean);

    if (!clean || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(clean);
  }

  return output;
}

function parseDateInputValue(value) {
  const raw = cleanCellText(value);
  if (!raw) return null;

  const normalizedNumeric = raw.replace(",", ".");
  if (/^-?\d+(?:\.\d+)?$/.test(normalizedNumeric)) {
    const serial = Number(normalizedNumeric);
    if (Number.isFinite(serial) && serial > 0) {
      const excelEpochUtcMs = Date.UTC(1899, 11, 30);
      const serialMs = Math.round(serial * 24 * 60 * 60 * 1000);
      return {
        timestamp: excelEpochUtcMs + serialMs,
        isoDate: new Date(excelEpochUtcMs + serialMs).toISOString().slice(0, 10),
      };
    }
  }

  const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    let year = Number(brMatch[3]);
    const hour = Number(brMatch[4] || 0);
    const minute = Number(brMatch[5] || 0);
    const second = Number(brMatch[6] || 0);

    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }

    const timestamp = Date.UTC(year, month - 1, day, hour, minute, second);
    if (Number.isFinite(timestamp)) {
      return {
        timestamp,
        isoDate: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      };
    }
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const hour = Number(isoMatch[4] || 0);
    const minute = Number(isoMatch[5] || 0);
    const second = Number(isoMatch[6] || 0);
    const timestamp = Date.UTC(year, month - 1, day, hour, minute, second);

    if (Number.isFinite(timestamp)) {
      return {
        timestamp,
        isoDate: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      };
    }
  }

  return null;
}

function parseDateOnlyBoundary(value, boundary = "start") {
  const raw = cleanCellText(value);
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = boundary === "end" ? 23 : 0;
  const minutes = boundary === "end" ? 59 : 0;
  const seconds = boundary === "end" ? 59 : 0;
  const milliseconds = boundary === "end" ? 999 : 0;
  const timestamp = Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds);

  return Number.isFinite(timestamp) ? timestamp : null;
}

export function sanitizeAdminAnalysisFilters(input = {}) {
  const statusMode = String(input?.statusMode || ADMIN_ANALYSIS_DEFAULT_FILTERS.statusMode).trim() === "selected"
    ? "selected"
    : "all";
  const statuses = uniqueCleanList(input?.statuses || []);
  const ignorePatientMarkers = uniqueCleanList(
    (input?.ignorePatientMarkers || ADMIN_ANALYSIS_DEFAULT_FILTERS.ignorePatientMarkers).map((item) => item)
  );
  const dateFrom = cleanCellText(input?.dateFrom);
  const dateTo = cleanCellText(input?.dateTo);
  const dateFromMs = parseDateOnlyBoundary(dateFrom, "start");
  const dateToMs = parseDateOnlyBoundary(dateTo, "end");
  const ignoreEmptyPatientName = input?.ignoreEmptyPatientName !== false;

  const statusComparableSet = new Set(statuses.map((value) => normalizeComparableText(value)));
  const ignorePatientMarkerComparableSet = new Set(
    ignorePatientMarkers.map((value) => normalizeComparableText(value)).filter(Boolean)
  );

  return {
    statusMode,
    statuses,
    statusComparableSet,
    dateFrom,
    dateTo,
    dateFromMs,
    dateToMs,
    ignorePatientMarkers,
    ignorePatientMarkerComparableSet,
    ignoreEmptyPatientName,
  };
}

function createEligibleRow(rowIndex, record, fieldMapping, filters) {
  const patientCode = cleanCellText(record[fieldMapping.patientCode]);
  const patientName = cleanCellText(record[fieldMapping.patientName]);
  const professionalCode = cleanCellText(record[fieldMapping.professionalCode]);
  const professionalName = cleanCellText(record[fieldMapping.professionalName]);
  const specialty = cleanCellText(record[fieldMapping.specialty]);
  const scheduledAt = cleanCellText(record[fieldMapping.scheduledAt]);
  const convenio = cleanCellText(record[fieldMapping.convenio]);
  const status = cleanCellText(record[fieldMapping.status]);
  const patientNameComparable = normalizeComparableText(patientName);
  const convenioComparable = normalizeComparableText(convenio);
  const statusComparable = normalizeComparableText(status);
  const parsedScheduledAt = parseDateInputValue(scheduledAt);

  const ignoredReasons = [];
  if (!patientCode) ignoredReasons.push("sem_codigo_paciente");
  if (!specialty) ignoredReasons.push("sem_especialidade");
  if (!professionalCode) ignoredReasons.push("sem_codigo_profissional");

  if (filters?.ignoreEmptyPatientName && !patientName) {
    ignoredReasons.push("paciente_vazio");
  }

  if (patientNameComparable === "livre") {
    ignoredReasons.push("paciente_livre");
  } else if (
    patientNameComparable &&
    filters?.ignorePatientMarkerComparableSet?.size &&
    filters.ignorePatientMarkerComparableSet.has(patientNameComparable)
  ) {
    ignoredReasons.push("paciente_marcador_ignorado");
  }

  if (
    filters?.statusMode === "selected" &&
    filters?.statusComparableSet?.size &&
    !filters.statusComparableSet.has(statusComparable)
  ) {
    ignoredReasons.push("status_fora_do_filtro");
  }

  if (filters?.dateFromMs !== null || filters?.dateToMs !== null) {
    if (!parsedScheduledAt?.timestamp) {
      ignoredReasons.push("sem_data_agendada_para_filtro");
    } else {
      if (filters?.dateFromMs !== null && parsedScheduledAt.timestamp < filters.dateFromMs) {
        ignoredReasons.push("fora_periodo");
      }
      if (filters?.dateToMs !== null && parsedScheduledAt.timestamp > filters.dateToMs) {
        ignoredReasons.push("fora_periodo");
      }
    }
  }

  return {
    rowIndex,
    record,
    patientCode,
    patientName,
    professionalCode,
    professionalName,
    specialty,
    scheduledAt,
    scheduledAtIsoDate: parsedScheduledAt?.isoDate || "",
    convenio,
    status,
    hasNeuroConvenio: convenioComparable.includes("neuro"),
    ignoredReasons: Array.from(new Set(ignoredReasons)),
  };
}

function createFindingBase({ type, patientCode, patientName, specialty, rows, summary = {} }) {
  const firstRowIndex = Math.min(...rows.map((row) => row.rowIndex));
  return {
    id: `${type}:${patientCode}:${specialty}:${firstRowIndex}`,
    type,
    typeLabel:
      type === ADMIN_ANALYSIS_RULES.exactDuplicate.id
        ? ADMIN_ANALYSIS_RULES.exactDuplicate.label
        : ADMIN_ANALYSIS_RULES.professionalConflictSameSpecialty.label,
    patientCode,
    patientName,
    specialty,
    rowCount: rows.length,
    firstRowIndex,
    summary,
    rows: rows
      .slice()
      .sort((a, b) => a.rowIndex - b.rowIndex)
      .map((row) => ({
        rowIndex: row.rowIndex,
        patientCode: row.patientCode,
        patientName: row.patientName,
        professionalCode: row.professionalCode,
        professionalName: row.professionalName,
        specialty: row.specialty,
        scheduledAt: row.scheduledAt,
        scheduledAtIsoDate: row.scheduledAtIsoDate,
        convenio: row.convenio,
        status: row.status,
        hasNeuroConvenio: row.hasNeuroConvenio,
      })),
  };
}

function pushGroupedFindings({ groups = new Map(), findings = [], buildFinding }) {
  groups.forEach((rows) => {
    if (!Array.isArray(rows) || rows.length < 2) return;
    findings.push(buildFinding(rows));
  });
}

function sortFindings(findings = []) {
  return findings.sort((a, b) => {
    if (a.firstRowIndex !== b.firstRowIndex) return a.firstRowIndex - b.firstRowIndex;
    return String(a.typeLabel || "").localeCompare(String(b.typeLabel || ""), "pt-BR");
  });
}

export function buildAdminAnalysisFromRows({
  fileName = "upload.xlsx",
  fileSize = 0,
  sheetName = "Sheet1",
  sheetCount = 1,
  rawRows = [],
  filters = {},
} = {}) {
  if (!Array.isArray(rawRows) || !rawRows.length) {
    throw new Error("Planilha sem linhas legíveis.");
  }

  const firstNonEmptyRowIndex = rawRows.findIndex((row) => !isRowEmpty(row));
  if (firstNonEmptyRowIndex < 0) {
    throw new Error("Planilha sem conteúdo utilizável.");
  }

  const normalizedFilters = sanitizeAdminAnalysisFilters(filters);
  const headerValues = rawRows[firstNonEmptyRowIndex] || [];
  const headers = headerValues.map((label, index) => {
    const cleanLabel = cleanCellText(label) || `Coluna ${index + 1}`;
    return {
      index,
      label: cleanLabel,
      key: toFieldKey(cleanLabel, index),
      normalizedLabel: normalizeHeaderLabel(cleanLabel),
      inferredTags: inferFieldTags(cleanLabel),
    };
  });

  const fieldMapping = resolveFieldMapping(headers);
  const fieldMappingDetails = buildFieldMappingDetails(headers, fieldMapping);
  const missingRequiredFields = fieldMappingDetails.filter(
    (item) =>
      ["patientCode", "professionalCode", "specialty", "scheduledAt", "convenio"].includes(item.field) &&
      !item.found
  );

  const dataRows = rawRows.slice(firstNonEmptyRowIndex + 1);
  const previewRows = [];
  const eligibleRows = [];
  const ignoredRows = [];
  let emptyRowsSkipped = 0;
  const availableStatuses = [];

  dataRows.forEach((rowValues, rowOffset) => {
    if (isRowEmpty(rowValues)) {
      emptyRowsSkipped += 1;
      return;
    }

    const rowIndex = firstNonEmptyRowIndex + rowOffset + 2;
    const values = headers.map((header) => cleanCellText(rowValues[header.index] ?? ""));
    const record = buildRecord(headers, rowValues);
    const row = createEligibleRow(rowIndex, record, fieldMapping, normalizedFilters);

    if (row.status) {
      availableStatuses.push(row.status);
    }

    if (previewRows.length < ADMIN_ANALYSIS_UPLOAD_CONFIG.maxPreviewRows) {
      previewRows.push({
        rowIndex,
        values,
        record,
      });
    }

    if (row.ignoredReasons.length) {
      ignoredRows.push(row);
      return;
    }

    eligibleRows.push(row);
  });

  const findings = [];
  const exactGroups = new Map();

  eligibleRows.forEach((row) => {
    if (!row.scheduledAt) return;
    const key = [row.patientCode, row.specialty, row.professionalCode, row.scheduledAt].join("¦");
    const group = exactGroups.get(key) || [];
    group.push(row);
    exactGroups.set(key, group);
  });

  pushGroupedFindings({
    groups: exactGroups,
    findings,
    buildFinding: (rows) =>
      createFindingBase({
        type: ADMIN_ANALYSIS_RULES.exactDuplicate.id,
        patientCode: rows[0]?.patientCode || "",
        patientName: rows[0]?.patientName || "",
        specialty: rows[0]?.specialty || "",
        rows,
        summary: {
          professionalCount: new Set(rows.map((row) => row.professionalCode)).size,
          scheduledAt: rows[0]?.scheduledAt || "",
        },
      }),
  });

  const patientSpecialtyGroups = new Map();
  eligibleRows.forEach((row) => {
    const key = [row.patientCode, row.specialty].join("¦");
    const group = patientSpecialtyGroups.get(key) || [];
    group.push(row);
    patientSpecialtyGroups.set(key, group);
  });

  patientSpecialtyGroups.forEach((rows) => {
    const nonNeuroRows = rows.filter((row) => !row.hasNeuroConvenio);
    const professionalCodes = new Set(nonNeuroRows.map((row) => row.professionalCode).filter(Boolean));

    if (professionalCodes.size < 2) {
      return;
    }

    findings.push(
      createFindingBase({
        type: ADMIN_ANALYSIS_RULES.professionalConflictSameSpecialty.id,
        patientCode: rows[0]?.patientCode || "",
        patientName: rows[0]?.patientName || "",
        specialty: rows[0]?.specialty || "",
        rows: nonNeuroRows,
        summary: {
          professionalCount: professionalCodes.size,
          neuroRowsIgnored: rows.length - nonNeuroRows.length,
          scheduledAtList: Array.from(new Set(nonNeuroRows.map((row) => row.scheduledAt).filter(Boolean))).sort(),
        },
      })
    );
  });

  const findingsSorted = sortFindings(findings);
  const exactFindings = findingsSorted.filter((item) => item.type === ADMIN_ANALYSIS_RULES.exactDuplicate.id);
  const conflictFindings = findingsSorted.filter(
    (item) => item.type === ADMIN_ANALYSIS_RULES.professionalConflictSameSpecialty.id
  );
  const ignoredRowsSorted = ignoredRows.slice().sort((a, b) => a.rowIndex - b.rowIndex);
  const activeFiltersSummary = [];

  if (normalizedFilters.statusMode === "selected" && normalizedFilters.statuses.length) {
    activeFiltersSummary.push(`Status considerados: ${normalizedFilters.statuses.join(", ")}.`);
  } else {
    activeFiltersSummary.push("Status considerados: todos os encontrados no arquivo.");
  }

  if (normalizedFilters.dateFrom || normalizedFilters.dateTo) {
    activeFiltersSummary.push(
      `Período aplicado: ${normalizedFilters.dateFrom || "início aberto"} até ${normalizedFilters.dateTo || "fim aberto"}.`
    );
  } else {
    activeFiltersSummary.push("Período aplicado: todo o arquivo.");
  }

  activeFiltersSummary.push(
    normalizedFilters.ignorePatientMarkers.length
      ? `Marcadores de paciente ignorados: ${normalizedFilters.ignorePatientMarkers.join(", ")}.`
      : "Marcadores de paciente ignorados: nenhum marcador textual configurado."
  );

  if (normalizedFilters.ignoreEmptyPatientName) {
    activeFiltersSummary.push("Linhas com nome de paciente vazio também são ignoradas.");
  }

  return {
    file: {
      name: String(fileName || "upload.xlsx").trim() || "upload.xlsx",
      size: Number(fileSize || 0),
      extension: ".xlsx",
    },
    workbook: {
      sheetName: String(sheetName || "Sheet1"),
      sheetCount: Number(sheetCount || 1),
    },
    filters: {
      statusMode: normalizedFilters.statusMode,
      statuses: normalizedFilters.statuses,
      dateFrom: normalizedFilters.dateFrom,
      dateTo: normalizedFilters.dateTo,
      ignorePatientMarkers: normalizedFilters.ignorePatientMarkers,
      ignoreEmptyPatientName: normalizedFilters.ignoreEmptyPatientName,
      availableStatuses: Object.entries(countBy(availableStatuses))
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => String(a.status || "").localeCompare(String(b.status || ""), "pt-BR")),
      summary: activeFiltersSummary,
    },
    structure: {
      headerRowIndex: firstNonEmptyRowIndex + 1,
      headers,
      candidateFields: headers.map((header) => ({
        key: header.key,
        label: header.label,
        inferredTags: header.inferredTags,
      })),
      fieldMapping,
      fieldMappingDetails,
      missingRequiredFields,
    },
    summary: {
      totalRows: rawRows.length,
      dataRows: dataRows.length - emptyRowsSkipped,
      emptyRowsSkipped,
      previewRows: previewRows.length,
      columns: headers.length,
      analyzedRows: eligibleRows.length,
      ignoredRows: ignoredRowsSorted.length,
      ignoredBreakdown: countBy(ignoredRowsSorted.flatMap((row) => row.ignoredReasons)),
      neuroRowsIgnoredFromProfessionalRule: eligibleRows.filter((row) => row.hasNeuroConvenio).length,
      exactDuplicateGroups: exactFindings.length,
      exactDuplicateRows: exactFindings.reduce((acc, item) => acc + item.rowCount, 0),
      professionalConflictGroups: conflictFindings.length,
      professionalConflictRows: conflictFindings.reduce((acc, item) => acc + item.rowCount, 0),
      totalFindings: findingsSorted.length,
      totalRowsInFindings: findingsSorted.reduce((acc, item) => acc + item.rowCount, 0),
      filteredOutByStatus: ignoredRowsSorted.filter((row) => row.ignoredReasons.includes("status_fora_do_filtro")).length,
      filteredOutByDate: ignoredRowsSorted.filter(
        (row) =>
          row.ignoredReasons.includes("fora_periodo") ||
          row.ignoredReasons.includes("sem_data_agendada_para_filtro")
      ).length,
      ignoredPatientMarkersRows: ignoredRowsSorted.filter(
        (row) =>
          row.ignoredReasons.includes("paciente_livre") ||
          row.ignoredReasons.includes("paciente_marcador_ignorado") ||
          row.ignoredReasons.includes("paciente_vazio")
      ).length,
    },
    rules: Object.values(ADMIN_ANALYSIS_RULES),
    findings: findingsSorted,
    ignoredRows: ignoredRowsSorted.map((row) => ({
      rowIndex: row.rowIndex,
      patientCode: row.patientCode,
      patientName: row.patientName,
      specialty: row.specialty,
      professionalCode: row.professionalCode,
      professionalName: row.professionalName,
      scheduledAt: row.scheduledAt,
      scheduledAtIsoDate: row.scheduledAtIsoDate,
      convenio: row.convenio,
      status: row.status,
      hasNeuroConvenio: row.hasNeuroConvenio,
      ignoredReasons: row.ignoredReasons,
    })),
    ignoredRowsPreview: ignoredRowsSorted.slice(0, 12).map((row) => ({
      rowIndex: row.rowIndex,
      patientCode: row.patientCode,
      patientName: row.patientName,
      specialty: row.specialty,
      professionalCode: row.professionalCode,
      professionalName: row.professionalName,
      scheduledAt: row.scheduledAt,
      scheduledAtIsoDate: row.scheduledAtIsoDate,
      convenio: row.convenio,
      status: row.status,
      hasNeuroConvenio: row.hasNeuroConvenio,
      ignoredReasons: row.ignoredReasons,
    })),
    previewRows,
    assumptions: [
      "A primeira linha não vazia foi considerada como cabeçalho da planilha.",
      "Duplicidade exata: mesmo paciente + mesma especialidade + mesmo profissional + mesma data/hora.",
      "Conflito de profissional: mesma especialidade do mesmo paciente com profissionais diferentes, ignorando linhas cujo convênio contenha 'neuro'.",
      "Linhas com paciente 'LIVRE', nome vazio, sem código do paciente/profissional/especialidade ou fora dos filtros configurados são ignoradas para evitar falso positivo.",
      ...activeFiltersSummary,
    ],
  };
}

export function analyzeAdminExcelFile({ buffer, fileName = "upload.xlsx", fileSize = 0, filters = {} } = {}) {
  const parsed = parseXlsxBuffer(buffer, { sheetIndex: 0 });

  return buildAdminAnalysisFromRows({
    buffer,
    fileName,
    fileSize,
    sheetName: parsed?.sheetName,
    sheetCount: parsed?.sheetCount,
    rawRows: Array.isArray(parsed?.rows) ? parsed.rows : [],
    filters,
  });
}
