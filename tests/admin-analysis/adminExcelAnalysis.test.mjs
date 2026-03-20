
import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { importWithMocks } from "../helpers/moduleLoader.mjs";

const repoRoot = resolve(import.meta.dirname, "../..");

async function loadModule() {
  return importWithMocks({
    entry: "src/lib/server/adminExcelAnalysis.js",
    repoRoot,
  });
}

test("detecta duplicidade exata e ignora linha LIVRE", async () => {
  const { buildAdminAnalysisFromRows } = await loadModule();

  const analysis = buildAdminAnalysisFromRows({
    fileName: "teste.xlsx",
    rawRows: [
      [
        "Cód profissional",
        "Profissional",
        "Especialidade",
        "Cód paciente",
        "Paciente",
        "Data e hora Agendada",
        "Convênio",
        "Status",
      ],
      ["10", "Profissional A", "Psicologia", "100", "Paciente X", "02/03/2026 08:00", "AMIL", "Agendado"],
      ["10", "Profissional A", "Psicologia", "100", "Paciente X", "02/03/2026 08:00", "AMIL", "Agendado"],
      ["11", "Profissional B", "Psicologia", "", "LIVRE", "02/03/2026 09:00", "AMIL", "Livre"],
    ],
  });

  assert.equal(analysis.summary.exactDuplicateGroups, 1);
  assert.equal(analysis.summary.exactDuplicateRows, 2);
  assert.equal(analysis.summary.ignoredRows, 1);
  assert.equal(analysis.summary.ignoredBreakdown.paciente_livre, 1);
  assert.equal(analysis.ignoredRows.length, 1);
  assert.equal(analysis.ignoredRows[0].professionalName, "Profissional B");
  assert.equal(analysis.ignoredRowsPreview[0].professionalName, "Profissional B");

  const finding = analysis.findings.find((item) => item.type === "duplicidade_exata");
  assert.ok(finding);
  assert.deepEqual(
    finding.rows.map((row) => row.rowIndex),
    [2, 3]
  );
});

test("marca conflito de profissional na mesma especialidade e ignora linhas com convenio neuro nessa regra", async () => {
  const { buildAdminAnalysisFromRows } = await loadModule();

  const analysis = buildAdminAnalysisFromRows({
    fileName: "teste.xlsx",
    rawRows: [
      [
        "Cód profissional",
        "Profissional",
        "Especialidade",
        "Cód paciente",
        "Paciente",
        "Data e hora Agendada",
        "Convênio",
        "Status",
      ],
      ["10", "Profissional A", "Psicologia", "100", "Paciente X", "02/03/2026 08:00", "AMIL", "Agendado"],
      ["11", "Profissional B", "Psicologia", "100", "Paciente X", "09/03/2026 08:00", "AMIL", "Agendado"],
      ["12", "Profissional C", "Psicologia", "100", "Paciente X", "16/03/2026 08:00", "AMIL NEURO", "Agendado"],
      ["13", "Profissional D", "Nutrição", "100", "Paciente X", "17/03/2026 08:00", "AMIL", "Agendado"],
    ],
  });

  assert.equal(analysis.summary.professionalConflictGroups, 1);
  assert.equal(analysis.summary.professionalConflictRows, 2);
  assert.equal(analysis.summary.neuroRowsIgnoredFromProfessionalRule, 1);

  const finding = analysis.findings.find(
    (item) => item.type === "conflito_profissional_mesma_especialidade"
  );
  assert.ok(finding);
  assert.equal(finding.summary.professionalCount, 2);
  assert.equal(finding.summary.neuroRowsIgnored, 1);
  assert.deepEqual(
    finding.rows.map((row) => row.professionalCode),
    ["10", "11"]
  );
});

test("aplica filtros de status, período e marcadores de paciente antes de montar os grupos", async () => {
  const { buildAdminAnalysisFromRows } = await loadModule();

  const analysis = buildAdminAnalysisFromRows({
    fileName: "teste.xlsx",
    filters: {
      statusMode: "selected",
      statuses: ["Agendado", "Confirmado"],
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
      ignorePatientMarkers: ["LIVRE", "BLOQUEADO"],
      ignoreEmptyPatientName: true,
    },
    rawRows: [
      [
        "Cód profissional",
        "Profissional",
        "Especialidade",
        "Cód paciente",
        "Paciente",
        "Data e hora Agendada",
        "Convênio",
        "Status",
      ],
      ["10", "Profissional A", "Psicologia", "100", "Paciente X", "02/03/2026 08:00", "AMIL", "Agendado"],
      ["11", "Profissional B", "Psicologia", "101", "Paciente Y", "04/03/2026 08:00", "AMIL", "Finalizado"],
      ["12", "Profissional C", "Psicologia", "102", "BLOQUEADO", "05/03/2026 08:00", "AMIL", "Agendado"],
      ["13", "Profissional D", "Psicologia", "103", "", "06/03/2026 08:00", "AMIL", "Agendado"],
      ["14", "Profissional E", "Psicologia", "104", "Paciente Z", "10/04/2026 08:00", "AMIL", "Confirmado"],
      ["15", "Profissional F", "Psicologia", "105", "Paciente W", "07/03/2026 08:00", "AMIL", "Confirmado"],
    ],
  });

  assert.equal(analysis.summary.analyzedRows, 2);
  assert.equal(analysis.summary.ignoredRows, 4);
  assert.equal(analysis.summary.filteredOutByStatus, 1);
  assert.equal(analysis.summary.filteredOutByDate, 1);
  assert.equal(analysis.summary.ignoredPatientMarkersRows, 2);
  assert.equal(analysis.summary.ignoredBreakdown.status_fora_do_filtro, 1);
  assert.equal(analysis.summary.ignoredBreakdown.fora_periodo, 1);
  assert.equal(analysis.summary.ignoredBreakdown.paciente_marcador_ignorado, 1);
  assert.equal(analysis.summary.ignoredBreakdown.paciente_vazio, 1);
  assert.deepEqual(
    analysis.filters.statuses,
    ["Agendado", "Confirmado"]
  );
  assert.deepEqual(
    analysis.filters.ignorePatientMarkers,
    ["LIVRE", "BLOQUEADO"]
  );
  assert.equal(analysis.findings.length, 0);
});
