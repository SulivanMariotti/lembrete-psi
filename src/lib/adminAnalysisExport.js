
export const IGNORED_REASON_LABELS = {
  paciente_livre: "Paciente LIVRE",
  paciente_vazio: "Paciente vazio",
  paciente_marcador_ignorado: "Marcador de paciente ignorado",
  sem_codigo_paciente: "Sem código do paciente",
  sem_especialidade: "Sem especialidade",
  sem_codigo_profissional: "Sem código do profissional",
  status_fora_do_filtro: "Status fora do filtro",
  fora_periodo: "Fora do período",
  sem_data_agendada_para_filtro: "Sem data para o filtro de período",
};

const CSV_EXPORT_DEFINITIONS = [
  {
    key: "duplicidades-exatas",
    label: "Duplicidade exata",
    fileSuffix: "duplicidades-exatas",
    type: "duplicidade_exata",
    emptyMessage: "Nenhuma linha com duplicidade exata para exportar.",
  },
  {
    key: "conflitos-profissional",
    label: "Conflito de profissional",
    fileSuffix: "conflitos-profissional",
    type: "conflito_profissional_mesma_especialidade",
    emptyMessage: "Nenhuma linha com conflito de profissional para exportar.",
  },
  {
    key: "linhas-ignoradas",
    label: "Linhas ignoradas",
    fileSuffix: "linhas-ignoradas",
    type: "ignored_rows",
    emptyMessage: "Nenhuma linha ignorada para exportar.",
  },
];

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFileBaseName(fileName = "analise.xlsx") {
  const raw = cleanText(fileName).replace(/\.[^.]+$/, "") || "analise";
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "analise";
}

function formatReasonList(reasons = []) {
  return (Array.isArray(reasons) ? reasons : [])
    .map((reason) => IGNORED_REASON_LABELS[reason] || cleanText(reason))
    .filter(Boolean)
    .join(" | ");
}

function makeFindingReason(finding = {}) {
  if (finding.type === "duplicidade_exata") {
    return "Mesmo paciente + mesma especialidade + mesmo profissional + mesma data/hora agendada.";
  }

  if (finding.type === "conflito_profissional_mesma_especialidade") {
    return "Mesmo paciente + mesma especialidade + profissionais diferentes, sem exceção de convênio contendo 'neuro'.";
  }

  return cleanText(finding.typeLabel) || "Ocorrência encontrada na análise.";
}

function buildFindingExportRows(findings = [], type = "") {
  return findings
    .filter((finding) => !type || finding?.type === type)
    .flatMap((finding) => {
      const reason = makeFindingReason(finding);
      const firstRowIndex = Number(finding?.firstRowIndex || 0);
      const rowCount = Number(finding?.rowCount || 0);

      return (Array.isArray(finding?.rows) ? finding.rows : []).map((row) => ({
        grupo_id: cleanText(finding.id),
        tipo_ocorrencia: cleanText(finding.typeLabel),
        motivo: reason,
        linha_original: Number(row?.rowIndex || 0),
        primeira_linha_grupo: firstRowIndex || "",
        total_linhas_grupo: rowCount || "",
        codigo_paciente: cleanText(row?.patientCode || finding?.patientCode),
        paciente: cleanText(row?.patientName || finding?.patientName),
        especialidade: cleanText(row?.specialty || finding?.specialty),
        codigo_profissional: cleanText(row?.professionalCode),
        profissional: cleanText(row?.professionalName),
        data_hora_agendada: cleanText(row?.scheduledAt),
        convenio: cleanText(row?.convenio),
        status: cleanText(row?.status),
        contem_neuro_no_convenio: row?.hasNeuroConvenio ? "sim" : "nao",
      }));
    })
    .sort((a, b) => {
      if (a.primeira_linha_grupo !== b.primeira_linha_grupo) {
        return Number(a.primeira_linha_grupo || 0) - Number(b.primeira_linha_grupo || 0);
      }
      return Number(a.linha_original || 0) - Number(b.linha_original || 0);
    });
}

function buildIgnoredExportRows(ignoredRows = []) {
  return (Array.isArray(ignoredRows) ? ignoredRows : [])
    .map((row) => ({
      grupo_id: "",
      tipo_ocorrencia: "Linha ignorada",
      motivo: formatReasonList(row?.ignoredReasons),
      linha_original: Number(row?.rowIndex || 0),
      primeira_linha_grupo: "",
      total_linhas_grupo: "",
      codigo_paciente: cleanText(row?.patientCode),
      paciente: cleanText(row?.patientName),
      especialidade: cleanText(row?.specialty),
      codigo_profissional: cleanText(row?.professionalCode),
      profissional: cleanText(row?.professionalName),
      data_hora_agendada: cleanText(row?.scheduledAt),
      convenio: cleanText(row?.convenio),
      status: cleanText(row?.status),
      contem_neuro_no_convenio: row?.hasNeuroConvenio ? "sim" : "nao",
    }))
    .sort((a, b) => Number(a.linha_original || 0) - Number(b.linha_original || 0));
}

export function buildAdminAnalysisExportRows(analysis = {}) {
  const findings = Array.isArray(analysis?.findings) ? analysis.findings : [];
  const ignoredRows = Array.isArray(analysis?.ignoredRows) ? analysis.ignoredRows : [];

  return {
    exactDuplicateRows: buildFindingExportRows(findings, "duplicidade_exata"),
    professionalConflictRows: buildFindingExportRows(findings, "conflito_profissional_mesma_especialidade"),
    ignoredRows: buildIgnoredExportRows(ignoredRows),
  };
}

export function convertRowsToCsv(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const columns = [
    "grupo_id",
    "tipo_ocorrencia",
    "motivo",
    "linha_original",
    "primeira_linha_grupo",
    "total_linhas_grupo",
    "codigo_paciente",
    "paciente",
    "especialidade",
    "codigo_profissional",
    "profissional",
    "data_hora_agendada",
    "convenio",
    "status",
    "contem_neuro_no_convenio",
  ];

  const headerLine = columns.join(";");
  const dataLines = safeRows.map((row) =>
    columns
      .map((column) => {
        const value = cleanText(row?.[column]);
        if (!value) return "";
        const escaped = value.replace(/"/g, '""');
        return /[;"\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
      })
      .join(";")
  );

  return `\ufeff${[headerLine, ...dataLines].join("\r\n")}`;
}

export function buildAdminAnalysisExportBundles({ analysis = {}, fileName = "" } = {}) {
  const rows = buildAdminAnalysisExportRows(analysis);
  const baseName = sanitizeFileBaseName(fileName || analysis?.file?.name || "analise.xlsx");

  return CSV_EXPORT_DEFINITIONS.map((definition) => {
    const exportRows =
      definition.type === "ignored_rows"
        ? rows.ignoredRows
        : definition.type === "duplicidade_exata"
          ? rows.exactDuplicateRows
          : rows.professionalConflictRows;

    return {
      key: definition.key,
      label: definition.label,
      fileName: `${baseName}-${definition.fileSuffix}.csv`,
      rowCount: exportRows.length,
      emptyMessage: definition.emptyMessage,
      csv: convertRowsToCsv(exportRows),
    };
  });
}
