import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { importWithMocks } from "../helpers/moduleLoader.mjs";

const repoRoot = resolve(import.meta.dirname, "../..");

function createDoc(id, data, specialtyId = null) {
  const ref = specialtyId
    ? {
        parent: {
          parent: { id: specialtyId, parent: { id: "report_specialties" } },
        },
      }
    : {};
  return {
    id,
    ref,
    data: () => data,
  };
}

function createFirestoreMock() {
  const createDoc = (id, data, specialtyId = null) => {
    const ref = specialtyId
      ? {
          parent: {
            parent: { id: specialtyId, parent: { id: "report_specialties" } },
          },
        }
      : {};
    return { id, ref, data: () => data };
  };

  const specialties = [
    createDoc("psychology", {
      name: "Psicologia",
      nameNormalized: "psicologia",
      isActive: true,
      demandSourceMode: "excel",
      defaultDemandId: "",
    }),
    createDoc("nutrition", {
      name: "Nutrição",
      nameNormalized: "nutricao",
      isActive: true,
      demandSourceMode: "excel",
      defaultDemandId: "",
    }),
    createDoc("speech-therapy", {
      name: "Fonoaudiologia",
      nameNormalized: "fonoaudiologia",
      isActive: true,
      demandSourceMode: "excel",
      defaultDemandId: "",
    }),
  ];

  const demands = [
    createDoc(
      "ansiedade",
      {
        name: "Ansiedade",
        nameNormalized: "ansiedade",
        isActive: true,
        cidAdult: "F41.1",
        cidInf: "F93.8",
        category1Title: "Categoria 1",
        category1Content: "Conteúdo A",
      },
      "psychology"
    ),
    createDoc(
      "plano-alimentar",
      {
        name: "Plano alimentar",
        nameNormalized: "plano alimentar",
        isActive: true,
        cidAdult: "Z71.3",
        cidInf: "Z71.3",
        category1Title: "Categoria 1",
        category1Content: "Conteúdo Nutri A",
      },
      "nutrition"
    ),
    createDoc(
      "reeducacao-alimentar",
      {
        name: "Reeducação alimentar",
        nameNormalized: "reeducacao alimentar",
        isActive: true,
        cidAdult: "Z71.3",
        cidInf: "Z71.3",
        category1Title: "Categoria 1",
        category1Content: "Conteúdo Nutri B",
      },
      "nutrition"
    ),
    createDoc(
      "linguagem",
      {
        name: "Linguagem",
        nameNormalized: "linguagem",
        isActive: true,
        cidAdult: "F80.9",
        cidInf: "F80.9",
        category1Title: "Categoria 1",
        category1Content: "Conteúdo Fono A",
      },
      "speech-therapy"
    ),
    createDoc(
      "disfagia",
      {
        name: "Disfagia",
        nameNormalized: "disfagia",
        isActive: true,
        cidAdult: "R13",
        cidInf: "R13",
        category1Title: "Categoria 1",
        category1Content: "Conteúdo Fono B",
      },
      "speech-therapy"
    ),
  ];

  return {
    firestore() {
      return {
        collection(name) {
          if (name === "report_specialties") {
            return {
              limit() {
                return {
                  async get() {
                    return { docs: specialties };
                  },
                };
              },
            };
          }

          if (name === "report_templates") {
            return {
              doc(templateId) {
                return {
                  async get() {
                    return {
                      exists: Boolean(templateId),
                      id: templateId,
                      data: () => ({
                        name: "Modelo Base",
                        isActive: true,
                        bodyContent: "Corpo do modelo",
                      }),
                    };
                  },
                };
              },
              where() {
                return {
                  limit() {
                    return {
                      async get() {
                        return {
                          empty: false,
                          docs: [
                            createDoc("template-default", {
                              name: "Modelo Base",
                              isActive: true,
                              bodyContent: "Corpo do modelo",
                            }),
                          ],
                        };
                      },
                    };
                  },
                };
              },
              limit() {
                return {
                  async get() {
                    return {
                      docs: [
                        createDoc("template-default", {
                          name: "Modelo Base",
                          isActive: true,
                          bodyContent: "Corpo do modelo",
                        }),
                      ],
                    };
                  },
                };
              },
            };
          }

          throw new Error(`Unexpected collection: ${name}`);
        },
        collectionGroup(name) {
          if (name !== "demands") throw new Error(`Unexpected collectionGroup: ${name}`);
          return {
            async get() {
              return { docs: demands };
            },
          };
        },
      };
    },
  };
}

function buildWorkbookRow({
  codigoPaciente,
  especialidade,
  dataNascimento,
  tags = "",
  demanda = "",
}) {
  const row = Array(45).fill("");
  row[0] = "ativo";
  row[1] = "1";
  row[2] = "Profissional";
  row[3] = "Conselho";
  row[4] = especialidade;
  row[9] = String(codigoPaciente);
  row[10] = `Paciente ${codigoPaciente}`;
  row[11] = dataNascimento;
  row[14] = tags;
  row[24] = "Convênio";
  row[26] = "Confirmado";
  row[28] = "Sim";
  row[31] = "Online";
  row[32] = demanda;
  return row;
}

function workbookFixture() {
  const buildWorkbookRow = ({
    codigoPaciente,
    especialidade,
    dataNascimento,
    tags = "",
    demanda = "",
  }) => {
    const row = Array(45).fill("");
    row[0] = "ativo";
    row[1] = "1";
    row[2] = "Profissional";
    row[3] = "Conselho";
    row[4] = especialidade;
    row[9] = String(codigoPaciente);
    row[10] = `Paciente ${codigoPaciente}`;
    row[11] = dataNascimento;
    row[14] = tags;
    row[24] = "Convênio";
    row[26] = "Confirmado";
    row[28] = "Sim";
    row[31] = "Online";
    row[32] = demanda;
    return row;
  };

  return {
    sheetName: "Importação",
    sheetCount: 1,
    rows: [
      [
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
        "Plano",
        "Status",
        "Status secundário",
        "Recebido",
        "Data e hora Início",
        "Data e hora Fim",
        "Tipo de atendimento",
        "Demanda",
        "Observação",
        "Valor",
        "Telefone",
        "Cidade",
        "CPF",
        "Nome agendou",
        "Entrada do paciente",
        "Saída do paciente",
        "Entrada do profissional",
        "Saída do profissional",
        "Motivo de Bloqueio",
        "Motivo do cancelamento",
      ],
      buildWorkbookRow({
        codigoPaciente: "11",
        especialidade: "Nutrição",
        dataNascimento: "1990-04-15",
        demanda: "Plano alimentar",
      }),
      buildWorkbookRow({
        codigoPaciente: "13",
        especialidade: "Fonoaudiologia",
        dataNascimento: "2014-06-10",
        demanda: "Linguagem",
      }),
      buildWorkbookRow({
        codigoPaciente: "15",
        especialidade: "Nutrição",
        dataNascimento: "1988-07-10",
      }),
      buildWorkbookRow({
        codigoPaciente: "16",
        especialidade: "Fonoaudiologia",
        dataNascimento: "2011-08-11",
        demanda: "Demanda Inexistente",
      }),
    ],
  };
}

test("analyzeReportImportFile aplica regra excel nas linhas com Demanda e consolida os novos status", async () => {
  const mod = await importWithMocks({
    entry: "src/lib/server/reportImportAnalysis.js",
    repoRoot,
    mocks: {
      "@/lib/firebaseAdmin": `export default (${createFirestoreMock.toString()})();`,
      "@/lib/server/xlsxLite": `export function parseXlsxBuffer() { return (${workbookFixture.toString()})(); }`,
      "@/lib/shared/reportImportTemplate": `
        export const REPORT_IMPORT_TEMPLATE = {
          id: "report-import-template",
          sourceLabel: "Planilha administrativa",
          requiredHeaders: [],
          previewColumns: ["Paciente", "Especialidade", "Demanda"],
        };
        export function validateTemplateHeaders() {
          return { ok: true, missing: [], unexpected: [] };
        }
        export function normalizeImportedRow(sourceRow = {}) {
          return {
            statusRegistro: String(sourceRow["Status de registro"] || "").trim(),
            profissional: String(sourceRow["Profissional"] || "").trim(),
            especialidade: String(sourceRow["Especialidade"] || "").trim(),
            convenio: String(sourceRow["Convênio"] || "").trim(),
            status: String(sourceRow["Status"] || "").trim(),
            demanda: String(sourceRow["Demanda"] || "").trim(),
            tags: String(sourceRow["Tags"] || "").trim(),
            codigoPaciente: String(sourceRow["Cód paciente"] || "").trim(),
            dataNascimento: String(sourceRow["Data de Nascimento"] || "").trim(),
          };
        }
      `,
      "@/lib/shared/reportDemands": `
        export const REPORT_DEMAND_CATEGORY_OPTIONS = [1,2,3,4,5];
        export function normalizeDemandName(value) {
          return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
        }
        export function extractDemandCategory(demand = {}, selectedCategory = 1) {
          return {
            number: selectedCategory,
            title: String(demand["category" + selectedCategory + "Title"] || ""),
            content: String(demand["category" + selectedCategory + "Content"] || ""),
          };
        }
        export function resolveDemandCidByBirthDate(demand = {}, birthDate = "") {
          const year = Number(String(birthDate || "").slice(0, 4));
          const age = Number.isFinite(year) ? new Date().getFullYear() - year : null;
          const useInf = typeof age === "number" && age < 18;
          return {
            value: useInf ? String(demand.cidInf || "") : String(demand.cidAdult || ""),
            source: useInf ? "cidInf" : "cidAdult",
            ageBand: useInf ? "inf" : "adult",
            age,
          };
        }
        export function formatBirthDateDisplay(value) {
          return String(value || "").trim();
        }
      `,
      "@/lib/shared/reportSpecialties": `
        export const REPORT_SPECIALTY_DEMAND_SOURCE_MODES = { EXCEL: "excel", SYSTEM_DEFAULT: "system_default" };
        export function normalizeSpecialtyName(value) {
          return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
        }
      `,
      "@/lib/shared/reportTemplates": `
        export function mapTemplateToForm(template = {}) {
          return { id: template.id || null, ...template };
        }
      `,
    },
  });

  const result = await mod.analyzeReportImportFile({
    buffer: Buffer.from("dummy"),
    fileName: "import.xlsx",
    fileSize: 123,
    selectedCategory: 1,
    templateId: "template-default",
  });


  assert.equal(result.summary.totalRows, 4);
  assert.equal(result.matchSummary.ready, 2);
  assert.equal(result.matchSummary.excelMissingDemand, 1);
  assert.equal(result.matchSummary.excelDemandNotFound, 1);
  assert.equal("psychologyMissingDemand" in result.matchSummary, false);
  assert.equal("psychologyDemandNotFound" in result.matchSummary, false);


  const nutritionByDemand = result.matchedRows.find((row) => row.codigoPaciente === "11");
  assert.equal(nutritionByDemand.demandSourceUsed, "excel");
  assert.equal(nutritionByDemand.demandName, "Plano alimentar");
  assert.equal(nutritionByDemand.categoryStatus, "ready");


  const speechByDemand = result.matchedRows.find((row) => row.codigoPaciente === "13");
  assert.equal(speechByDemand.demandSourceUsed, "excel");
  assert.equal(speechByDemand.demandName, "Linguagem");
  assert.equal(speechByDemand.categoryStatus, "ready");


  const missingDemand = result.matchedRows.find((row) => row.codigoPaciente === "15");
  assert.equal(missingDemand.categoryStatus, "excel-missing-demand");

  const demandNotFound = result.matchedRows.find((row) => row.codigoPaciente === "16");
  assert.equal(demandNotFound.categoryStatus, "excel-demand-not-found");

  assert.equal(mod.parseSelectedCategory("9"), 1);
  assert.deepEqual(mod.getReportImportCatalogPolicy(), {
    primaryStrategy: "collectionGroup(demands)",
    legacyFallbackEnabled: true,
    cacheTtlMs: 15000,
  });
});


test("buildDemandResolution usa Tags como fallback para especialidades em modo excel", async () => {
  const mod = await importWithMocks({
    entry: "src/lib/server/reportImportRuleEngine.js",
    repoRoot,
    mocks: {
      "@/lib/shared/reportDemands": `
        export function normalizeDemandName(value) {
          return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\\s+/g, " ");
        }
        export function extractDemandCategory(demand = {}, selectedCategory = 1) {
          return {
            number: selectedCategory,
            title: String(demand["category" + selectedCategory + "Title"] || ""),
            content: String(demand["category" + selectedCategory + "Content"] || ""),
          };
        }
        export function resolveDemandCidByBirthDate(demand = {}, birthDate = "") {
          const year = Number(String(birthDate || "").slice(0, 4));
          const age = Number.isFinite(year) ? new Date().getFullYear() - year : null;
          const useInf = typeof age === "number" && age < 18;
          return {
            value: useInf ? String(demand.cidInf || "") : String(demand.cidAdult || ""),
            source: useInf ? "cidInf" : "cidAdult",
            ageBand: useInf ? "inf" : "adult",
            age,
          };
        }
      `,
      "@/lib/shared/reportSpecialties": `
        export const REPORT_SPECIALTY_DEMAND_SOURCE_MODES = { EXCEL: "excel", SYSTEM_DEFAULT: "system_default" };
        export function normalizeSpecialtyName(value) {
          return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\\s+/g, " ");
        }
      `,
    },
  });

  function createSpecialty(name, demands) {
    return {
      name,
      demandSourceMode: "excel",
      demands,
      demandsByNormalized: new Map(demands.map((demand) => [demand.nameNormalized, demand])),
    };
  }

  const psychology = createSpecialty("Psicologia", [
    { id: "ansiedade", name: "Ansiedade", nameNormalized: "ansiedade", isActive: true, category1Content: "A", cidAdult: "F41.1", cidInf: "F93.8" },
  ]);
  const nutrition = createSpecialty("Nutrição", [
    { id: "reeducacao", name: "Reeducação alimentar", nameNormalized: "reeducacao alimentar", isActive: true, category1Content: "B", cidAdult: "Z71.3", cidInf: "Z71.3" },
    { id: "plano", name: "Plano alimentar", nameNormalized: "plano alimentar", isActive: true, category1Content: "C", cidAdult: "Z71.3", cidInf: "Z71.3" },
  ]);
  const speech = createSpecialty("Fonoaudiologia", [
    { id: "disfagia", name: "Disfagia", nameNormalized: "disfagia", isActive: true, category1Content: "D", cidAdult: "R13", cidInf: "R13" },
  ]);

  const psychologyFallback = mod.buildDemandResolution({ demanda: "", tags: "Ansiedade" }, psychology);
  assert.equal(psychologyFallback.demand?.name, "Ansiedade");
  assert.equal(psychologyFallback.demandSourceUsed, "excel");

  const nutritionFallback = mod.buildDemandResolution({ demanda: "", tags: "Reeducação alimentar" }, nutrition);
  assert.equal(nutritionFallback.demand?.name, "Reeducação alimentar");
  assert.equal(nutritionFallback.demandSourceUsed, "excel");

  const speechFallback = mod.buildDemandResolution({ demanda: "", tags: "Disfagia" }, speech);
  assert.equal(speechFallback.demand?.name, "Disfagia");
  assert.equal(speechFallback.demandSourceUsed, "excel");

  const demandPriority = mod.buildDemandResolution({ demanda: "Plano alimentar", tags: "Reeducação alimentar" }, nutrition);
  assert.equal(demandPriority.demand?.name, "Plano alimentar");
  assert.equal(demandPriority.missingDemandStatus, "");
});


test("buildMatchSummary consolida os status genéricos do preview de forma estável", async () => {
  const mod = await importWithMocks({
    entry: "src/lib/server/reportImportAnalysis.js",
    repoRoot,
    mocks: {
      "@/lib/firebaseAdmin": `export default { firestore() { throw new Error("firestore não deveria ser usado neste teste"); } };`,
      "@/lib/server/xlsxLite": `export function parseXlsxBuffer() { throw new Error("xlsx não deveria ser usado neste teste"); }`,
      "@/lib/shared/reportImportTemplate": `
        export const REPORT_IMPORT_TEMPLATE = { id: "report-import-template", sourceLabel: "mock", requiredHeaders: [], previewColumns: [] };
        export function validateTemplateHeaders() { return { ok: true }; }
        export function normalizeImportedRow() { return {}; }
      `,
      "@/lib/shared/reportDemands": `
        export const REPORT_DEMAND_CATEGORY_OPTIONS = [1,2,3,4,5];
        export function normalizeDemandName(value) {
          return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
        }
        export function extractDemandCategory() { return { number: 1, title: "", content: "" }; }
        export function resolveDemandCidByBirthDate() { return { value: "", source: "", ageBand: "", age: null }; }
        export function formatBirthDateDisplay(value) { return String(value || ""); }
      `,
      "@/lib/shared/reportSpecialties": `
        export const REPORT_SPECIALTY_DEMAND_SOURCE_MODES = { EXCEL: "excel", SYSTEM_DEFAULT: "system_default" };
        export function normalizeSpecialtyName(value) {
          return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
        }
      `,
      "@/lib/shared/reportTemplates": `export function mapTemplateToForm(template = {}) { return template; }`,
    },
  });

  const summary = mod.buildMatchSummary([
    { categoryStatus: "ready" },
    { categoryStatus: "ready" },
    { categoryStatus: "missing-specialty" },
    { categoryStatus: "excel-missing-demand" },
    { categoryStatus: "excel-demand-not-found" },
    { categoryStatus: "inactive-demand" },
  ]);

  assert.equal(summary.ready, 2);
  assert.equal(summary.missingSpecialty, 1);
  assert.equal(summary.excelMissingDemand, 1);
  assert.equal(summary.excelDemandNotFound, 1);
  assert.equal(summary.inactiveDemand, 1);
  assert.equal("psychologyMissingDemand" in summary, false);
});
