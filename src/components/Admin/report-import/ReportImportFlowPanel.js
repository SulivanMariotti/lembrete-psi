"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  ListFilter,
  RefreshCcw,
  Search,
  Upload,
} from "lucide-react";

import { Badge, Button, Card } from "../../DesignSystem";
import { REPORT_IMPORT_TEMPLATE } from "../../../lib/shared/reportImportTemplate";
import { REPORT_DEMAND_CATEGORY_OPTIONS } from "../../../lib/shared/reportDemands";
import { buildTemplateSummary } from "../../../lib/shared/reportTemplates";
import {
  categoryStatusToBadge,
  formatBytes,
  formatSessionExpiry,
} from "./shared";

const ROW_STATUS_FILTERS = [
  { id: "all", label: "Todas as linhas" },
  { id: "ready", label: "Só prontas" },
  { id: "attention", label: "Só com atenção" },
];

const STATUS_COUNTER_LABELS = {
  ready: "Prontas",
  "excel-missing-demand": "Sem Demanda/Tags",
  "excel-demand-not-found": "Demanda não encontrada",
  "missing-specialty": "Especialidade em branco",
  "specialty-not-found": "Especialidade não encontrada",
  "inactive-specialty": "Especialidade inativa",
  "specialty-without-default-demand": "Sem Demanda padrão",
  "inactive-demand": "Demanda inativa",
  "missing-category": "Categoria vazia",
};

const PREVIEW_SORT_COLUMNS = [
  { key: "rowIndex", label: "Linha" },
  { key: "patientProfessional", label: "Paciente / Profissional" },
  { key: "especialidade", label: "Especialidade" },
  { key: "demandRead", label: "Demanda lida" },
  { key: "demandName", label: "Demanda resolvida" },
  { key: "cidCategory", label: "CID / Categoria" },
  { key: "categoryStatus", label: "Status" },
];

const PREVIEW_UI_SESSION_KEY = "admin-report-import-preview-ui:v1";


const STATUS_CARD_FILTERS = {
  ready: "ready",
  "excel-missing-demand": "excel-missing-demand",
  "excel-demand-not-found": "excel-demand-not-found",
  "missing-specialty": "missing-specialty",
  "specialty-not-found": "specialty-not-found",
  "inactive-specialty": "inactive-specialty",
  "specialty-without-default-demand": "specialty-without-default-demand",
  "inactive-demand": "inactive-demand",
  "missing-category": "missing-category",
};

const MATCH_SUMMARY_FILTERS = {
  missingSpecialty: "missing-specialty",
  specialtyNotFound: "specialty-not-found",
  inactiveSpecialty: "inactive-specialty",
  excelMissingDemand: "excel-missing-demand",
  excelDemandNotFound: "excel-demand-not-found",
  specialtyWithoutDefaultDemand: "specialty-without-default-demand",
  inactiveDemand: "inactive-demand",
  missingCategory: "missing-category",
};

const FACET_FILTER_FIELDS = {
  especialidade: "Especialidade",
  profissional: "Profissional",
  demandName: "Demanda resolvida",
};

function getStatusFilterBadgeLabel(statusKey) {
  if (!statusKey) return "Todos os status";
  if (statusKey === "__attention__") return "Só com atenção";
  return STATUS_COUNTER_LABELS[statusKey] || (categoryStatusToBadge(statusKey)?.text || "Status filtrado");
}

function getFacetFilterValue(row = {}, facetKey = "") {
  if (!facetKey) return "";
  return String(row?.[facetKey] || "").trim();
}

function normalizeFacetFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getFacetFilterLabel(facetKey = "") {
  return FACET_FILTER_FIELDS[facetKey] || "Filtro contextual";
}


function buildPreviewRowKey(row = {}) {
  return `${row?.rowIndex || "row"}-${row?.paciente || ""}-${row?.profissional || ""}`;
}

function getPreviewRowTone(status) {
  if (status === "ready") {
    return {
      row: "bg-white",
      accent: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
      details: "border-emerald-100 bg-emerald-50/40",
      icon: "OK",
    };
  }

  if (status === "excel-demand-not-found" || status === "specialty-not-found") {
    return {
      row: "bg-rose-50/70",
      accent: "border-rose-200 bg-rose-100 text-rose-700",
      details: "border-rose-100 bg-rose-50/70",
      icon: "Erro",
    };
  }

  return {
    row: "bg-amber-50/60",
    accent: "border-amber-200 bg-amber-100 text-amber-700",
    details: "border-amber-100 bg-amber-50/70",
    icon: "Atenção",
  };
}

function normalizeSortableValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getPreviewRowSortValue(row = {}, sortKey, selectedCategory) {
  switch (sortKey) {
    case "rowIndex":
      return Number(row?.rowIndex || 0);
    case "patientProfessional":
      return normalizeSortableValue(`${row?.paciente || ""} ${row?.profissional || ""}`);
    case "especialidade":
      return normalizeSortableValue(row?.especialidade);
    case "demandRead":
      return normalizeSortableValue(row?.demanda || row?.tags || "");
    case "demandName":
      return normalizeSortableValue(row?.demandName || "");
    case "cidCategory":
      return normalizeSortableValue(`${row?.resolvedCid || ""} ${row?.categoryTitle || `categoria ${selectedCategory || ""}`}`);
    case "categoryStatus":
      return normalizeSortableValue(`${row?.categoryStatusLabel || ""} ${row?.categoryStatus || ""}`);
    default:
      return normalizeSortableValue(row?.rowIndex);
  }
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }

  return false;
}

function buildRowDetailsText(row = {}, selectedCategory) {
  const badge = categoryStatusToBadge(row?.categoryStatus);
  const categoryText = row?.categoryTitle || `Categoria ${selectedCategory} sem conteúdo`;

  return [
    `Linha: #${row?.rowIndex || "—"}`,
    `Status: ${badge?.text || row?.categoryStatusLabel || "Sem status"}`,
    `Detalhe do status: ${row?.categoryStatusLabel || "Sem detalhe adicional"}`,
    `Paciente: ${row?.paciente || "—"}`,
    `Profissional: ${row?.profissional || "—"}`,
    `Especialidade: ${row?.especialidade || "—"}`,
    `Demanda lida: ${row?.demanda || "—"}`,
    `Tags lidas: ${row?.tags || "—"}`,
    `Demanda resolvida: ${row?.demandName || "Não resolvida"}`,
    `Origem da resolução: ${row?.demandSourceUsed || "—"}`,
    `CID resolvido: ${row?.resolvedCid || "—"}`,
    `Categoria resolvida: ${categoryText}`,
    `Data/Hora agendada: ${row?.dataHoraAgendada || "—"}`,
    `Convênio: ${row?.convenio || "—"}`,
  ].join("\n");
}

function SortHeaderButton({ label, sortKey, activeSortKey, sortDirection, onClick }) {
  const isActive = activeSortKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={`inline-flex items-center gap-2 rounded-lg px-1 py-1 transition ${
        isActive ? "text-violet-700" : "text-slate-500 hover:text-slate-700"
      }`}
      title={`Ordenar por ${label}`}
    >
      <span>{label}</span>
      <ArrowUpDown size={14} className={isActive ? "text-violet-600" : "text-slate-400"} />
      {isActive ? <span className="text-[10px] font-bold uppercase">{sortDirection === "asc" ? "A-Z" : "Z-A"}</span> : null}
    </button>
  );
}

export default function ReportImportFlowPanel({
  importFlow,
  templatesManager,
  specialtiesCount = 0,
}) {
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowFilter, setRowFilter] = useState("all");
  const [statusDrilldown, setStatusDrilldown] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState({});
  const [sortKey, setSortKey] = useState("rowIndex");
  const [sortDirection, setSortDirection] = useState("asc");
  const [copiedRowKey, setCopiedRowKey] = useState("");
  const [facetFilter, setFacetFilter] = useState({ key: "", value: "" });
  const [uiStateHydrated, setUiStateHydrated] = useState(false);

  const {
    file,
    busy,
    pdfBusy,
    result,
    templateError,
    importSessionId,
    expiresAt,
    selectedCategory,
    readyRows,
    handleCategoryChange,
    handleFileChange,
    handleResetImport,
    handleSubmitImport,
    handleGeneratePdf,
  } = importFlow;

  const {
    templates,
    selectedTemplateId,
    selectedTemplate,
    setSelectedTemplateId,
  } = templatesManager;

  const previewRows = useMemo(
    () => (Array.isArray(result?.previewRows) ? result.previewRows : []),
    [result]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawValue = window.sessionStorage.getItem(PREVIEW_UI_SESSION_KEY);
      if (!rawValue) {
        setUiStateHydrated(true);
        return;
      }

      const parsed = JSON.parse(rawValue);
      const nextSortKey = PREVIEW_SORT_COLUMNS.some((column) => column.key === parsed?.sortKey) ? parsed.sortKey : "rowIndex";
      const nextSortDirection = parsed?.sortDirection === "desc" ? "desc" : "asc";
      const nextRowFilter = ROW_STATUS_FILTERS.some((item) => item.id === parsed?.rowFilter) ? parsed.rowFilter : "all";
      const nextStatusDrilldown = typeof parsed?.statusDrilldown === "string" ? parsed.statusDrilldown : "";
      const nextFacetKey = Object.prototype.hasOwnProperty.call(FACET_FILTER_FIELDS, parsed?.facetFilterKey) ? parsed.facetFilterKey : "";
      const nextFacetValue = typeof parsed?.facetFilterValue === "string" ? parsed.facetFilterValue : "";

      setSortKey(nextSortKey);
      setSortDirection(nextSortDirection);
      setRowFilter(nextRowFilter);
      setStatusDrilldown(nextStatusDrilldown);
      setFacetFilter({
        key: nextFacetKey,
        value: nextFacetKey ? nextFacetValue : "",
      });
    } catch (_error) {
      // ignora estado inválido salvo na sessão
    } finally {
      setUiStateHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!uiStateHydrated || typeof window === "undefined") return;

    const payload = {
      rowFilter,
      sortKey,
      sortDirection,
      statusDrilldown,
      facetFilterKey: facetFilter.key,
      facetFilterValue: facetFilter.value,
    };

    window.sessionStorage.setItem(PREVIEW_UI_SESSION_KEY, JSON.stringify(payload));
  }, [rowFilter, sortKey, sortDirection, statusDrilldown, facetFilter, uiStateHydrated]);

  const invalidRows = result ? Math.max(0, Number(result?.summary?.totalRows || 0) - readyRows) : 0;

  const rowStatusCounters = useMemo(() => {
    const counterMap = previewRows.reduce((acc, row) => {
      const statusKey = String(row?.categoryStatus || "unknown").trim() || "unknown";
      acc[statusKey] = Number(acc[statusKey] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counterMap)
      .map(([statusKey, value]) => ({
        statusKey,
        value,
        label: STATUS_COUNTER_LABELS[statusKey] || (categoryStatusToBadge(statusKey)?.text || "Outro status"),
        tone: getPreviewRowTone(statusKey),
        ready: statusKey === "ready",
        filterTarget: STATUS_CARD_FILTERS[statusKey] || "",
        active: statusDrilldown === (STATUS_CARD_FILTERS[statusKey] || ""),
      }))
      .sort((a, b) => {
        if (a.ready && !b.ready) return -1;
        if (!a.ready && b.ready) return 1;
        return b.value - a.value;
      });
  }, [previewRows, statusDrilldown]);

  const mismatchSummaryItems = useMemo(
    () =>
      [
        { key: "missingSpecialty", label: "Especialidade em branco", value: Number(result?.matchSummary?.missingSpecialty || 0) },
        { key: "specialtyNotFound", label: "Especialidade não encontrada", value: Number(result?.matchSummary?.specialtyNotFound || 0) },
        { key: "inactiveSpecialty", label: "Especialidade inativa", value: Number(result?.matchSummary?.inactiveSpecialty || 0) },
        { key: "excelMissingDemand", label: "Sem Demanda/Tags no arquivo", value: Number(result?.matchSummary?.excelMissingDemand || 0) },
        { key: "excelDemandNotFound", label: "Demanda da planilha não encontrada", value: Number(result?.matchSummary?.excelDemandNotFound || 0) },
        { key: "specialtyWithoutDefaultDemand", label: "Sem Demanda padrão", value: Number(result?.matchSummary?.specialtyWithoutDefaultDemand || 0) },
        { key: "inactiveDemand", label: "Demanda inativa", value: Number(result?.matchSummary?.inactiveDemand || 0) },
        { key: "missingCategory", label: "Categoria vazia", value: Number(result?.matchSummary?.missingCategory || 0) },
      ]
        .map((item) => ({
          ...item,
          filterTarget: MATCH_SUMMARY_FILTERS[item.key] || "",
          active: statusDrilldown === (MATCH_SUMMARY_FILTERS[item.key] || ""),
        }))
        .filter((item) => item.value > 0),
    [result, statusDrilldown]
  );

  const handleTemplateSelectChange = (nextValue) => {
    setSelectedTemplateId(nextValue);
    importFlow.clearFrozenPreview();
  };

  const filteredPreviewRows = useMemo(() => {
    const normalizedQuery = String(searchQuery || "").trim().toLowerCase();

    const nextRows = previewRows.filter((row) => {
      const statusKey = String(row?.categoryStatus || "").trim();
      const isReady = statusKey === "ready";
      if (rowFilter === "ready" && !isReady) return false;
      if (rowFilter === "attention" && isReady) return false;
      if (statusDrilldown === "__attention__" && isReady) return false;
      if (statusDrilldown && statusDrilldown !== "__attention__" && statusKey !== statusDrilldown) return false;

      if (facetFilter.key && facetFilter.value) {
        const rowFacetValue = normalizeFacetFilterValue(getFacetFilterValue(row, facetFilter.key));
        if (rowFacetValue !== normalizeFacetFilterValue(facetFilter.value)) return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        row?.rowIndex,
        row?.paciente,
        row?.profissional,
        row?.especialidade,
        row?.demanda,
        row?.tags,
        row?.demandName,
        row?.categoryStatusLabel,
        row?.resolvedCid,
        row?.convenio,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(normalizedQuery);
    });

    return [...nextRows].sort((a, b) => {
      const valueA = getPreviewRowSortValue(a, sortKey, selectedCategory);
      const valueB = getPreviewRowSortValue(b, sortKey, selectedCategory);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      const compared = String(valueA).localeCompare(String(valueB), "pt-BR", { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? compared : compared * -1;
    });
  }, [previewRows, rowFilter, searchQuery, sortKey, sortDirection, selectedCategory]);

  const renderedRowsCount = filteredPreviewRows.length;
  const previewRowsCount = previewRows.length;
  const attentionRowsVisible = filteredPreviewRows.filter((row) => row?.categoryStatus !== "ready");
  const activeStatusDrilldownLabel = getStatusFilterBadgeLabel(statusDrilldown);

  const handleClearPreview = () => {
    handleResetImport(fileInputRef.current);
    setSearchQuery("");
    setExpandedRowKeys({});
    setCopiedRowKey("");
    setStatusDrilldown("");
  };


  const activeFacetFilterLabel =
    facetFilter.key && facetFilter.value ? `${getFacetFilterLabel(facetFilter.key)}: ${facetFilter.value}` : "";

  const handleClearFacetFilter = () => {
    setFacetFilter({ key: "", value: "" });
  };

  const handleExpandAttentionRows = () => {
    if (!attentionRowsVisible.length) return;

    setExpandedRowKeys((current) => {
      const nextState = { ...current };

      attentionRowsVisible.forEach((row) => {
        nextState[buildPreviewRowKey(row)] = true;
      });

      return nextState;
    });
  };

  const handleCollapseAllRows = () => {
    setExpandedRowKeys({});
  };

  const handleToggleRowExpanded = (rowKey) => {
    setExpandedRowKeys((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  };

  const handleChangeSort = (nextSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "rowIndex" ? "asc" : "asc");
  };

  const handleToggleStatusDrilldown = (nextStatusKey) => {
    if (!nextStatusKey) return;

    const willClear = statusDrilldown === nextStatusKey;

    if (willClear) {
      setStatusDrilldown("");
      setRowFilter("all");
      return;
    }

    setStatusDrilldown(nextStatusKey);

    if (nextStatusKey === "ready") {
      setRowFilter("ready");
      return;
    }

    setRowFilter("attention");
  };

  const handleClearStatusDrilldown = () => {
    setStatusDrilldown("");
    setRowFilter("all");
  };


  const handleCopyRowDetails = async (row) => {
    const rowKey = buildPreviewRowKey(row);
    const text = buildRowDetailsText(row, selectedCategory);
    const copied = await copyTextToClipboard(text);

    if (!copied) return;

    setCopiedRowKey(rowKey);
    window.setTimeout(() => {
      setCopiedRowKey((current) => (current === rowKey ? "" : current));
    }, 1800);
  };

  return (
    <div className="space-y-5">
      <Card title="Importar planilha e validar lote">
        <form className="space-y-6" onSubmit={handleSubmitImport}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="ml-1 text-xs font-bold uppercase text-slate-500">Categoria do lote</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                value={selectedCategory}
                onChange={(event) => handleCategoryChange(event.target.value)}
              >
                {REPORT_DEMAND_CATEGORY_OPTIONS.map((categoryNumber) => (
                  <option key={categoryNumber} value={categoryNumber}>
                    Categoria {categoryNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="ml-1 text-xs font-bold uppercase text-slate-500">Modelo do relatório</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                value={selectedTemplateId}
                onChange={(event) => handleTemplateSelectChange(event.target.value)}
              >
                <option value="">Sem modelo ativo (usar padrão)</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.isActive ? " • ativo" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-5">
            <div className="text-sm font-semibold text-slate-800">Modelo aplicado ao lote</div>
            <div className="mt-1 text-sm text-slate-600">
              {selectedTemplate
                ? `${selectedTemplate.name} • ${buildTemplateSummary(selectedTemplate)}`
                : "Nenhum modelo selecionado; o PDF usa o layout padrão seguro do módulo."}
            </div>
          </div>

          <div>
            <label className="ml-1 text-xs font-bold uppercase text-slate-500">Arquivo .xlsx</label>
            <input
              ref={fileInputRef}
              id="report-import-file"
              type="file"
              accept=".xlsx"
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-violet-700"
              onChange={(event) => handleFileChange(event, fileInputRef.current)}
            />
            <div className="mt-2 text-xs text-slate-500">
              Modelo esperado: {(Array.isArray(REPORT_IMPORT_TEMPLATE?.requiredHeaders) ? REPORT_IMPORT_TEMPLATE.requiredHeaders : []).join(" • ")}
            </div>
            {file ? (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="font-medium text-slate-800">{file.name}</div>
                <div className="mt-1 text-xs text-slate-500">{formatBytes(file.size)}</div>
              </div>
            ) : null}
          </div>

          {templateError ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {templateError}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Button type="submit" icon={Upload} disabled={busy || !file}>
              {busy ? "Analisando planilha..." : "Analisar planilha"}
            </Button>
            <Button type="button" icon={RefreshCcw} variant="ghost" disabled={!result && !file} onClick={handleClearPreview}>
              Limpar arquivo e preview
            </Button>
          </div>
        </form>
      </Card>

      {result ? (
        <Card title="Preview congelado e geração de PDF">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr),minmax(320px,0.9fr)]">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
              <div className="text-sm font-semibold text-slate-900">Sessão do preview</div>
              <div className="mt-2 text-sm text-slate-600">
                O PDF será sempre gerado a partir deste preview congelado enquanto a sessão estiver válida.
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <div><b>Session ID:</b> {importSessionId || "Não disponível"}</div>
                <div className="mt-1"><b>Expira em:</b> {formatSessionExpiry(expiresAt)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="text-xs font-bold uppercase text-emerald-700">Linhas prontas no preview</div>
                <div className="mt-2 text-3xl font-bold text-emerald-900">{readyRows}</div>
                <div className="mt-1 text-sm text-emerald-700">
                  Somente elas entram no PDF congelado desta sessão.
                </div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                <div className="text-xs font-bold uppercase text-violet-700">Categoria aplicada</div>
                <div className="mt-1.5 text-sm text-violet-800">
                  Categoria escolhida: <b>Categoria {selectedCategory}</b>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 xl:col-span-2">
                <div className="text-sm font-semibold text-slate-900">Ação do preview</div>
                <div className="mt-3">
                  <Button
                    type="button"
                    icon={FileDown}
                    className="w-full"
                    disabled={pdfBusy || !importSessionId || !readyRows}
                    onClick={handleGeneratePdf}
                  >
                    {pdfBusy ? "Gerando PDF..." : "Gerar PDF do lote"}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[13px] leading-5 text-amber-800 md:col-span-2 xl:col-span-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    Especialidades em modo <b>Demanda do arquivo</b> usam a coluna <b>Demanda</b> e, quando ela vier vazia,
                    fazem fallback em <b>Tags</b>. <b>CID</b> e <b>Categoria</b> sempre vêm da <b>Demanda resolvida no sistema</b>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="Resumo operacional do lote">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">Especialidades</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{specialtiesCount}</div>
            <div className="mt-1 text-sm text-slate-500">Cadastradas para validar a coluna Especialidade.</div>
          </div>

          <button
            type="button"
            onClick={() => handleToggleStatusDrilldown("ready")}
            className={`rounded-2xl border p-4 text-left transition ${statusDrilldown === "ready" ? "border-emerald-300 bg-emerald-100 shadow-sm" : "border-emerald-100 bg-emerald-50 hover:bg-emerald-100/70"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-emerald-700">Linhas prontas</div>
                <div className="mt-2 text-3xl font-bold text-emerald-900">{readyRows}</div>
                <div className="mt-1 text-sm text-emerald-700">Válidas para o PDF após validar Especialidade e Demanda.</div>
              </div>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold uppercase text-emerald-700">{statusDrilldown === "ready" ? "Filtrando" : "Filtrar"}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleToggleStatusDrilldown("__attention__")}
            className={`rounded-2xl border p-4 text-left transition ${statusDrilldown === "__attention__" ? "border-amber-300 bg-amber-100 shadow-sm" : "border-amber-100 bg-amber-50 hover:bg-amber-100/70"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-amber-700">Linhas com atenção</div>
                <div className="mt-2 text-3xl font-bold text-amber-900">{invalidRows}</div>
                <div className="mt-1 text-sm text-amber-700">Especialidade inválida, Demanda inconsistente, categoria vazia ou cadastro inativo.</div>
              </div>
              <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-bold uppercase text-amber-700">{statusDrilldown === "__attention__" ? "Filtrando" : "Filtrar"}</span>
            </div>
          </button>
        </div>

        {result?.selectedTemplate ? (
          <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
            Modelo aplicado na análise: <b>{result.selectedTemplate.name}</b>
          </div>
        ) : null}

        {!!mismatchSummaryItems.length && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {mismatchSummaryItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleToggleStatusDrilldown(item.filterTarget)}
                className={`rounded-xl border px-4 py-3 text-left transition ${item.active ? "border-amber-300 bg-amber-100 shadow-sm" : "border-amber-100 bg-amber-50 hover:bg-amber-100/70"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-bold uppercase text-amber-700">{item.label}</div>
                  <span className="rounded-full border border-amber-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-amber-700">{item.active ? "Filtrando" : "Filtrar"}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-amber-900">{item.value}</div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Leitura da planilha • linha a linha">
        {!result ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
            Analise uma planilha para abrir a lista de leitura linha a linha com status de <b>OK</b> ou <b>erro</b>.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),auto]">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por linha, paciente, profissional, especialidade, Demanda, Tags, CID..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {ROW_STATUS_FILTERS.map((filterItem) => (
                  <button
                    key={filterItem.id}
                    type="button"
                    onClick={() => setRowFilter(filterItem.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      rowFilter === filterItem.id
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <ListFilter size={15} />
                    {filterItem.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm text-violet-800">
              O filtro rápido, o filtro por status/erro e a ordenação desta tabela ficam salvos durante a sessão atual do navegador.
            </div>

            {statusDrilldown ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                <div>
                  Filtro específico ativo: <b>{activeStatusDrilldownLabel}</b>
                </div>
                <button
                  type="button"
                  onClick={handleClearStatusDrilldown}
                  className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  <RefreshCcw size={14} />
                  Limpar filtro específico
                </button>
              </div>
            ) : null}

            {activeFacetFilterLabel ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div>
                  Filtro contextual ativo: <b>{activeFacetFilterLabel}</b>
                </div>
                <button
                  type="button"
                  onClick={handleClearFacetFilter}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <RefreshCcw size={14} />
                  Limpar filtro contextual
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div>
                <b>{renderedRowsCount}</b> linha(s) visíveis de <b>{Number(result?.summary?.totalRows || 0)}</b> lida(s) na planilha.
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  {previewRowsCount === Number(result?.summary?.totalRows || 0)
                    ? "A listagem exibe todas as linhas lidas no preview atual."
                    : `O preview trouxe ${previewRowsCount} linha(s) para inspeção visual neste retorno.`}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                  Ordenação: {PREVIEW_SORT_COLUMNS.find((column) => column.key === sortKey)?.label || "Linha"} • {sortDirection === "asc" ? "crescente" : "decrescente"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                  Filtro salvo na sessão: {ROW_STATUS_FILTERS.find((item) => item.id === rowFilter)?.label || "Todas as linhas"}
                </span>
                {activeFacetFilterLabel ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                    Contexto: {activeFacetFilterLabel}
                  </span>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExpandAttentionRows}
                    disabled={!attentionRowsVisible.length}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold transition ${
                      attentionRowsVisible.length
                        ? "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                  >
                    <AlertTriangle size={14} />
                    Expandir só com atenção ({attentionRowsVisible.length})
                  </button>

                  <button
                    type="button"
                    onClick={handleCollapseAllRows}
                    disabled={!Object.keys(expandedRowKeys).length}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold transition ${
                      Object.keys(expandedRowKeys).length
                        ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                  >
                    <ChevronUp size={14} />
                    Recolher detalhes
                  </button>
                </div>
              </div>
            </div>

            {!!rowStatusCounters.length && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {rowStatusCounters.map((item) => (
                  <button
                    key={item.statusKey}
                    type="button"
                    onClick={() => handleToggleStatusDrilldown(item.filterTarget || item.statusKey)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${item.tone.details} ${item.active ? "ring-2 ring-violet-200" : "hover:-translate-y-0.5 hover:shadow-sm"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Status do lote</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{item.label}</div>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${item.tone.accent}`}>
                        {item.active ? "Filtrando" : item.ready ? "OK" : item.tone.icon}
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-bold text-slate-900">{item.value}</div>
                  </button>
                ))}
              </div>
            )}

            {filteredPreviewRows.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="max-h-[680px] overflow-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {PREVIEW_SORT_COLUMNS.map((column) => (
                          <th key={column.key} className="px-4 py-3">
                            <SortHeaderButton
                              label={column.label}
                              sortKey={column.key}
                              activeSortKey={sortKey}
                              sortDirection={sortDirection}
                              onClick={handleChangeSort}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPreviewRows.map((row) => {
                        const rowKey = buildPreviewRowKey(row);
                        const badge = categoryStatusToBadge(row?.categoryStatus);
                        const expanded = !!expandedRowKeys[rowKey];
                        const tone = getPreviewRowTone(row?.categoryStatus);
                        const copied = copiedRowKey === rowKey;

                        return (
                          <React.Fragment key={rowKey}>
                            <tr className={tone.row}>
                              <td className="px-4 py-4 align-top">
                                <div className="flex items-start gap-3">
                                  <div className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase ${tone.accent}`}>
                                    {tone.icon}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900">#{row?.rowIndex || "—"}</div>
                                    <div className="mt-1 text-xs text-slate-500">{row?.dataHoraAgendada || "Sem data agendada"}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="font-semibold text-slate-900">{row?.paciente || "Paciente não informado"}</div>
                                <div className="mt-1 text-xs text-slate-500">{row?.profissional || "Profissional não informado"}</div>
                                {row?.convenio ? (
                                  <div className="mt-2 text-xs text-slate-500">Convênio: {row.convenio}</div>
                                ) : null}
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="font-medium text-slate-800">{row?.especialidade || "Especialidade em branco"}</div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="font-medium text-slate-800">{row?.demanda || row?.tags || "Sem Demanda/Tags"}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {row?.demanda
                                    ? "Fonte principal: coluna Demanda"
                                    : row?.tags
                                      ? "Fallback usado: Tags"
                                      : "Nenhuma fonte informada na planilha"}
                                </div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="font-medium text-slate-800">{row?.demandName || "Não resolvida"}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {row?.demandSourceUsed === "excel"
                                    ? "Resolução pelo modo excel da Especialidade"
                                    : row?.demandSourceUsed === "system_default"
                                      ? "Resolução pela Demanda padrão"
                                      : "Origem de resolução não informada"}
                                </div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="font-medium text-slate-800">{row?.resolvedCid || "CID não resolvido"}</div>
                                <div className="mt-1 text-xs text-slate-500">{row?.categoryTitle || `Categoria ${selectedCategory} sem conteúdo`}</div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="flex flex-col items-start gap-2">
                                  <Badge status={badge.status} text={badge.text} />
                                  <div className="text-xs text-slate-500">{row?.categoryStatusLabel || "Sem detalhe adicional"}</div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRowExpanded(rowKey)}
                                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                        expanded
                                          ? "border-violet-200 bg-violet-50 text-violet-700"
                                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      {expanded ? "Ocultar detalhes" : "Ver detalhes"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCopyRowDetails(row)}
                                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                        copied
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      {copied ? <Check size={14} /> : <Copy size={14} />}
                                      {copied ? "Copiado" : "Copiar detalhes"}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>

                            {expanded ? (
                              <tr className={tone.row}>
                                <td colSpan={7} className="px-4 pb-4 pt-0">
                                  <div className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-2 xl:grid-cols-4 ${tone.details}`}>
                                    <div>
                                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Leitura original</div>
                                      <div className="mt-2 text-sm text-slate-700">Demanda: <b>{row?.demanda || "—"}</b></div>
                                      <div className="mt-1 text-sm text-slate-700">Tags: <b>{row?.tags || "—"}</b></div>
                                      <div className="mt-1 text-sm text-slate-700">Especialidade: <b>{row?.especialidade || "—"}</b></div>
                                    </div>

                                    <div>
                                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Resolução do sistema</div>
                                      <div className="mt-2 text-sm text-slate-700">Demanda resolvida: <b>{row?.demandName || "Não resolvida"}</b></div>
                                      <div className="mt-1 text-sm text-slate-700">Origem: <b>{row?.demandSourceUsed || "—"}</b></div>
                                      <div className="mt-1 text-sm text-slate-700">CID: <b>{row?.resolvedCid || "—"}</b></div>
                                      <div className="mt-1 text-sm text-slate-700">Categoria: <b>{row?.categoryTitle || `Categoria ${selectedCategory} sem conteúdo`}</b></div>
                                    </div>

                                    <div>
                                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Status da linha</div>
                                      <div className="mt-2">
                                        <Badge status={badge.status} text={badge.text} />
                                      </div>
                                      <div className="mt-2 text-sm text-slate-700">{row?.categoryStatusLabel || "Sem detalhe adicional"}</div>
                                      <div className="mt-2 text-xs text-slate-500">Use esta abertura para revisar a leitura exata antes de gerar o PDF.</div>
                                    </div>

                                    <div>
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Resumo operacional</div>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyRowDetails(row)}
                                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                            copied
                                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                          }`}
                                        >
                                          {copied ? <Check size={14} /> : <Copy size={14} />}
                                          {copied ? "Copiado" : "Copiar tudo"}
                                        </button>
                                      </div>
                                      <div className="mt-2 text-sm text-slate-700">Paciente: <b>{row?.paciente || "—"}</b></div>
                                      <div className="mt-1 text-sm text-slate-700">Profissional: <b>{row?.profissional || "—"}</b></div>
                                      <div className="mt-1 text-sm text-slate-700">Data/Hora: <b>{row?.dataHoraAgendada || "—"}</b></div>
                                      <div className="mt-1 text-sm text-slate-700">Convênio: <b>{row?.convenio || "—"}</b></div>

                                      <div className="mt-4">
                                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Atalhos de filtro desta linha</div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {[
                                            { key: "especialidade", label: "Especialidade", value: getFacetFilterValue(row, "especialidade") },
                                            { key: "profissional", label: "Profissional", value: getFacetFilterValue(row, "profissional") },
                                            { key: "demandName", label: "Demanda resolvida", value: getFacetFilterValue(row, "demandName") },
                                          ]
                                            .filter((item) => item.value)
                                            .map((item) => {
                                              const activeChip = facetFilter.key === item.key && facetFilter.value === item.value;
                                              return (
                                                <button
                                                  key={`${rowKey}-${item.key}-${item.value}`}
                                                  type="button"
                                                  onClick={() => handleToggleFacetFilter(item.key, item.value)}
                                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                    activeChip
                                                      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                  }`}
                                                >
                                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                    {item.label}
                                                  </span>
                                                  <span>{item.value}</span>
                                                </button>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                Nenhuma linha corresponde ao filtro atual. Ajuste a busca ou o filtro para voltar a listar o preview.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
