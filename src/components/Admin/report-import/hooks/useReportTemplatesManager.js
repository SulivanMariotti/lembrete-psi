
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { adminFetch } from "../../../../services/adminApi";
import {
  REPORT_TEMPLATE_LOGO_MAX_DATA_URL_LENGTH,
  createEmptyTemplateForm,
  findUnknownTemplateTokens,
  mapTemplateToForm,
} from "../../../../lib/shared/reportTemplates";
import { readLogoAsJpegDataUrl } from "../shared";

export function useReportTemplatesManager({ showToast }) {
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateForm, setTemplateForm] = useState(createEmptyTemplateForm());
  const [activeTemplateArea, setActiveTemplateArea] = useState("bodyTemplate");

  const headerTemplateRef = useRef(null);
  const bodyTemplateRef = useRef(null);
  const footerTemplateRef = useRef(null);

  const selectedTemplate = useMemo(
    () => templates.find((item) => String(item.id) === String(selectedTemplateId)) || null,
    [templates, selectedTemplateId]
  );

  const templateUnknownTokens = useMemo(() => {
    return {
      header: findUnknownTemplateTokens(templateForm?.headerTemplate || ""),
      body: findUnknownTemplateTokens(templateForm?.bodyTemplate || ""),
      footer: findUnknownTemplateTokens(templateForm?.footerTemplate || ""),
    };
  }, [templateForm?.headerTemplate, templateForm?.bodyTemplate, templateForm?.footerTemplate]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const response = await adminFetch("/api/admin/report/templates");
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao carregar os Modelos de Relatório.", "error");
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setTemplates(items);

      setSelectedTemplateId((current) => {
        if (current && items.some((item) => String(item.id) === String(current))) {
          return current;
        }
        return String(items.find((item) => item?.isActive)?.id || items[0]?.id || "");
      });
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao carregar os Modelos de Relatório.", "error");
    } finally {
      setTemplatesLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const getTemplateAreaRef = useCallback((field) => {
    const refs = {
      headerTemplate: headerTemplateRef,
      bodyTemplate: bodyTemplateRef,
      footerTemplate: footerTemplateRef,
    };
    return refs[field]?.current || null;
  }, []);

  const handleTemplateFieldChange = (field, value) => {
    setTemplateForm((current) => ({ ...current, [field]: value }));
  };

  const handleTemplateTextChange = (field, value) => {
    setTemplateForm((current) => ({ ...current, [field]: value }));
  };

  const handleTemplateLogoUpload = async (event) => {
    const nextFile = event.target.files?.[0] || null;
    event.target.value = "";

    if (!nextFile) return;

    try {
      const dataUrl = await readLogoAsJpegDataUrl(nextFile);
      if (dataUrl.length > REPORT_TEMPLATE_LOGO_MAX_DATA_URL_LENGTH) {
        showToast?.("A logo ficou grande demais. Tente uma imagem menor ou mais simples.", "error");
        return;
      }

      setTemplateForm((current) => ({ ...current, headerLogoDataUrl: dataUrl }));
      showToast?.("Logo preparada e vinculada ao cabeçalho do modelo.", "success");
    } catch (error) {
      console.error(error);
      showToast?.(error?.message || "Não foi possível carregar a logo.", "error");
    }
  };

  const handleRemoveTemplateLogo = () => {
    setTemplateForm((current) => ({ ...current, headerLogoDataUrl: "" }));
  };

  const handleCancelEditTemplate = () => {
    setEditingTemplateId("");
    setTemplateForm(createEmptyTemplateForm());
    setActiveTemplateArea("bodyTemplate");
  };

  const handleEditTemplate = (item) => {
    setEditingTemplateId(String(item?.id || ""));
    setTemplateForm(mapTemplateToForm(item));
    setActiveTemplateArea("bodyTemplate");
  };

  const updateTemplateFieldSelection = useCallback(
    (field, transformer) => {
      const ref = getTemplateAreaRef(field);
      const currentValue = String(templateForm?.[field] || "");
      const start = ref && typeof ref.selectionStart === "number" ? ref.selectionStart : currentValue.length;
      const end = ref && typeof ref.selectionEnd === "number" ? ref.selectionEnd : currentValue.length;

      const result = transformer(currentValue, start, end);
      if (!result || typeof result.value !== "string") return;

      handleTemplateTextChange(field, result.value);

      if (!ref) return;
      window.requestAnimationFrame(() => {
        ref.focus();
        if (typeof result.selectionStart === "number" && typeof result.selectionEnd === "number") {
          ref.setSelectionRange(result.selectionStart, result.selectionEnd);
        }
      });
    },
    [getTemplateAreaRef, templateForm]
  );

  const handleInsertTemplateTag = (tag, preferredField = "") => {
    const field = preferredField || activeTemplateArea || "bodyTemplate";
    updateTemplateFieldSelection(field, (currentValue, start, end) => {
      const nextValue = `${currentValue.slice(0, start)}${tag}${currentValue.slice(end)}`;
      const nextCursor = start + tag.length;
      return {
        value: nextValue,
        selectionStart: nextCursor,
        selectionEnd: nextCursor,
      };
    });
  };

  const handleTemplateFormattingAction = useCallback(
    (field, action) => {
      if (!field || !action) return;

      const placeholderMap = {
        title: "TÍTULO",
        subtitle: "SUBTÍTULO",
      };

      if (action.type === "insert" || action.type === "lineSnippet") {
        const snippet = String(action.snippet || "");
        updateTemplateFieldSelection(field, (currentValue, start, end) => {
          const prefix = start > 0 && currentValue[start - 1] !== "\n" ? "\n" : "";
          const suffix = end < currentValue.length && currentValue[end] !== "\n" ? "\n" : "";
          const insertion = `${prefix}${snippet}${suffix}`;
          const nextValue = `${currentValue.slice(0, start)}${insertion}${currentValue.slice(end)}`;
          const nextCursor = start + insertion.length;
          return {
            value: nextValue,
            selectionStart: nextCursor,
            selectionEnd: nextCursor,
          };
        });
        return;
      }

      if (action.type === "wrap") {
        updateTemplateFieldSelection(field, (currentValue, start, end) => {
          const selectedText = currentValue.slice(start, end) || placeholderMap[action.key] || "texto";
          const openTag = String(action.open || "");
          const closeTag = String(action.close || "");
          const wrapped = `${openTag}${selectedText}${closeTag}`;
          return {
            value: `${currentValue.slice(0, start)}${wrapped}${currentValue.slice(end)}`,
            selectionStart: start + openTag.length,
            selectionEnd: start + openTag.length + selectedText.length,
          };
        });
        return;
      }

      if (action.type === "lineWrap") {
        updateTemplateFieldSelection(field, (currentValue, start, end) => {
          const lineStart = currentValue.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
          const lineEndCandidate = currentValue.indexOf("\n", end);
          const lineEnd = lineEndCandidate === -1 ? currentValue.length : lineEndCandidate;
          const selectedText = currentValue.slice(lineStart, lineEnd) || "texto";
          const wrapped = selectedText
            .split("\n")
            .map((line) => {
              if (!line.trim()) return line;
              return `${action.open}${line}${action.close}`;
            })
            .join("\n");

          return {
            value: `${currentValue.slice(0, lineStart)}${wrapped}${currentValue.slice(lineEnd)}`,
            selectionStart: lineStart,
            selectionEnd: lineStart + wrapped.length,
          };
        });
      }
    },
    [updateTemplateFieldSelection]
  );

  const handleTemplateSubmit = async (event) => {
    event?.preventDefault?.();

    if (!String(templateForm.name || "").trim()) {
      showToast?.("Informe o nome do Modelo de Relatório.", "error");
      return;
    }

    setTemplateBusy(true);
    try {
      const payload = {
        name: templateForm.name,
        description: templateForm.description,
        isActive: Boolean(templateForm.isActive),
        editorMode: "tagTemplate",
        headerLogoDataUrl: templateForm.headerLogoDataUrl || "",
        headerTemplate: templateForm.headerTemplate,
        bodyTemplate: templateForm.bodyTemplate,
        footerTemplate: templateForm.footerTemplate,
      };

      const url = editingTemplateId
        ? `/api/admin/report/templates/${editingTemplateId}`
        : "/api/admin/report/templates";
      const method = editingTemplateId ? "PATCH" : "POST";

      const response = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao salvar o Modelo de Relatório.", "error");
        return;
      }

      showToast?.(
        editingTemplateId ? "Modelo atualizado com sucesso." : "Modelo cadastrado com sucesso.",
        "success"
      );

      await loadTemplates();
      handleCancelEditTemplate();
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao salvar o Modelo de Relatório.", "error");
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleToggleTemplateActive = async (item) => {
    if (!item?.id) return;

    setTemplateBusy(true);
    try {
      const response = await adminFetch(`/api/admin/report/templates/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao ativar o modelo.", "error");
        return;
      }

      await loadTemplates();
      setSelectedTemplateId(String(item.id));
      showToast?.("Modelo ativado para uso no lote.", "success");
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao ativar o modelo.", "error");
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleDeleteTemplate = async (item) => {
    if (!item?.id) return;
    const confirmed = window.confirm(`Excluir o Modelo "${item.name}"?`);
    if (!confirmed) return;

    setTemplateBusy(true);
    try {
      const response = await adminFetch(`/api/admin/report/templates/${item.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao excluir o modelo.", "error");
        return;
      }

      if (String(editingTemplateId) === String(item.id)) {
        handleCancelEditTemplate();
      }

      await loadTemplates();
      setSelectedTemplateId((current) => (String(current) === String(item.id) ? "" : current));
      showToast?.("Modelo excluído com sucesso.", "success");
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao excluir o modelo.", "error");
    } finally {
      setTemplateBusy(false);
    }
  };

  return {
    templates,
    templatesLoading,
    templateBusy,
    editingTemplateId,
    selectedTemplateId,
    selectedTemplate,
    templateForm,
    activeTemplateArea,
    headerTemplateRef,
    bodyTemplateRef,
    footerTemplateRef,
    templateUnknownTokens,
    setSelectedTemplateId,
    setActiveTemplateArea,
    handleTemplateFieldChange,
    handleTemplateTextChange,
    handleTemplateLogoUpload,
    handleRemoveTemplateLogo,
    handleCancelEditTemplate,
    handleEditTemplate,
    handleInsertTemplateTag,
    handleTemplateFormattingAction,
    handleTemplateSubmit,
    handleToggleTemplateActive,
    handleDeleteTemplate,
  };
}
