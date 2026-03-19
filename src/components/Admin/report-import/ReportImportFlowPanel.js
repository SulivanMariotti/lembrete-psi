
"use client";

import React, { useMemo, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  RefreshCcw,
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

export default function ReportImportFlowPanel({
  importFlow,
  templatesManager,
  specialtiesCount = 0,
}) {
  const fileInputRef = useRef(null);
  const {
    file,
    busy,
    pdfBusy,
    result,
    templateError,
    importSessionId,
    expiresAt,
    selectedCategory,
    previewColumns,
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

  const invalidRows = result ? Math.max(0, Number(result?.summary?.totalRows || 0) - readyRows) : 0;

  const mismatchSummaryItems = useMemo(
    () =>
      [
        { key: "missingSpecialty", label: "Especialidade em branco", value: Number(result?.matchSummary?.missingSpecialty || 0) },
        { key: "specialtyNotFound", label: "Especialidade não encontrada", value: Number(result?.matchSummary?.specialtyNotFound || 0) },
        { key: "inactiveSpecialty", label: "Especialidade inativa", value: Number(result?.matchSummary?.inactiveSpecialty || 0) },
        { key: "psychologyMissingDemand", label: "Psicologia sem Demanda", value: Number(result?.matchSummary?.psychologyMissingDemand || 0) },
        { key: "psychologyDemandNotFound", label: "Demanda da Psicologia não encontrada", value: Number(result?.matchSummary?.psychologyDemandNotFound || 0) },
        { key: "specialtyWithoutDefaultDemand", label: "Sem Demanda padrão", value: Number(result?.matchSummary?.specialtyWithoutDefaultDemand || 0) },
        { key: "inactiveDemand", label: "Demanda inativa", value: Number(result?.matchSummary?.inactiveDemand || 0) },
        { key: "missingCategory", label: "Categoria vazia", value: Number(result?.matchSummary?.missingCategory || 0) },
      ].filter((item) => item.value > 0),
    [result]
  );

  const handleTemplateSelectChange = (nextValue) => {
    setSelectedTemplateId(nextValue);
    importFlow.clearFrozenPreview();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
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
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-violet-700 hover:file:bg-violet-100"
                  onChange={handleFileChange}
                />
                <div className="mt-2 text-xs text-slate-500">
                  Estrutura esperada: {REPORT_IMPORT_TEMPLATE.sourceLabel} • {REPORT_IMPORT_TEMPLATE.requiredHeaders.length} colunas.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" icon={Upload} disabled={busy || !file}>
                  {busy ? "Analisando..." : "Analisar planilha"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  icon={RefreshCcw}
                  onClick={() => handleResetImport(fileInputRef.current)}
                >
                  Limpar preview
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Resumo operacional do lote">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase text-slate-500">Especialidades</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{specialtiesCount}</div>
                <div className="mt-1 text-sm text-slate-500">Cadastradas para validar a coluna Especialidade.</div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-xs font-bold uppercase text-emerald-700">Linhas prontas</div>
                <div className="mt-2 text-3xl font-bold text-emerald-900">{readyRows}</div>
                <div className="mt-1 text-sm text-emerald-700">Válidas para o PDF após validar Especialidade e Demanda.</div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="text-xs font-bold uppercase text-amber-700">Linhas com atenção</div>
                <div className="mt-2 text-3xl font-bold text-amber-900">{invalidRows}</div>
                <div className="mt-1 text-sm text-amber-700">Especialidade inválida, Demanda inconsistente, categoria vazia ou cadastro inativo.</div>
              </div>
            </div>

            {result?.selectedTemplate ? (
              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                Modelo aplicado na análise: <b>{result.selectedTemplate.name}</b>
              </div>
            ) : null}

            {!!mismatchSummaryItems.length && (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {mismatchSummaryItems.map((item) => (
                  <div key={item.key} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase text-amber-700">{item.label}</div>
                    <div className="mt-2 text-2xl font-bold text-amber-900">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {templateError && (
            <Card title="Template inválido">
              <div className="space-y-4">
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {templateError.error}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase text-slate-500">Colunas esperadas</div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">{templateError.expectedCount || "—"}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase text-slate-500">Colunas recebidas</div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">{templateError.receivedCount || "—"}</div>
                  </div>
                </div>

                {!!templateError.missingHeaders?.length && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase text-rose-700">Cabeçalhos faltantes</div>
                    <div className="mt-2 text-sm text-rose-800">{templateError.missingHeaders.join(" • ")}</div>
                  </div>
                )}

                {!!templateError.extraHeaders?.length && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <div className="text-xs font-bold uppercase text-amber-700">Cabeçalhos extras</div>
                    <div className="mt-2 text-sm text-amber-800">{templateError.extraHeaders.join(" • ")}</div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Operação do preview congelado">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Arquivo pronto para análise
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {file ? (
                    <>
                      <div><b>{file.name}</b></div>
                      <div className="mt-1 text-xs text-slate-500">{formatBytes(file.size)}</div>
                    </>
                  ) : (
                    "Selecione a planilha do lote para iniciar o preview congelado."
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-4">
                <div className="text-sm font-semibold text-violet-900">Sessão atual</div>
                <div className="mt-2 text-sm text-violet-800">
                  {importSessionId ? (
                    <>
                      <div>Sessão: <b>{String(importSessionId).slice(0, 8)}</b></div>
                      <div className="mt-1">Expira às <b>{formatSessionExpiry(expiresAt)}</b></div>
                    </>
                  ) : (
                    "A sessão congelada será criada após a análise da planilha."
                  )}
                </div>
              </div>

              <Button
                type="button"
                icon={FileDown}
                disabled={pdfBusy || !importSessionId || !readyRows}
                onClick={handleGeneratePdf}
              >
                {pdfBusy ? "Gerando PDF..." : "Gerar PDF do lote"}
              </Button>

              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                Categoria escolhida para o lote: <b>Categoria {selectedCategory}</b>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    Em <b>Psicologia</b>, a Demanda vem da coluna <b>Demanda</b> com fallback em <b>Tags</b>.
                    Em <b>Nutrição</b> e <b>Fonoaudiologia</b>, a Demanda usada vem do sistema.
                    <b> CID</b> e <b>Categoria</b> sempre vêm do cadastro da Demanda.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {result && (
        <Card title="Preview da validação">
          <div className="space-y-4">
            {importSessionId && (
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                <div className="font-semibold">Preview congelado</div>
                <div className="mt-1">
                  Sessão: <b>{String(importSessionId).slice(0, 8)}</b>
                </div>
                <div className="mt-1">
                  Válido até: <b>{formatSessionExpiry(expiresAt)}</b>
                </div>
                <div className="mt-2 text-violet-700">O PDF será gerado com base neste preview congelado.</div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase text-slate-500">Linhas totais</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{result?.summary?.totalRows || 0}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase text-slate-500">Profissionais</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{result?.summary?.professionals || 0}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase text-slate-500">Aba lida</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{result?.workbook?.sheetName || "—"}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase text-slate-500">Importado em</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {result?.importedAt ? new Date(result.importedAt).toLocaleString("pt-BR") : "—"}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    {previewColumns.map((column) => (
                      <th key={column} className="px-3 py-2 font-semibold">
                        {column}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold">Especialidade</th>
                    <th className="px-3 py-2 font-semibold">Demanda usada</th>
                    <th className="px-3 py-2 font-semibold">Origem da Demanda</th>
                    <th className="px-3 py-2 font-semibold">CID resolvido</th>
                    <th className="px-3 py-2 font-semibold">Categoria aplicada</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(result?.previewRows || []).map((row) => {
                    const badge = categoryStatusToBadge(row?.categoryStatus);
                    return (
                      <tr key={`${row.rowIndex}-${row.tags}-${row.paciente}`} className="align-top border-b border-slate-50">
                        {previewColumns.map((column) => (
                          <td key={`${row.rowIndex}-${column}`} className="px-3 py-3 text-slate-700">
                            {row?.sourceRow?.[column] || "—"}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-slate-700">{row?.specialtyName || row?.especialidade || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{row?.demandName || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">
                          {row?.demandSourceUsed === "system_default"
                            ? "Sistema (Demanda padrão)"
                            : row?.demandSourceUsed === "excel"
                              ? "Arquivo (Demanda/Tags)"
                              : "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-700">{row?.resolvedCid || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{row?.categoryTitle || `Categoria ${selectedCategory}`}</td>
                        <td className="px-3 py-3">
                          <Badge status={badge.status} text={badge.text} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!!result?.assumptions?.length && (
              <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {result.assumptions.map((assumption, index) => (
                  <div key={`${index}-${assumption}`}>• {assumption}</div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
