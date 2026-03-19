
"use client";

import { useMemo, useState } from "react";

import { adminFetch } from "../../../../services/adminApi";
import { REPORT_IMPORT_TEMPLATE } from "../../../../lib/shared/reportImportTemplate";
import { buildTemplateErrorState } from "../shared";

export function useReportImportFlow({ showToast, selectedTemplateId }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [templateError, setTemplateError] = useState(null);
  const [importSessionId, setImportSessionId] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(1);

  const previewColumns = useMemo(
    () => result?.template?.previewColumns || REPORT_IMPORT_TEMPLATE.previewColumns,
    [result]
  );

  const readyRows = Number(result?.matchSummary?.ready || 0);

  const clearFrozenPreview = () => {
    setResult(null);
    setTemplateError(null);
    setImportSessionId("");
    setExpiresAt(null);
  };

  const handleCategoryChange = (nextValue) => {
    setSelectedCategory(Number(nextValue) || 1);
    clearFrozenPreview();
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    clearFrozenPreview();
  };

  const handleResetImport = (inputElement = null) => {
    setFile(null);
    clearFrozenPreview();
    if (inputElement) {
      inputElement.value = "";
    }
  };

  const appendCommonFormData = (formData) => {
    formData.append("selectedCategory", String(selectedCategory));
    if (selectedTemplateId) formData.append("templateId", String(selectedTemplateId));
  };

  const handleSubmitImport = async (event) => {
    event?.preventDefault?.();

    if (!file) {
      showToast?.("Selecione um arquivo .xlsx antes de importar.", "error");
      return;
    }

    setBusy(true);
    clearFrozenPreview();

    try {
      const formData = new FormData();
      formData.append("file", file);
      appendCommonFormData(formData);

      const response = await adminFetch("/api/admin/report/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        if (data?.code === "invalid-template-headers") {
          setTemplateError(buildTemplateErrorState(data));
          showToast?.(data?.error || "A planilha não corresponde ao template esperado.", "error");
          return;
        }

        showToast?.(data?.error || "Falha ao analisar a planilha.", "error");
        return;
      }

      if (!String(data?.importSessionId || "").trim()) {
        showToast?.("A análise foi concluída, mas a sessão congelada do preview não foi criada.", "error");
        return;
      }

      setTemplateError(null);
      setResult(data);
      setImportSessionId(String(data.importSessionId || "").trim());
      setExpiresAt(data?.expiresAt || null);
      showToast?.(
        "Planilha analisada e preview congelado com a categoria e o modelo escolhidos para o lote.",
        "success"
      );
    } catch (error) {
      console.error(error);
      clearFrozenPreview();
      showToast?.("Erro ao enviar a planilha para análise.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!String(importSessionId || "").trim()) {
      showToast?.("Importe a planilha e gere um preview congelado antes de gerar o PDF.", "error");
      return;
    }

    if (!readyRows) {
      showToast?.("Nenhuma linha pronta para gerar PDF neste preview congelado.", "error");
      return;
    }

    setPdfBusy(true);
    try {
      const response = await adminFetch("/api/admin/report/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ importSessionId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        if (data?.code === "report-import-session-expired") {
          setImportSessionId("");
          setExpiresAt(null);
          showToast?.(data?.error || "A sessão de importação expirou. Importe a planilha novamente.", "error");
          return;
        }

        if (data?.code === "report-import-session-not-found" || data?.code === "report-import-session-forbidden") {
          setImportSessionId("");
          setExpiresAt(null);
          showToast?.(data?.error || "A sessão congelada do preview não está mais disponível. Importe novamente.", "error");
          return;
        }

        showToast?.(data?.error || "Falha ao gerar o PDF do lote.", "error");
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
      const fileName = fileNameMatch?.[1] || `relatorios-categoria-${selectedCategory}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      const readyRowsCount = Number(response.headers.get("X-Report-Ready-Rows") || 0);
      const skippedRows = Number(response.headers.get("X-Report-Skipped-Rows") || 0);
      showToast?.(
        skippedRows
          ? `PDF gerado com ${readyRowsCount} linha(s) pronta(s). ${skippedRows} linha(s) foram puladas.`
          : "PDF gerado com sucesso a partir do preview congelado.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao gerar o PDF do lote.", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  return {
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
    setResult,
    setTemplateError,
    setImportSessionId,
    setExpiresAt,
    handleCategoryChange,
    handleFileChange,
    handleResetImport,
    handleSubmitImport,
    handleGeneratePdf,
    clearFrozenPreview,
  };
}
