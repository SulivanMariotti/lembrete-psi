
"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  SearchCheck,
  SlidersHorizontal,
  Upload,
} from "lucide-react";

import { Button, Card, Badge } from "../DesignSystem";
import { adminFetch } from "../../services/adminApi";
import { buildAdminAnalysisExportBundles, IGNORED_REASON_LABELS } from "../../lib/adminAnalysisExport";

const DEFAULT_STATUS_OPTIONS = [
  "Agendado",
  "Confirmado",
  "Finalizado",
  "Reagendado",
  "Cancelado",
  "Ncompareceu",
];

const DEFAULT_FILTERS = {
  statusMode: "all",
  statuses: [...DEFAULT_STATUS_OPTIONS],
  dateFrom: "",
  dateTo: "",
  ignorePatientMarkersText: "LIVRE",
  ignoreEmptyPatientName: true,
};

const DEFAULT_RESULTS_QUICK_FILTERS = {
  patientQuery: "",
  professionalQuery: "",
  specialty: "all",
  sortBy: "row",
};

const RESULTS_FILTER_OPTIONS = [
  { value: "all", label: "Todos os resultados" },
  { value: "duplicidade_exata", label: "Só duplicidade exata" },
  {
    value: "conflito_profissional_mesma_especialidade",
    label: "Só conflito de profissional",
  },
];

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseMarkerList(value) {
  return String(value || "")
    .split(/[;,\n]/)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function summarizeFindings(summary) {
  const total = Number(summary?.totalFindings || 0);
  if (!total) {
    return "Nenhum grupo com duplicidade/conflito foi encontrado.";
  }

  const exact = Number(summary?.exactDuplicateGroups || 0);
  const conflict = Number(summary?.professionalConflictGroups || 0);
  return `${total} grupo(s) encontrado(s): ${exact} de duplicidade exata e ${conflict} de conflito de profissional.`;
}

function getBadgeStatus(analysis) {
  if (!analysis) return { status: "pending", text: "Aguardando arquivo" };
  if (analysis?.summary?.totalFindings > 0) {
    return { status: "missing", text: `${analysis.summary.totalFindings} grupos encontrados` };
  }
  return { status: "confirmed", text: "Sem conflitos nas regras" };
}

function buildStatusOptions(analysis, selectedStatuses) {
  const catalog = Array.isArray(analysis?.filters?.availableStatuses)
    ? analysis.filters.availableStatuses.map((item) => cleanText(item?.status)).filter(Boolean)
    : [];

  const selected = Array.isArray(selectedStatuses) ? selectedStatuses : [];
  const merged = [...DEFAULT_STATUS_OPTIONS, ...catalog, ...selected];
  const deduped = [];
  const seen = new Set();

  for (const item of merged) {
    const label = cleanText(item);
    const key = normalizeText(label);
    if (!label || seen.has(key)) continue;
    seen.add(key);
    deduped.push(label);
  }

  return deduped;
}

function getFindingScheduledAtSortValue(finding) {
  const direct = cleanText(finding?.summary?.scheduledAt);
  if (direct) return normalizeText(direct);

  const values = Array.isArray(finding?.rows)
    ? finding.rows.map((row) => cleanText(row?.scheduledAt)).filter(Boolean)
    : [];

  if (!values.length) return "";
  return values
    .map((value) => normalizeText(value))
    .sort((left, right) => left.localeCompare(right, "pt-BR"))[0];
}

export default function AdminAnalysisView({ showToast }) {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [resultsFilter, setResultsFilter] = useState("all");
  const [resultsQuickFilters, setResultsQuickFilters] = useState(DEFAULT_RESULTS_QUICK_FILTERS);

  const previewHeaders = useMemo(() => analysis?.structure?.headers || [], [analysis]);
  const previewRows = useMemo(() => analysis?.previewRows || [], [analysis]);
  const findings = useMemo(() => analysis?.findings || [], [analysis]);
  const filteredFindings = useMemo(() => {
    if (resultsFilter === "all") return findings;
    return findings.filter((finding) => finding?.type === resultsFilter);
  }, [findings, resultsFilter]);
  const resultSpecialtyOptions = useMemo(() => {
    const values = [];
    const seen = new Set();

    for (const finding of findings) {
      const label = cleanText(finding?.specialty);
      const key = normalizeText(label);
      if (!label || seen.has(key)) continue;
      seen.add(key);
      values.push(label);
    }

    return values.sort((left, right) => left.localeCompare(right, "pt-BR"));
  }, [findings]);
  const refinedFindings = useMemo(() => {
    const patientQuery = normalizeText(resultsQuickFilters.patientQuery);
    const professionalQuery = normalizeText(resultsQuickFilters.professionalQuery);
    const specialtyFilter = normalizeText(resultsQuickFilters.specialty);
    const sortBy = resultsQuickFilters.sortBy || "row";

    const next = filteredFindings.filter((finding) => {
      if (patientQuery) {
        const patientMatches = [finding?.patientName, finding?.patientCode].some((value) =>
          normalizeText(value).includes(patientQuery)
        );
        if (!patientMatches) return false;
      }

      if (professionalQuery) {
        const professionalMatches = Array.isArray(finding?.rows)
          ? finding.rows.some((row) =>
              [row?.professionalName, row?.professionalCode].some((value) => normalizeText(value).includes(professionalQuery))
            )
          : false;
        if (!professionalMatches) return false;
      }

      if (specialtyFilter && specialtyFilter !== "all") {
        if (normalizeText(finding?.specialty) !== specialtyFilter) return false;
      }

      return true;
    });

    next.sort((left, right) => {
      if (sortBy === "patient") {
        return normalizeText(left?.patientName).localeCompare(normalizeText(right?.patientName), "pt-BR");
      }

      if (sortBy === "specialty") {
        const specialtyCompare = normalizeText(left?.specialty).localeCompare(normalizeText(right?.specialty), "pt-BR");
        if (specialtyCompare !== 0) return specialtyCompare;
        return normalizeText(left?.patientName).localeCompare(normalizeText(right?.patientName), "pt-BR");
      }

      if (sortBy === "scheduledAt") {
        const scheduledCompare = getFindingScheduledAtSortValue(left).localeCompare(getFindingScheduledAtSortValue(right), "pt-BR");
        if (scheduledCompare !== 0) return scheduledCompare;
        return (Number(left?.firstRowIndex) || 0) - (Number(right?.firstRowIndex) || 0);
      }

      return (Number(left?.firstRowIndex) || 0) - (Number(right?.firstRowIndex) || 0);
    });

    return next;
  }, [filteredFindings, resultsQuickFilters]);
  const missingRequiredFields = useMemo(() => analysis?.structure?.missingRequiredFields || [], [analysis]);
  const ignoredRowsPreview = useMemo(() => analysis?.ignoredRowsPreview || [], [analysis]);
  const exportBundles = useMemo(
    () => buildAdminAnalysisExportBundles({ analysis, fileName: file?.name || analysis?.file?.name }),
    [analysis, file]
  );
  const badge = useMemo(() => getBadgeStatus(analysis), [analysis]);
  const statusOptions = useMemo(
    () => buildStatusOptions(analysis, filters.statuses),
    [analysis, filters.statuses]
  );

  const openPicker = () => {
    inputRef.current?.click?.();
  };

  const handleFileChange = (event) => {
    const nextFile = event?.target?.files?.[0] || null;
    setFile(nextFile);
    setAnalysis(null);
    setError("");
    setResultsFilter("all");
    setResultsQuickFilters(DEFAULT_RESULTS_QUICK_FILTERS);

    if (!nextFile) return;

    const extension = String(nextFile.name || "")
      .trim()
      .toLowerCase()
      .slice(String(nextFile.name || "").lastIndexOf("."));

    if (extension !== ".xlsx") {
      setError("Formato inválido. Selecione uma planilha .xlsx.");
      showToast?.("Selecione uma planilha .xlsx.", "error");
      return;
    }
  };

  const toggleStatus = (status) => {
    const normalized = normalizeText(status);
    setFilters((current) => {
      const alreadySelected = current.statuses.some((item) => normalizeText(item) === normalized);
      return {
        ...current,
        statuses: alreadySelected
          ? current.statuses.filter((item) => normalizeText(item) !== normalized)
          : [...current.statuses, status],
      };
    });
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Selecione um arquivo .xlsx antes de analisar.");
      showToast?.("Selecione um arquivo .xlsx antes de continuar.", "error");
      return;
    }

    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      setError("O período está inválido. A data inicial não pode ser maior que a final.");
      showToast?.("Revise o período informado antes de analisar.", "error");
      return;
    }

    if (filters.statusMode === "selected" && !filters.statuses.length) {
      setError("Selecione pelo menos um status ou volte para a opção de analisar todos.");
      showToast?.("Defina ao menos um status para o filtro selecionado.", "error");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("statusMode", filters.statusMode);
      formData.set("statuses", JSON.stringify(filters.statusMode === "selected" ? filters.statuses : []));
      formData.set("dateFrom", filters.dateFrom || "");
      formData.set("dateTo", filters.dateTo || "");
      formData.set("ignorePatientMarkers", JSON.stringify(parseMarkerList(filters.ignorePatientMarkersText)));
      formData.set("ignoreEmptyPatientName", String(Boolean(filters.ignoreEmptyPatientName)));

      const response = await adminFetch("/api/admin/analysis/excel-preview", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok || !data?.analysis) {
        throw new Error(data?.error || "Não foi possível analisar a planilha.");
      }

      setAnalysis(data.analysis);
      setResultsFilter("all");
      showToast?.(summarizeFindings(data.analysis?.summary), "success");
    } catch (requestError) {
      const message = String(requestError?.message || "Erro ao analisar a planilha.");
      setAnalysis(null);
      setError(message);
      showToast?.(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setAnalysis(null);
    setError("");
    setFilters(DEFAULT_FILTERS);
    setResultsFilter("all");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const updateResultsQuickFilters = (partial) => {
    setResultsQuickFilters((current) => ({
      ...current,
      ...partial,
    }));
  };

  const handleExportBundle = (bundle) => {
    if (!bundle?.rowCount) {
      showToast?.(bundle?.emptyMessage || "Não há linhas para exportar.", "error");
      return;
    }

    try {
      const blob = new Blob([bundle.csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = bundle.fileName || "analise.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      showToast?.(`${bundle.rowCount} linha(s) exportadas em ${bundle.label}.`, "success");
    } catch (exportError) {
      showToast?.(
        String(exportError?.message || "Não foi possível exportar o arquivo CSV."),
        "error"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft size={16} />
            Voltar ao painel admin
          </a>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600">
              <SearchCheck size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin • Análise de duplicidades</h1>
              <p className="text-sm text-slate-500">
                Faça upload do Excel e aplique as regras de agendamento: duplicidade exata e troca de profissional na mesma especialidade, com exceção para convênio contendo “neuro”.
              </p>
            </div>
          </div>
        </div>

        <Badge status={badge.status} text={badge.text} />
      </div>

      <div className="space-y-6">
        <Card title="1. Upload da planilha">
          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Arquivo esperado</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Planilha <b>.xlsx</b> com cabeçalho na primeira linha útil.
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-slate-500">
                    Regras ativas: (1) mesma combinação paciente + especialidade + profissional + data/hora e (2) troca de profissional na mesma especialidade, ignorando linhas com convênio contendo “neuro”.
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
                  <div>
                    <b>Campos esperados:</b>
                  </div>
                  <div className="mt-1">
                    Cód profissional • Profissional • Especialidade • Cód paciente • Paciente • Data e hora Agendada • Convênio • Status
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="ml-1 text-xs font-bold uppercase text-slate-500">Arquivo .xlsx</label>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
                disabled={loading}
              />

              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                <Button type="button" variant="secondary" onClick={openPicker} icon={Upload} disabled={loading}>
                  Escolher arquivo
                </Button>

                <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {file ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <FileSpreadsheet size={16} className="text-violet-600" />
                      <span className="truncate font-medium text-slate-800">{file.name}</span>
                      <span className="text-slate-400">•</span>
                      <span>{formatBytes(file.size)}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Nenhum arquivo selecionado.</span>
                  )}
                </div>
              </div>

              {error ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleAnalyze} disabled={loading || !file} icon={SearchCheck}>
                {loading ? "Analisando planilha..." : "Analisar duplicidades"}
              </Button>

              <Button type="button" variant="secondary" disabled={loading} onClick={resetForm}>
                Limpar
              </Button>
            </div>
          </div>
        </Card>

        <Card title="2. Filtros da análise">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Use os filtros antes de rodar a análise para reduzir falso positivo. A exceção do convênio contendo <b>“neuro”</b> continua fixa na regra de troca de profissional.
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SlidersHorizontal size={16} className="text-violet-600" />
                Status considerados
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="statusMode"
                    className="h-4 w-4"
                    checked={filters.statusMode === "all"}
                    onChange={() => setFilters((current) => ({ ...current, statusMode: "all" }))}
                    disabled={loading}
                  />
                  Todos os status
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="statusMode"
                    className="h-4 w-4"
                    checked={filters.statusMode === "selected"}
                    onChange={() => setFilters((current) => ({ ...current, statusMode: "selected" }))}
                    disabled={loading}
                  />
                  Filtrar por status
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {statusOptions.map((status) => {
                  const checked = filters.statuses.some((item) => normalizeText(item) === normalizeText(status));

                  return (
                    <label
                      key={status}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        filters.statusMode === "selected"
                          ? "border-slate-200 bg-slate-50 text-slate-700"
                          : "border-slate-100 bg-slate-50/60 text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleStatus(status)}
                        disabled={loading || filters.statusMode !== "selected"}
                      />
                      <span className="font-medium">{status}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Período</div>
                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Data inicial</div>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                      disabled={loading}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    />
                  </label>

                  <label className="block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Data final</div>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                      disabled={loading}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Pacientes especiais</div>
                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Marcadores para ignorar
                    </div>
                    <textarea
                      value={filters.ignorePatientMarkersText}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          ignorePatientMarkersText: event.target.value,
                        }))
                      }
                      disabled={loading}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      placeholder="Ex.: LIVRE, BLOQUEADO"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(filters.ignoreEmptyPatientName)}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          ignoreEmptyPatientName: event.target.checked,
                        }))
                      }
                      disabled={loading}
                    />
                    Ignorar linha com nome de paciente vazio
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Regras ativas</div>
              <div className="mt-2 space-y-2">
                {(analysis?.rules || []).length ? (
                  (analysis?.rules || []).map((rule) => (
                    <div key={rule.id} className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-700">
                      <b>{rule.label}:</b> {rule.description}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-700">
                      <b>Duplicidade exata:</b> mesmo paciente, mesma especialidade, mesmo profissional e mesma data/hora agendada.
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-700">
                      <b>Conflito de profissional:</b> mesmo paciente e mesma especialidade com profissionais diferentes, exceto quando o convênio contiver “neuro”.
                    </div>
                  </>
                )}
              </div>
            </div>

            {analysis ? (
              <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Leitura concluída</div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div>
                      <b>Aba:</b> {analysis?.workbook?.sheetName || "Sheet1"}
                    </div>
                    <div>
                      <b>Quantidade de abas:</b> {analysis?.workbook?.sheetCount || 1}
                    </div>
                    <div>
                      <b>Linha do cabeçalho:</b> {analysis?.structure?.headerRowIndex || 1}
                    </div>
                  </div>

                  <div>
                    <div>
                      <b>Linhas analisadas:</b> {analysis?.summary?.analyzedRows || 0}
                    </div>
                    <div>
                      <b>Linhas ignoradas:</b> {analysis?.summary?.ignoredRows || 0}
                    </div>
                    <div>
                      <b>Linhas com “neuro” fora da regra 2:</b> {analysis?.summary?.neuroRowsIgnoredFromProfessionalRule || 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Filtros aplicados</div>
                  <div className="flex flex-col gap-2">
                    {(analysis?.filters?.summary || []).map((item) => (
                      <div key={item} className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs text-slate-600">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Configure os filtros desejados e envie a planilha para rodar a análise completa.
              </div>
            )}
          </div>
        </Card>
      </div>

      {analysis ? (
        <Card title="3. Resumo da varredura">
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Duplicidade exata</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{analysis?.summary?.exactDuplicateGroups || 0}</div>
                <div className="mt-1 text-sm text-slate-500">{analysis?.summary?.exactDuplicateRows || 0} linhas envolvidas</div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Conflito de profissional</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{analysis?.summary?.professionalConflictGroups || 0}</div>
                <div className="mt-1 text-sm text-slate-500">{analysis?.summary?.professionalConflictRows || 0} linhas envolvidas</div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Linhas analisadas</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{analysis?.summary?.analyzedRows || 0}</div>
                <div className="mt-1 text-sm text-slate-500">de {analysis?.summary?.dataRows || 0} linhas úteis</div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Linhas ignoradas</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{analysis?.summary?.ignoredRows || 0}</div>
                <div className="mt-1 text-sm text-slate-500">filtros para evitar falso positivo</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Filtradas por status</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{analysis?.summary?.filteredOutByStatus || 0}</div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Filtradas por período</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{analysis?.summary?.filteredOutByDate || 0}</div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Pacientes especiais ignorados</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{analysis?.summary?.ignoredPatientMarkersRows || 0}</div>
              </div>
            </div>

            {missingRequiredFields.length ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                <div className="font-semibold">Campos obrigatórios não encontrados</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missingRequiredFields.map((item) => (
                    <span
                      key={item.field}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {(analysis?.summary?.ignoredRows || 0) > 0 ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">Motivos de linhas ignoradas</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analysis?.summary?.ignoredBreakdown || {}).map(([reason, count]) => (
                    <span
                      key={reason}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {IGNORED_REASON_LABELS[reason] || reason}: {count}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {analysis ? (
        <Card title="4. Exportação dos resultados">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Baixe os CSVs operacionais separados por tipo de ocorrência. Cada arquivo inclui a linha original da planilha, o motivo do apontamento e os campos-chave usados na análise.
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {exportBundles.map((bundle) => (
                <div key={bundle.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">{bundle.label}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {bundle.rowCount} linha(s) prontas para exportação
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      icon={Download}
                      className="w-full justify-center"
                      onClick={() => handleExportBundle(bundle)}
                      disabled={!bundle.rowCount}
                    >
                      Exportar CSV
                    </Button>
                  </div>
                  <div className="mt-3 break-all text-[11px] text-slate-400">{bundle.fileName}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="5. Resultados encontrados">
        {!analysis ? (
          <div className="text-sm text-slate-500">Depois da análise, os grupos com linhas duplicadas ou conflitantes aparecem aqui.</div>
        ) : !findings.length ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            Nenhum grupo com duplicidade exata ou conflito de profissional foi encontrado com as regras e filtros atuais.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Filtro dos resultados</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Separe rapidamente as duplicidades exatas dos conflitos de profissional sem refazer a análise.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {RESULTS_FILTER_OPTIONS.map((option) => {
                    const isActive = resultsFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setResultsFilter(option.value)}
                        className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  Total: {findings.length} grupo(s)
                </span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  Duplicidade exata: {analysis?.summary?.exactDuplicateGroups || 0}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Conflito de profissional: {analysis?.summary?.professionalConflictGroups || 0}
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  Exibindo agora: {refinedFindings.length} grupo(s)
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
              <div className="grid gap-3 xl:grid-cols-4">
                <label className="block">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar paciente</div>
                  <input
                    type="text"
                    value={resultsQuickFilters.patientQuery}
                    onChange={(event) => updateResultsQuickFilters({ patientQuery: event.target.value })}
                    placeholder="Nome ou código do paciente"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar profissional</div>
                  <input
                    type="text"
                    value={resultsQuickFilters.professionalQuery}
                    onChange={(event) => updateResultsQuickFilters({ professionalQuery: event.target.value })}
                    placeholder="Nome ou código do profissional"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Especialidade</div>
                  <select
                    value={resultsQuickFilters.specialty}
                    onChange={(event) => updateResultsQuickFilters({ specialty: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="all">Todas as especialidades</option>
                    {resultSpecialtyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Ordenar por</div>
                  <select
                    value={resultsQuickFilters.sortBy}
                    onChange={(event) => updateResultsQuickFilters({ sortBy: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="row">Linha da planilha</option>
                    <option value="patient">Paciente</option>
                    <option value="specialty">Especialidade</option>
                    <option value="scheduledAt">Data/hora</option>
                  </select>
                </label>
              </div>
            </div>

            {!refinedFindings.length ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                Nenhum grupo corresponde ao recorte atual desta faixa de resultados.
              </div>
            ) : (
              refinedFindings.map((finding) => (
                <details
                  key={finding.id}
                  className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:border-violet-200 open:ring-1 open:ring-violet-100"
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          status={finding.type === "duplicidade_exata" ? "missing" : "pending"}
                          text={finding.typeLabel}
                        />
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {finding.rowCount} linhas
                        </span>
                      </div>

                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {finding.patientName || "Paciente sem nome"} • {finding.specialty || "Especialidade não informada"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Código do paciente: {finding.patientCode || "—"} • Primeira linha: {finding.firstRowIndex}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 md:text-right">
                      {finding.type === "duplicidade_exata" ? (
                        <div>Data/hora repetida: {finding?.summary?.scheduledAt || "—"}</div>
                      ) : (
                        <>
                          <div>Profissionais distintos: {finding?.summary?.professionalCount || 0}</div>
                          <div>Linhas “neuro” fora da regra: {finding?.summary?.neuroRowsIgnored || 0}</div>
                        </>
                      )}
                    </div>
                  </summary>

                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="overflow-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Linha</th>
                            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Profissional</th>
                            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Data/Hora</th>
                            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Convênio</th>
                            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {finding.rows.map((row) => (
                            <tr key={`${finding.id}-${row.rowIndex}`}>
                              <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{row.rowIndex}</td>
                              <td className="px-3 py-3 text-slate-700">
                                <div className="font-medium text-slate-800">{row.professionalName || "—"}</div>
                                <div className="text-xs text-slate-500">Cód: {row.professionalCode || "—"}</div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-slate-700">{row.scheduledAt || "—"}</td>
                              <td className="px-3 py-3 text-slate-700">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{row.convenio || "—"}</span>
                                  {row.hasNeuroConvenio ? (
                                    <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                                      neuro
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-slate-700">{row.status || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>
        )}
      </Card>

      <Card title="6. Preview das linhas">
        {!previewRows.length ? (
          <div className="text-sm text-slate-500">
            O preview mostra as primeiras linhas úteis da planilha, com o número real da linha para facilitar a conferência dos resultados.
          </div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Linha</th>
                  {previewHeaders.map((header) => (
                    <th
                      key={`head-${header.key}`}
                      className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {previewRows.map((row) => (
                  <tr key={`row-${row.rowIndex}`}>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-600">{row.rowIndex}</td>
                    {previewHeaders.map((header, columnIndex) => (
                      <td key={`${row.rowIndex}-${header.key}`} className="px-3 py-3 text-slate-700">
                        {row.values?.[columnIndex] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {ignoredRowsPreview.length ? (
        <Card title="7. Preview de linhas ignoradas">
          <div className="overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Linha</th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Paciente</th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Especialidade</th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Data/Hora</th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Motivos</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {ignoredRowsPreview.map((row) => (
                  <tr key={`ignored-${row.rowIndex}`}>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{row.rowIndex}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="font-medium text-slate-800">{row.patientName || "—"}</div>
                      <div className="text-xs text-slate-500">Cód: {row.patientCode || "—"}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{row.specialty || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-700">{row.scheduledAt || "—"}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="flex flex-wrap gap-2">
                        {(row.ignoredReasons || []).map((reason) => (
                          <span
                            key={`${row.rowIndex}-${reason}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                          >
                            {IGNORED_REASON_LABELS[reason] || reason}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
