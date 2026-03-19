import { formatBirthDateDisplay } from "@/lib/shared/reportDemands";

export const REPORT_TEMPLATE_SYSTEM_DEFAULTS = {
  pageFormat: "A4",
  pageOrientation: "landscape",
  itemsPerPage: 2,
  layoutMode: "sideBySide",
};


export const REPORT_TEMPLATE_BODY_RENDER_METRICS = {
  fontSize: 10,
  lineHeight: 1.4,
  blankGap: 16,
  blockGap: 4,
  ruleGap: 9,
  consecutiveBlankBoost: 6,
  maxBlankLines: 2,
};

export function clampTemplateBlankLines(value = "", maxBlankLines = 1) {
  const safeMaxBlankLines = Math.max(1, Number(maxBlankLines || 1));
  const overflowExpression = new RegExp(`\\n{${safeMaxBlankLines + 2},}`, "g");
  return normalizeLines(value).replace(overflowExpression, "\n".repeat(safeMaxBlankLines + 1));
}

export function getTemplateParagraphGap({ blankGap = 14, fontSize = 11 } = {}) {
  return Math.max(Number(blankGap || 0), Number(fontSize || 11) * 1.72);
}

export function getTemplateConsecutiveBlankBoost(
  { consecutiveBlankBoost = null, fontSize = 11 } = {}
) {
  const numericBoost = Number(consecutiveBlankBoost);

  if (Number.isFinite(numericBoost)) {
    return Math.max(0, numericBoost);
  }

  return Math.max(5, Number(fontSize || 11) * 0.56);
}


const REPORT_TEMPLATE_SPREADSHEET_FIELDS = [
  { token: "status_registro", label: "Status de registro", header: "Status de registro" },
  { token: "codigo_profissional", label: "Cód profissional", header: "Cód profissional" },
  { token: "profissional", label: "Profissional", sourceKey: "profissional", header: "Profissional" },
  { token: "conselho", label: "Conselho", header: "Conselho" },
  { token: "especialidade", label: "Especialidade", header: "Especialidade" },
  { token: "codigo_operadora", label: "Cód Operadora", header: "Cód Operadora" },
  { token: "codigo_solicitante", label: "Cód solicitante", header: "Cód solicitante" },
  { token: "registro_solicitante", label: "Reg solicitante", header: "Reg solicitante" },
  { token: "solicitante", label: "Solicitante", header: "Solicitante" },
  { token: "codigo_paciente", label: "Cód paciente", sourceKey: "codigoPaciente", header: "Cód paciente" },
  { token: "paciente", label: "Paciente", sourceKey: "paciente", header: "Paciente" },
  { token: "data_nascimento", label: "Data de Nascimento", sourceKey: "dataNascimento", header: "Data de Nascimento" },
  { token: "data_agendada", label: "Data e hora Agendada", sourceKey: "dataHoraAgendada", header: "Data e hora Agendada" },
  { token: "data_criada", label: "Data e hora Criada", sourceKey: "dataHoraCriada", header: "Data e hora Criada" },
  { token: "tags", label: "Tags", sourceKey: "tags", header: "Tags" },
  { token: "local", label: "Local", sourceKey: "local", header: "Local" },
  { token: "unidade", label: "Unidade", sourceKey: "unidade", header: "Unidade" },
  { token: "duracao_agendada_min", label: "Duração agen(min)", header: "Duração agen(min)" },
  { token: "tempo_consulta_min", label: "Tempo consulta(min)", header: "Tempo consulta(min)" },
  { token: "tempo_atendimento_min", label: "Tempo atend(min)", header: "Tempo atend(min)" },
  { token: "consulta_finalizada", label: "Consulta finalizada", header: "Consulta finalizada" },
  { token: "tempo_espera_min", label: "Tempo espera(min)", header: "Tempo espera(min)" },
  { token: "codigo_convenio", label: "Cód convênio", header: "Cód convênio" },
  { token: "registro_ans", label: "Reg ANS", header: "Reg ANS" },
  { token: "convenio", label: "Convênio", sourceKey: "convenio", header: "Convênio" },
  { token: "codigo_plano", label: "Cód plano", header: "Cód plano" },
  { token: "plano", label: "Plano", sourceKey: "plano", header: "Plano" },
  { token: "codigo_procedimento", label: "Cód proced", header: "Cód proced" },
  { token: "codigo_tuss_procedimento", label: "Cód TUSS proc.", header: "Cód TUSS proc." },
  { token: "tipo_atendimento", label: "Tipo de atendimento", sourceKey: "tipoAtendimento", header: "Tipo de atendimento" },
  { token: "procedimento", label: "Procedimento", sourceKey: "procedimento", header: "Procedimento" },
  { token: "tipo_procedimento", label: "Tipo proc.", header: "Tipo proc." },
  { token: "valor", label: "Valor", sourceKey: "valor", header: "Valor" },
  { token: "recebido", label: "Recebido", sourceKey: "recebido", header: "Recebido" },
  { token: "status", label: "Status", sourceKey: "status", header: "Status" },
  { token: "status_alterado_em", label: "Status Alterado Em", header: "Status Alterado Em" },
  { token: "status_secundario", label: "Status secundário", sourceKey: "statusSecundario", header: "Status secundário" },
  { token: "celular", label: "Celular", sourceKey: "celular", header: "Celular" },
  { token: "telefone", label: "Telefone", sourceKey: "telefone", header: "Telefone" },
  { token: "cidade", label: "Cidade", sourceKey: "cidade", header: "Cidade" },
  { token: "observacao", label: "Observação", sourceKey: "observacao", header: "Observação" },
  { token: "cpf", label: "CPF", sourceKey: "cpf", header: "CPF" },
  { token: "endereco_paciente", label: "Endereço pac.", header: "Endereço pac." },
  { token: "carteirinha", label: "Carteirinha", header: "Carteirinha" },
  { token: "id_solicitacao_tiss", label: "ID solicitação TISS", header: "ID solicitação TISS" },
  { token: "id_autorizacao_agendamento", label: "ID autorização agen.", header: "ID autorização agen." },
  { token: "numero_guias_tiss", label: "Nº guia(s) TISS", header: "Nº guia(s) TISS" },
  { token: "indicacao", label: "Indicação", header: "Indicação" },
  { token: "codigo_agendou", label: "Cód agendou", header: "Cód agendou" },
  { token: "nome_agendou", label: "Nome agendou", sourceKey: "nomeAgendou", header: "Nome agendou" },
  { token: "codigo_referencia", label: "Cód referência", header: "Cód referência" },
  { token: "confirmacao_agendamento", label: "Confirmacao agendamento", header: "Confirmacao agendamento" },
  { token: "origem_agendamento", label: "Origem agendamento", sourceKey: "origemAgendamento", header: "Origem agendamento" },
  { token: "entrada_paciente", label: "Entrada do paciente", sourceKey: "entradaPaciente", header: "Entrada do paciente" },
  { token: "saida_paciente", label: "Saída do paciente", sourceKey: "saidaPaciente", header: "Saída do paciente" },
  { token: "entrada_profissional", label: "Entrada do profissional", sourceKey: "entradaProfissional", header: "Entrada do profissional" },
  { token: "saida_profissional", label: "Saída do profissional", sourceKey: "saidaProfissional", header: "Saída do profissional" },
  { token: "tempo_conversa", label: "Tempo de conversa", header: "Tempo de conversa" },
  { token: "tempo_de_atendimento", label: "Tempo de atendimento", header: "Tempo de atendimento" },
  { token: "atendido_por", label: "Atendido Por", header: "Atendido Por" },
  { token: "codigo_prontuario", label: "Código Prontuário", header: "Código Prontuário" },
  { token: "usuario_que_excluiu", label: "Usuário que Excluiu", header: "Usuário que Excluiu" },
  { token: "data_exclusao", label: "Data de Exclusão", header: "Data de Exclusão" },
  { token: "cep", label: "CEP", header: "CEP" },
  { token: "email", label: "Email", header: "Email" },
  { token: "id_integracao", label: "ID Integração", header: "ID Integração" },
  { token: "motivo_bloqueio", label: "Motivo de Bloqueio", sourceKey: "motivoBloqueio", header: "Motivo de Bloqueio" },
  { token: "motivo_cancelamento", label: "Motivo do cancelamento", sourceKey: "motivoCancelamento", header: "Motivo do cancelamento" },
];

const REPORT_TEMPLATE_SPREADSHEET_HEADER_MAP = Object.fromEntries(
  REPORT_TEMPLATE_SPREADSHEET_FIELDS.map((item) => [item.token, item.header]).filter((entry) => entry[1])
);

export const REPORT_TEMPLATE_TAG_GROUPS = [
  {
    key: "spreadsheet",
    label: "Planilha",
    items: REPORT_TEMPLATE_SPREADSHEET_FIELDS,
  },
  {
    key: "demand",
    label: "Demanda",
    items: [
      { token: "demanda_nome", label: "Nome da Demanda" },
      { token: "demanda_descricao", label: "Descrição da Demanda" },
      { token: "cid", label: "CID automático por idade" },
      { token: "cid_inf", label: "CID Infantil da Demanda" },
      { token: "cid_adult", label: "CID Adulto da Demanda" },
    ],
  },
  {
    key: "selectedCategory",
    label: "Categoria escolhida",
    items: [
      { token: "categoria_numero", label: "Número da categoria" },
      { token: "categoria_titulo", label: "Título da categoria" },
      { token: "categoria_conteudo", label: "Conteúdo da categoria" },
    ],
  },
  {
    key: "system",
    label: "Sistema",
    items: [
      { token: "data_geracao", label: "Data/hora de geração" },
      { token: "modelo_nome", label: "Nome do modelo" },
      { token: "indice_relatorio", label: "Índice do relatório" },
      { token: "total_relatorios", label: "Total de relatórios" },
    ],
  },
];


export const REPORT_TEMPLATE_FORMATTING_ACTIONS = [
  { key: "title", label: "Título", type: "lineSnippet", snippet: "[align=left][size=16][b]TÍTULO[/b][/size][/align]" },
  { key: "subtitle", label: "Subtítulo", type: "lineSnippet", snippet: "[align=left][size=12][b]SUBTÍTULO[/b][/size][/align]" },
  { key: "bold", label: "Negrito", type: "wrap", open: "[b]", close: "[/b]" },
  { key: "italic", label: "Itálico", type: "wrap", open: "[i]", close: "[/i]" },
  { key: "underline", label: "Sublinhado", type: "wrap", open: "[u]", close: "[/u]" },
  { key: "alignLeft", label: "Esquerda", type: "lineWrap", open: "[align=left]", close: "[/align]" },
  { key: "alignCenter", label: "Centro", type: "lineWrap", open: "[align=center]", close: "[/align]" },
  { key: "alignRight", label: "Direita", type: "lineWrap", open: "[align=right]", close: "[/align]" },
  { key: "alignJustify", label: "Justificar", type: "lineWrap", open: "[align=justify]", close: "[/align]" },
  { key: "size10", label: "10", type: "lineWrap", open: "[size=10]", close: "[/size]" },
  { key: "size12", label: "12", type: "lineWrap", open: "[size=12]", close: "[/size]" },
  { key: "size14", label: "14", type: "lineWrap", open: "[size=14]", close: "[/size]" },
  { key: "size16", label: "16", type: "lineWrap", open: "[size=16]", close: "[/size]" },
  { key: "rule", label: "Linha", type: "insert", snippet: "[hr]" },
  { key: "paragraph", label: "Parágrafo", type: "insert", snippet: "\n\n" },
];

const KNOWN_TOKENS = new Set(
  REPORT_TEMPLATE_TAG_GROUPS.flatMap((group) => group.items.map((item) => item.token))
);

const INLINE_STYLE_TAGS = new Set(["b", "i", "u", "size"]);

function safeId(prefix = "id") {
  try {
    if (globalThis.crypto?.randomUUID) {
      return `${prefix}_${globalThis.crypto.randomUUID().slice(0, 8)}`;
    }
  } catch (_) {
    // ignore
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(value) {
  try {
    return new Date(value || Date.now()).toLocaleString("pt-BR");
  } catch (_) {
    return "";
  }
}

function normalizeLines(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function joinNonEmptyLines(parts = []) {
  return parts
    .map((part) => normalizeLines(part).trim())
    .filter(Boolean)
    .join("\n");
}

function legacyHeaderToTemplate(header = {}) {
  return joinNonEmptyLines([
    header?.institutionName,
    [header?.line1, header?.line2, header?.line3].filter(Boolean).join(" • "),
    header?.reportTitle || "Relatório Clínico",
    header?.reportSubtitle,
  ]);
}

function legacyFooterToTemplate(footer = {}) {
  const locationLine = [footer?.locationText, footer?.showDate ? "{{data_geracao}}" : ""]
    .filter(Boolean)
    .join(" • ");

  return joinNonEmptyLines([
    footer?.closingText,
    locationLine,
    footer?.signatureLabel,
    footer?.footerNote,
  ]);
}

function legacyFieldToToken(field = {}) {
  const sourceType = String(field?.sourceType || "spreadsheet").trim();
  const sourceKey = String(field?.sourceKey || "").trim();

  if (sourceType === "selectedCategory") {
    if (sourceKey === "title") return "categoria_titulo";
    if (sourceKey === "content") return "categoria_conteudo";
    if (sourceKey === "number") return "categoria_numero";
  }

  if (sourceType === "demand") {
    if (sourceKey === "name") return "demanda_nome";
    if (sourceKey === "description") return "demanda_descricao";
  }

  if (sourceType === "system") {
    if (sourceKey === "generatedAt") return "data_geracao";
    if (sourceKey === "templateName") return "modelo_nome";
    if (sourceKey === "recordIndex") return "indice_relatorio";
    if (sourceKey === "recordCount") return "total_relatorios";
  }

  const spreadsheetMap = {
    paciente: "paciente",
    profissional: "profissional",
    dataHoraAgendada: "data_agendada",
    dataHoraCriada: "data_criada",
    procedimento: "procedimento",
    convenio: "convenio",
    plano: "plano",
    status: "status",
    statusSecundario: "status_secundario",
    celular: "celular",
    telefone: "telefone",
    cidade: "cidade",
    local: "local",
    unidade: "unidade",
    origemAgendamento: "origem_agendamento",
    tipoAtendimento: "tipo_atendimento",
    valor: "valor",
    recebido: "recebido",
    observacao: "observacao",
    motivoBloqueio: "motivo_bloqueio",
    motivoCancelamento: "motivo_cancelamento",
    nomeAgendou: "nome_agendou",
    tags: "tags",
    codigoPaciente: "codigo_paciente",
    cpf: "cpf",
    dataNascimento: "data_nascimento",
    entradaPaciente: "entrada_paciente",
    saidaPaciente: "saida_paciente",
    entradaProfissional: "entrada_profissional",
    saidaProfissional: "saida_profissional",
  };

  return spreadsheetMap[sourceKey] || "";
}

function legacySectionsToBodyTemplate(sections = []) {
  if (!Array.isArray(sections) || !sections.length) return "";

  const lines = [];

  sections
    .filter((section) => section?.enabled !== false)
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
    .forEach((section) => {
      const title = String(section?.title || "").trim();
      if (title) lines.push(title);

      if (String(section?.type || "") === "fixedText") {
        const fixedText = normalizeLines(section?.fixedText).trim();
        if (fixedText) lines.push(fixedText);
      }

      const fields = Array.isArray(section?.fields) ? section.fields : [];
      fields
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
        .forEach((field) => {
          const token = legacyFieldToToken(field);
          const label = String(field?.label || "").trim();
          if (token) {
            lines.push(label ? `${label}: {{${token}}}` : `{{${token}}}`);
          } else if (field?.fixedText) {
            lines.push(String(field.fixedText).trim());
          }
        });

      lines.push("");
    });

  return lines.join("\n").trim();
}

export function slugifyReportTemplateName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "modelo-relatorio";
}

export function createDefaultBodyTemplate() {
  return [
    "[align=left][size=14][b]Ao convênio {{convenio}},[/b][/size][/align]",
    "",
    "[align=justify]O(a) paciente [b]{{paciente}}[/b] encontra-se em acompanhamento com [b]{{profissional}}[/b].[/align]",
    "",
    "[align=justify]{{categoria_conteudo}}[/align]",
    "",
    "[size=10]Procedimento: {{procedimento}}[/size]",
    "[size=10]Data/Hora: {{data_agendada}}[/size]",
  ].join("\n");
}

function createDefaultFooterTemplate() {
  return [
    "[hr]",
    "[align=center]{{cidade}}, {{data_geracao}}[/align]",
    "",
    "[align=center]_______________________________[/align]",
  ].join("\n");
}

export const REPORT_TEMPLATE_LOGO_MAX_DATA_URL_LENGTH = 350000;

export function createEmptyTemplateForm() {
  return {
    id: "",
    editorMode: "tagTemplate",
    name: "",
    description: "",
    isActive: true,
    ...REPORT_TEMPLATE_SYSTEM_DEFAULTS,
    headerLogoDataUrl: "",
    headerTemplate: "[align=left][size=15][b]RELATÓRIO CLÍNICO[/b][/size][/align]",
    bodyTemplate: createDefaultBodyTemplate(),
    footerTemplate: createDefaultFooterTemplate(),
    header: {
      showLogo: false,
      logoPath: "",
      institutionName: "",
      line1: "",
      line2: "",
      line3: "",
      reportTitle: "Relatório Clínico",
      reportSubtitle: "",
    },
    footer: {
      closingText: "",
      locationText: "",
      showDate: true,
      signatureLabel: "",
      footerNote: "",
    },
    sections: [],
  };
}

export function mapTemplateToForm(template = {}) {
  const base = createEmptyTemplateForm();
  const headerTemplate = normalizeLines(
    template?.headerTemplate != null
      ? template.headerTemplate
      : legacyHeaderToTemplate(template?.header || {})
  ).trim();
  const footerTemplate = normalizeLines(
    template?.footerTemplate != null
      ? template.footerTemplate
      : legacyFooterToTemplate(template?.footer || {})
  ).trim();
  const bodyTemplate = normalizeLines(
    template?.bodyTemplate != null
      ? template.bodyTemplate
      : legacySectionsToBodyTemplate(template?.sections || [])
  ).trim();

  return {
    ...base,
    id: String(template?.id || ""),
    editorMode: "tagTemplate",
    name: String(template?.name || "").trim(),
    description: String(template?.description || "").trim(),
    isActive: template?.isActive == null ? true : Boolean(template.isActive),
    pageFormat: String(template?.pageFormat || base.pageFormat),
    pageOrientation: String(template?.pageOrientation || base.pageOrientation),
    itemsPerPage: Number(template?.itemsPerPage || base.itemsPerPage) || 2,
    layoutMode: String(template?.layoutMode || base.layoutMode),
    headerLogoDataUrl: String(template?.headerLogoDataUrl || "").trim(),
    headerTemplate: headerTemplate || base.headerTemplate,
    bodyTemplate: bodyTemplate || base.bodyTemplate,
    footerTemplate: footerTemplate || base.footerTemplate,
    header: {
      ...base.header,
      ...(template?.header || {}),
    },
    footer: {
      ...base.footer,
      ...(template?.footer || {}),
    },
    sections: Array.isArray(template?.sections) ? template.sections : [],
  };
}

export function buildTemplateSummary(item = {}) {
  const form = mapTemplateToForm(item);
  const tokenCount = new Set([
    ...extractTemplateTokens(form.headerTemplate),
    ...extractTemplateTokens(form.bodyTemplate),
    ...extractTemplateTokens(form.footerTemplate),
  ]).size;

  const bodyLines = normalizeLines(form.bodyTemplate).split("\n").filter((line) => line.trim()).length;
  return `Editor livre + formatação • ${tokenCount} TAG${tokenCount === 1 ? "" : "S"} • ${bodyLines} linha${bodyLines === 1 ? "" : "s"} no corpo`;
}

export function getAllTemplateTags() {
  return REPORT_TEMPLATE_TAG_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      tag: `{{${item.token}}}`,
    })),
  }));
}

export function extractTemplateTokens(text = "") {
  const tokens = new Set();
  const expression = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match;
  while ((match = expression.exec(String(text || "")))) {
    tokens.add(match[1]);
  }
  return Array.from(tokens);
}

export function findUnknownTemplateTokens(text = "") {
  return extractTemplateTokens(text).filter((token) => !KNOWN_TOKENS.has(token));
}

function resolveSpreadsheetToken(token, record = {}) {
  const directMap = {
    status_registro: record?.statusRegistro,
    codigo_profissional: record?.codigoProfissional,
    profissional: record?.profissional,
    conselho: record?.conselho,
    especialidade: record?.especialidade,
    codigo_operadora: record?.codigoOperadora,
    codigo_solicitante: record?.codigoSolicitante,
    registro_solicitante: record?.registroSolicitante,
    solicitante: record?.solicitante,
    codigo_paciente: record?.codigoPaciente,
    paciente: record?.paciente,
    data_nascimento: record?.dataNascimento,
    data_agendada: record?.dataHoraAgendada,
    data_criada: record?.dataHoraCriada,
    tags: record?.tags,
    local: record?.local,
    unidade: record?.unidade,
    duracao_agendada_min: record?.duracaoAgendadaMin,
    tempo_consulta_min: record?.tempoConsultaMin,
    tempo_atendimento_min: record?.tempoAtendimentoMin,
    consulta_finalizada: record?.consultaFinalizada,
    tempo_espera_min: record?.tempoEsperaMin,
    codigo_convenio: record?.codigoConvenio,
    registro_ans: record?.registroAns,
    convenio: record?.convenio,
    codigo_plano: record?.codigoPlano,
    plano: record?.plano,
    codigo_procedimento: record?.codigoProcedimento,
    codigo_tuss_procedimento: record?.codigoTussProcedimento,
    tipo_atendimento: record?.tipoAtendimento,
    procedimento: record?.procedimento,
    tipo_procedimento: record?.tipoProcedimento,
    valor: record?.valor,
    recebido: record?.recebido,
    status: record?.status,
    status_alterado_em: record?.statusAlteradoEm,
    status_secundario: record?.statusSecundario,
    celular: record?.celular,
    telefone: record?.telefone,
    cidade: record?.cidade,
    observacao: record?.observacao,
    cpf: record?.cpf,
    endereco_paciente: record?.enderecoPaciente,
    carteirinha: record?.carteirinha,
    id_solicitacao_tiss: record?.idSolicitacaoTiss,
    id_autorizacao_agendamento: record?.idAutorizacaoAgendamento,
    numero_guias_tiss: record?.numeroGuiasTiss,
    indicacao: record?.indicacao,
    codigo_agendou: record?.codigoAgendou,
    nome_agendou: record?.nomeAgendou,
    codigo_referencia: record?.codigoReferencia,
    confirmacao_agendamento: record?.confirmacaoAgendamento,
    origem_agendamento: record?.origemAgendamento,
    entrada_paciente: record?.entradaPaciente,
    saida_paciente: record?.saidaPaciente,
    entrada_profissional: record?.entradaProfissional,
    saida_profissional: record?.saidaProfissional,
    tempo_conversa: record?.tempoConversa,
    tempo_de_atendimento: record?.tempoDeAtendimento,
    atendido_por: record?.atendidoPor,
    codigo_prontuario: record?.codigoProntuario,
    usuario_que_excluiu: record?.usuarioQueExcluiu,
    data_exclusao: record?.dataExclusao,
    cep: record?.cep,
    email: record?.email,
    id_integracao: record?.idIntegracao,
    motivo_bloqueio: record?.motivoBloqueio,
    motivo_cancelamento: record?.motivoCancelamento,
  };

  const directValue = directMap[token];
  if (directValue != null && directValue !== "") {
    if (token === "data_nascimento") return formatBirthDateDisplay(directValue);
    return directValue;
  }

  const sourceHeader = REPORT_TEMPLATE_SPREADSHEET_HEADER_MAP[token];
  if (sourceHeader && record?.sourceRow && Object.prototype.hasOwnProperty.call(record.sourceRow, sourceHeader)) {
    const rawValue = record.sourceRow[sourceHeader];
    if (rawValue != null && rawValue !== "") {
      if (token === "data_nascimento") return formatBirthDateDisplay(rawValue);
      return rawValue;
    }
  }

  return "";
}

export function resolveTemplateToken(token = "", record = {}, context = {}) {
  const cleanToken = String(token || "").trim();

  if (!cleanToken) return "";
  if (KNOWN_TOKENS.has(cleanToken)) {
    const spreadsheetValue = resolveSpreadsheetToken(cleanToken, record);
    if (spreadsheetValue != null && spreadsheetValue !== "") return String(spreadsheetValue);

    if (cleanToken === "demanda_nome") return String(record?.demandName || "");
    if (cleanToken === "demanda_descricao") return String(record?.demandDescription || "");
    if (cleanToken === "cid") return String(record?.resolvedCid || record?.demandCidAdult || record?.demandCidInf || "");
    if (cleanToken === "cid_inf") return String(record?.demandCidInf || "");
    if (cleanToken === "cid_adult") return String(record?.demandCidAdult || "");
    if (cleanToken === "categoria_numero") return String(record?.selectedCategory || context?.selectedCategory || "");
    if (cleanToken === "categoria_titulo") return String(record?.categoryTitle || "");
    if (cleanToken === "categoria_conteudo") return String(record?.categoryContent || "");
    if (cleanToken === "data_geracao") return formatDateTime(context?.generatedAt);
    if (cleanToken === "modelo_nome") return String(context?.templateName || "");
    if (cleanToken === "indice_relatorio") return String((Number(context?.recordIndex || 0) || 0) + 1);
    if (cleanToken === "total_relatorios") return String(context?.recordCount || "");
  }

  return "";
}

export function renderTemplateText(text = "", record = {}, context = {}) {
  return normalizeLines(text).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, token) => {
    return resolveTemplateToken(token, record, context);
  });
}

function normalizeRichTemplateText(value) {
  return normalizeLines(value).replace(/\[br\]/gi, "\n");
}

function tryUnwrapBlockTag(rawValue, tagName, defaultMeta = {}) {
  const expression = new RegExp(`^\\[${tagName}(?:=([^\\]]+))?\\]([\\s\\S]*)\\[\\/${tagName}\\]$`, "i");
  const match = String(rawValue || "").trim().match(expression);
  if (!match) return null;

  return {
    value: match[2],
    meta: match[1] != null ? String(match[1]).trim() : defaultMeta,
  };
}

function normalizeAlign(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "center" || clean === "right" || clean === "justify") return clean;
  return "left";
}

function normalizeFontSize(value, fallback = 11) {
  const numeric = Number(value);
  if (!numeric) return fallback;
  return Math.max(8, Math.min(22, numeric));
}

function unwrapBlockStyles(rawLine, defaults = {}) {
  let value = String(rawLine || "");
  let align = normalizeAlign(defaults?.align || "left");
  let fontSize = normalizeFontSize(defaults?.fontSize || 11, 11);
  let changed = true;

  while (changed) {
    changed = false;

    const alignMatch = tryUnwrapBlockTag(value, "align");
    if (alignMatch) {
      value = alignMatch.value;
      align = normalizeAlign(alignMatch.meta);
      changed = true;
      continue;
    }

    const sizeMatch = tryUnwrapBlockTag(value, "size");
    if (sizeMatch) {
      value = sizeMatch.value;
      fontSize = normalizeFontSize(sizeMatch.meta, fontSize);
      changed = true;
    }
  }

  return {
    value,
    align,
    fontSize,
  };
}

function mergeAdjacentSegments(segments = []) {
  return segments.reduce((accumulator, current) => {
    const text = String(current?.text || "");
    if (!text) return accumulator;

    const previous = accumulator[accumulator.length - 1];
    if (
      previous &&
      previous.bold === current.bold &&
      previous.italic === current.italic &&
      previous.underline === current.underline &&
      Number(previous.fontSize) === Number(current.fontSize)
    ) {
      previous.text += text;
      return accumulator;
    }

    accumulator.push({
      text,
      bold: Boolean(current.bold),
      italic: Boolean(current.italic),
      underline: Boolean(current.underline),
      fontSize: normalizeFontSize(current.fontSize, 11),
    });
    return accumulator;
  }, []);
}

function parseInlineSegments(text = "", baseStyle = {}) {
  const input = String(text || "");
  const segments = [];
  const stack = [];
  let lastIndex = 0;
  let currentStyle = {
    bold: Boolean(baseStyle?.bold),
    italic: Boolean(baseStyle?.italic),
    underline: Boolean(baseStyle?.underline),
    fontSize: normalizeFontSize(baseStyle?.fontSize || 11, 11),
  };

  const expression = /\[(\/?)(b|i|u|size)(?:=([0-9]{1,2}))?\]/gi;
  let match;

  while ((match = expression.exec(input))) {
    if (match.index > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, match.index),
        ...currentStyle,
      });
    }

    const isClosing = match[1] === "/";
    const tagName = String(match[2] || "").toLowerCase();
    const rawValue = match[3];

    if (!INLINE_STYLE_TAGS.has(tagName)) {
      lastIndex = expression.lastIndex;
      continue;
    }

    if (!isClosing) {
      stack.push({ ...currentStyle });
      if (tagName === "b") currentStyle.bold = true;
      if (tagName === "i") currentStyle.italic = true;
      if (tagName === "u") currentStyle.underline = true;
      if (tagName === "size") currentStyle.fontSize = normalizeFontSize(rawValue, currentStyle.fontSize);
    } else if (stack.length) {
      currentStyle = stack.pop();
    }

    lastIndex = expression.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({
      text: input.slice(lastIndex),
      ...currentStyle,
    });
  }

  return mergeAdjacentSegments(segments);
}

export function buildTemplateRenderBlocks(text = "", record = {}, context = {}, defaults = {}) {
  const rendered = normalizeRichTemplateText(renderTemplateText(text || "", record, context));
  const rawLines = rendered.split("\n");

  return rawLines.map((rawLine, index) => {
    const trimmed = String(rawLine || "").trim();
    if (!trimmed) {
      return {
        key: `blank-${index}`,
        type: "blank",
      };
    }

    if (/^\[hr\]$/i.test(trimmed)) {
      return {
        key: `rule-${index}`,
        type: "rule",
      };
    }

    const block = unwrapBlockStyles(rawLine, defaults);
    return {
      key: `text-${index}`,
      type: "text",
      align: block.align,
      fontSize: block.fontSize,
      rawText: block.value,
      segments: parseInlineSegments(block.value, { fontSize: block.fontSize }),
    };
  });
}
