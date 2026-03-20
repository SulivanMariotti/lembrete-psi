
import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { importWithMocks } from "../helpers/moduleLoader.mjs";

const repoRoot = resolve(import.meta.dirname, "../..");

async function loadExportModule() {
  return importWithMocks({
    entry: "src/lib/adminAnalysisExport.js",
    repoRoot,
  });
}

test("gera bundles CSV separados por duplicidade, conflito e linhas ignoradas", async () => {
  const { buildAdminAnalysisExportBundles } = await loadExportModule();

  const analysis = {
    file: { name: "Amplimed Março.xlsx" },
    findings: [
      {
        id: "duplicidade_exata:100:Psicologia:2",
        type: "duplicidade_exata",
        typeLabel: "Duplicidade exata",
        patientCode: "100",
        patientName: "Paciente X",
        specialty: "Psicologia",
        firstRowIndex: 2,
        rowCount: 2,
        rows: [
          {
            rowIndex: 2,
            patientCode: "100",
            patientName: "Paciente X",
            specialty: "Psicologia",
            professionalCode: "10",
            professionalName: "Profissional A",
            scheduledAt: "02/03/2026 08:00",
            convenio: "AMIL",
            status: "Agendado",
            hasNeuroConvenio: false,
          },
          {
            rowIndex: 3,
            patientCode: "100",
            patientName: "Paciente X",
            specialty: "Psicologia",
            professionalCode: "10",
            professionalName: "Profissional A",
            scheduledAt: "02/03/2026 08:00",
            convenio: "AMIL",
            status: "Agendado",
            hasNeuroConvenio: false,
          },
        ],
      },
      {
        id: "conflito_profissional_mesma_especialidade:100:Psicologia:4",
        type: "conflito_profissional_mesma_especialidade",
        typeLabel: "Conflito de profissional na mesma especialidade",
        patientCode: "100",
        patientName: "Paciente X",
        specialty: "Psicologia",
        firstRowIndex: 4,
        rowCount: 2,
        rows: [
          {
            rowIndex: 4,
            patientCode: "100",
            patientName: "Paciente X",
            specialty: "Psicologia",
            professionalCode: "11",
            professionalName: "Profissional B",
            scheduledAt: "09/03/2026 08:00",
            convenio: "AMIL",
            status: "Agendado",
            hasNeuroConvenio: false,
          },
          {
            rowIndex: 5,
            patientCode: "100",
            patientName: "Paciente X",
            specialty: "Psicologia",
            professionalCode: "12",
            professionalName: "Profissional C",
            scheduledAt: "16/03/2026 08:00",
            convenio: "UNIMED",
            status: "Agendado",
            hasNeuroConvenio: false,
          },
        ],
      },
    ],
    ignoredRows: [
      {
        rowIndex: 6,
        patientCode: "",
        patientName: "LIVRE",
        specialty: "",
        professionalCode: "13",
        professionalName: "Profissional D",
        scheduledAt: "20/03/2026 08:00",
        convenio: "AMIL NEURO",
        status: "Livre",
        hasNeuroConvenio: true,
        ignoredReasons: ["paciente_livre", "sem_codigo_paciente"],
      },
    ],
  };

  const bundles = buildAdminAnalysisExportBundles({ analysis, fileName: analysis.file.name });

  assert.equal(bundles.length, 3);

  const exact = bundles.find((item) => item.key === "duplicidades-exatas");
  const conflict = bundles.find((item) => item.key === "conflitos-profissional");
  const ignored = bundles.find((item) => item.key === "linhas-ignoradas");

  assert.ok(exact);
  assert.ok(conflict);
  assert.ok(ignored);

  assert.equal(exact.rowCount, 2);
  assert.match(exact.fileName, /amplimed-marco-duplicidades-exatas\.csv$/);
  assert.match(exact.csv, /Duplicidade exata/);

  assert.equal(conflict.rowCount, 2);
  assert.match(conflict.csv, /profissionais diferentes/);

  assert.equal(ignored.rowCount, 1);
  assert.match(ignored.csv, /Paciente LIVRE \| Sem código do paciente/);
  assert.match(ignored.csv, /sim/);
});
