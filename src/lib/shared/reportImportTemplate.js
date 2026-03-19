const TEMPLATE_HEADERS = [
  "Status de registro",
  "Cód profissional",
  "Profissional",
  "Conselho",
  "Especialidade",
  "Cód Operadora",
  "Cód solicitante",
  "Reg solicitante",
  "Solicitante",
  "Cód paciente",
  "Paciente",
  "Data de Nascimento",
  "Data e hora Agendada",
  "Data e hora Criada",
  "Tags",
  "Local",
  "Unidade",
  "Duração agen(min)",
  "Tempo consulta(min)",
  "Tempo atend(min)",
  "Consulta finalizada",
  "Tempo espera(min)",
  "Cód convênio",
  "Reg ANS",
  "Convênio",
  "Cód plano",
  "Plano",
  "Cód proced",
  "Cód TUSS proc.",
  "Tipo de atendimento",
  "Procedimento",
  "Tipo proc.",
  "Valor",
  "Recebido",
  "Status",
  "Status Alterado Em",
  "Status secundário",
  "Celular",
  "Telefone",
  "Cidade",
  "Observação",
  "CPF",
  "Endereço pac.",
  "Carteirinha",
  "ID solicitação TISS",
  "ID autorização agen.",
  "Nº guia(s) TISS",
  "Indicação",
  "Cód agendou",
  "Nome agendou",
  "Cód referência",
  "Confirmacao agendamento",
  "Origem agendamento",
  "Entrada do paciente",
  "Saída do paciente",
  "Entrada do profissional",
  "Saída do profissional",
  "Tempo de conversa",
  "Tempo de atendimento",
  "Atendido Por",
  "Código Prontuário",
  "Usuário que Excluiu",
  "Data de Exclusão",
  "CEP",
  "Email",
  "ID Integração",
  "Motivo de Bloqueio",
  "Motivo do cancelamento"
];

const OPTIONAL_TEMPLATE_HEADERS = ["Demanda"];

export const REPORT_IMPORT_TEMPLATE = {
  id: "amplimed-agenda-v1",
  sourceLabel: "Amplimed - Gestão de Clínicas",
  acceptedExtensions: [".xlsx"],
  requiredHeaders: TEMPLATE_HEADERS,
  optionalHeaders: OPTIONAL_TEMPLATE_HEADERS,
  fieldRules: {
    specialty: "A Especialidade é a validação principal do lote.",
    demand: "Especialidades em modo EXCEL usam a coluna Demanda e, se vazia, fazem fallback em Tags.",
    cid: "CID não é lido da planilha como fonte oficial; ele é resolvido a partir da Demanda cadastrada no sistema.",
    category: "Categoria não é lida da planilha como fonte oficial; o conteúdo vem da Demanda cadastrada para a categoria do lote.",
  },
  previewColumns: [
  "Status de registro",
  "Profissional",
  "Paciente",
  "Especialidade",
  "Data e hora Agendada",
  "Status",
  "Convênio",
  "Procedimento",
  "Celular",
  "Origem agendamento"
],
  maxFileSizeBytes: 10 * 1024 * 1024,
};

export function normalizeHeaderName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateTemplateHeaders(headers = []) {
  const actualByNormalized = new Map();
  (headers || []).forEach((header) => {
    const normalized = normalizeHeaderName(header);
    if (!normalized) return;
    if (!actualByNormalized.has(normalized)) {
      actualByNormalized.set(normalized, String(header));
    }
  });

  const missingHeaders = [];
  const matchedHeaders = [];

  for (const expected of TEMPLATE_HEADERS) {
    const normalized = normalizeHeaderName(expected);
    const actual = actualByNormalized.get(normalized);
    if (actual) {
      matchedHeaders.push({ expected, actual });
    } else {
      missingHeaders.push(expected);
    }
  }

  const expectedNormalized = new Set(TEMPLATE_HEADERS.map(normalizeHeaderName));
  const extraHeaders = (headers || []).filter((header) => {
    const normalized = normalizeHeaderName(header);
    return normalized && !expectedNormalized.has(normalized);
  });

  return {
    ok: missingHeaders.length === 0,
    expectedCount: TEMPLATE_HEADERS.length,
    receivedCount: Array.isArray(headers) ? headers.length : 0,
    missingHeaders,
    extraHeaders,
    matchedHeaders,
  };
}

// A coluna "Demanda" continua opcional por compatibilidade com planilhas antigas.
// Quando a Especialidade estiver em modo EXCEL, a precedência oficial é: Demanda -> Tags.
export function normalizeImportedRow(row = {}) {
  return {
    statusRegistro: String(row["Status de registro"] || "").trim(),
    profissional: String(row["Profissional"] || "").trim(),
    paciente: String(row["Paciente"] || "").trim(),
    especialidade: String(row["Especialidade"] || "").trim(),
    demanda: String(row["Demanda"] || "").trim(),
    dataHoraAgendada: String(row["Data e hora Agendada"] || "").trim(),
    status: String(row["Status"] || "").trim(),
    convenio: String(row["Convênio"] || "").trim(),
    procedimento: String(row["Procedimento"] || "").trim(),
    celular: String(row["Celular"] || "").trim(),
    origemAgendamento: String(row["Origem agendamento"] || "").trim(),
    tags: String(row["Tags"] || "").trim(),
    local: String(row["Local"] || "").trim(),
    unidade: String(row["Unidade"] || "").trim(),
  };
}
