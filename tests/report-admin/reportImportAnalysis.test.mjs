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
      ? { parent: { parent: { id: specialtyId, parent: { id: "report_specialties" } } } }
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
      demandSourceMode: "system_default",
      defaultDemandId: "nutri-default",
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
      "nutri-default",
      {
        name: "Plano alimentar",
        nameNormalized: "plano alimentar",
        isActive: true,
        cidAdult: "Z71.3",
        cidInf: "Z71.3",
        category1Title: "Categoria 1",
        category1Content: "Conteúdo Nutri",
      },
      "nutrition"
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

function workbookFixture() {
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
      [
        "ativo",
        "1",
        "Prof Psi",
        "CRP",
        "Psicologia",
        "",
        "",
        "",
        "",
        "10",
        "Paciente A",
        "2010-03-15",
        "",
        "",
        "Ansiedade",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Convênio A",
        "",
        "Confirmado",
        "",
        "Sim",
        "",
        "",
        "Online",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "ativo",
        "2",
        "Prof Nutri",
        "CRN",
        "Nutrição",
        "",
        "",
        "",
        "",
        "11",
        "Paciente B",
        "1990-04-15",
        "",
        "",
        "Demanda ignorada",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Convênio B",
        "",
        "Confirmado",
        "",
        "Sim",
        "",
        "",
        "Presencial",
        "Outra Demanda",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "ativo",
        "3",
        "Prof Psi",
        "CRP",
        "Psicologia",
        "",
        "",
        "",
        "",
        "12",
        "Paciente C",
        "2012-04-15",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Convênio C",
        "",
        "Confirmado",
        "",
        "Sim",
        "",
        "",
        "Online",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    ],
  };
}

test("analyzeReportImportFile mantém regra oficial por especialidade e resumo do lote", async () => {
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
          };
        }
      `,
      "@/lib/shared/reportDemands": `
        export const REPORT_DEMAND_CATEGORY_OPTIONS = [1,2,3,4,5];
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
          const year = Number(String(birthDate || "").slice(0,4));
          const age = Number.isFinite(year) ? new Date().getFullYear() - year : null;
          const useInf = typeof age === "number" && age < 18;
          return {
            value: useInf ? String(demand.cidInf || "") : String(demand.cidAdult || ""),
            source: useInf ? "cidInf" : "cidAdult",
            ageBand: useInf ? "inf" : "adult",
            age,
          };
        }
        export function formatBirthDateDisplay(value) { return String(value || "").trim(); }
      `,
      "@/lib/shared/reportSpecialties": `
        export const REPORT_SPECIALTY_DEMAND_SOURCE_MODES = { EXCEL: "excel", SYSTEM_DEFAULT: "system_default" };
        export function normalizeSpecialtyName(value) {
          return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\\s+/g, " ");
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

  assert.equal(result.summary.totalRows, 3);
  assert.equal(result.matchSummary.ready, 2);
  assert.equal(result.matchSummary.psychologyMissingDemand, 1);

  const psychologyReady = result.matchedRows.find((row) => row.codigoPaciente === "10");
  assert.equal(psychologyReady.demandSourceUsed, "excel");
  assert.equal(psychologyReady.demandName, "Ansiedade");
  assert.equal(psychologyReady.categoryStatus, "ready");

  const nutritionReady = result.matchedRows.find((row) => row.codigoPaciente === "11");
  assert.equal(nutritionReady.demandSourceUsed, "system_default");
  assert.equal(nutritionReady.demandName, "Plano alimentar");
  assert.equal(nutritionReady.categoryStatus, "ready");

  const psychologyMissingDemand = result.matchedRows.find((row) => row.codigoPaciente === "12");
  assert.equal(psychologyMissingDemand.categoryStatus, "psychology-missing-demand");

  assert.equal(mod.parseSelectedCategory("9"), 1);
  assert.deepEqual(mod.getReportImportCatalogPolicy(), {
    primaryStrategy: "collectionGroup(demands)",
    legacyFallbackEnabled: true,
    cacheTtlMs: 15000,
  });
});

test("buildMatchSummary consolida os status do preview de forma estável", async () => {
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
        export function normalizeDemandName(value) { return String(value || ""); }
        export function extractDemandCategory() { return { number: 1, title: "", content: "" }; }
        export function resolveDemandCidByBirthDate() { return { value: "", source: "", ageBand: "", age: null }; }
        export function formatBirthDateDisplay(value) { return String(value || ""); }
      `,
      "@/lib/shared/reportSpecialties": `
        export const REPORT_SPECIALTY_DEMAND_SOURCE_MODES = { EXCEL: "excel", SYSTEM_DEFAULT: "system_default" };
        export function normalizeSpecialtyName(value) { return String(value || ""); }
      `,
      "@/lib/shared/reportTemplates": `export function mapTemplateToForm(template = {}) { return template; }`,
    },
  });

  const summary = mod.buildMatchSummary([
    { categoryStatus: "ready" },
    { categoryStatus: "ready" },
    { categoryStatus: "missing-specialty" },
    { categoryStatus: "inactive-demand" },
  ]);

  assert.equal(summary.ready, 2);
  assert.equal(summary.missingSpecialty, 1);
  assert.equal(summary.inactiveDemand, 1);
  assert.equal(summary.psychologyMissingDemand, 0);
});
