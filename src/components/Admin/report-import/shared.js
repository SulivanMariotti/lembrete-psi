
"use client";

import React, { useEffect, useMemo, useState } from "react";

import { Button } from "../../DesignSystem";
import { REPORT_SPECIALTY_DEMAND_SOURCE_MODES } from "../../../lib/shared/reportSpecialties";
import { countFilledDemandCategories } from "../../../lib/shared/reportDemands";
import {
  REPORT_TEMPLATE_FORMATTING_ACTIONS,
  buildTemplateRenderBlocks,
  getAllTemplateTags,
} from "../../../lib/shared/reportTemplates";

export function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatSessionExpiry(expiresAt) {
  if (!expiresAt) return "—";
  const value =
    typeof expiresAt === "number"
      ? expiresAt
      : typeof expiresAt === "string"
        ? new Date(expiresAt).getTime()
        : Number(expiresAt);
  if (!Number.isFinite(value)) return "—";
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildTemplateErrorState(data = {}) {
  const validation = data?.validation || {};
  return {
    code: String(data?.code || "invalid-template-headers"),
    error: String(data?.error || "A planilha não corresponde ao template esperado."),
    validation,
    missingHeaders: Array.isArray(validation?.missingHeaders) ? validation.missingHeaders : [],
    extraHeaders: Array.isArray(validation?.extraHeaders) ? validation.extraHeaders : [],
    expectedCount: Number(validation?.expectedCount || 0),
    receivedCount: Number(validation?.receivedCount || 0),
  };
}

export function formatDateTime(value) {
  const numeric = Number(value || 0);
  if (!numeric) return "—";
  try {
    return new Date(numeric).toLocaleString("pt-BR");
  } catch (_) {
    return "—";
  }
}

export function categoryStatusToBadge(status) {
  if (status === "ready") return { status: "confirmed", text: "Pronto" };
  if (status === "missing-specialty") return { status: "missing", text: "Especialidade em branco" };
  if (status === "specialty-not-found") return { status: "missing", text: "Especialidade não encontrada" };
  if (status === "inactive-specialty") return { status: "pending", text: "Especialidade inativa" };
  if (status === "psychology-missing-demand") return { status: "missing", text: "Psicologia sem Demanda" };
  if (status === "psychology-demand-not-found") return { status: "missing", text: "Demanda da Psicologia não encontrada" };
  if (status === "specialty-without-default-demand") return { status: "missing", text: "Sem Demanda padrão" };
  if (status === "inactive-demand") return { status: "pending", text: "Demanda inativa" };
  if (status === "missing-category") return { status: "missing", text: "Categoria vazia" };
  return { status: "pending", text: "Pendente" };
}

export function buildDemandPreviewLabel(item) {
  const filled = countFilledDemandCategories(item);
  const suffix = filled === 1 ? "categoria preenchida" : "categorias preenchidas";
  const cidParts = [];
  if (String(item?.cidInf || "").trim()) cidParts.push("CID Inf");
  if (String(item?.cidAdult || "").trim()) cidParts.push("CID Adult");
  const cidLabel = cidParts.length ? ` • ${cidParts.join(" + ")}` : " • sem CID";
  return `${filled}/5 ${suffix}${cidLabel}`;
}

export function specialtyModeToLabel(mode) {
  if (mode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT) {
    return "Demanda do sistema";
  }
  return "Demanda do arquivo";
}

export function specialtyModeToHint(mode) {
  if (mode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT) {
    return "Nutrição e Fonoaudiologia podem usar Demanda padrão do sistema e deixar a Demanda do arquivo vazia.";
  }
  return "A Especialidade espera a Demanda no arquivo. Psicologia segue essa regra.";
}

export function readLogoAsJpegDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Arquivo de logo não informado."));
      return;
    }

    if (typeof window === "undefined") {
      reject(new Error("Upload de logo disponível apenas no navegador."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
      image.onload = () => {
        const maxWidth = 520;
        const maxHeight = 180;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Não foi possível preparar a logo para o relatório."));
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve(dataUrl);
      };

      image.src = String(reader.result || "");
    };

    reader.readAsDataURL(file);
  });
}

export function TemplateTagToolbar({ onInsert }) {
  const groups = useMemo(() => getAllTemplateTags(), []);
  const [selectedGroupKey, setSelectedGroupKey] = useState(groups[0]?.key || "spreadsheet");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedGroupKey) || groups[0] || null,
    [groups, selectedGroupKey]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = String(searchTerm || "").trim().toLowerCase();
    const items = Array.isArray(selectedGroup?.items) ? selectedGroup.items : [];
    if (!normalizedQuery) return items;

    return items.filter((item) => {
      const haystack = `${item?.label || ""} ${item?.token || ""} ${item?.tag || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [searchTerm, selectedGroup]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedTag("");
      return;
    }

    if (selectedTag && filteredItems.some((item) => item.tag === selectedTag)) {
      return;
    }

    setSelectedTag(filteredItems[0].tag);
  }, [filteredItems, selectedTag]);

  const handleInsert = () => {
    if (!selectedTag) return;
    onInsert(selectedTag);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Origem do campo</span>
          <select
            value={selectedGroupKey}
            onChange={(event) => {
              setSelectedGroupKey(event.target.value);
              setSearchTerm("");
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400"
          >
            {groups.map((group) => (
              <option key={group.key} value={group.key}>
                {group.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Buscar campo</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Digite parte do nome do campo ou da TAG"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400"
          />
        </label>
      </div>

      <label className="space-y-1.5 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">Campo disponível</span>
        <select
          value={selectedTag}
          onChange={(event) => setSelectedTag(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400"
        >
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <option key={`${selectedGroup?.key || "group"}-${item.token}`} value={item.tag}>
                {item.label} — {item.tag}
              </option>
            ))
          ) : (
            <option value="">Nenhum campo encontrado</option>
          )}
        </select>
      </label>

      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        TAG selecionada:{" "}
        <span className="font-mono font-semibold text-violet-700">{selectedTag || "—"}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleInsert} disabled={!selectedTag}>
          Inserir no texto
        </Button>
        <div className="text-xs text-slate-500">
          Escolha a origem, procure o campo e insira a TAG no ponto do cursor.
        </div>
      </div>
    </div>
  );
}

export function TemplateFormattingToolbar({ onAction }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      {REPORT_TEMPLATE_FORMATTING_ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={() => onAction(action)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function TemplateBlocksPreview({ blocks, emptyText = "Sem conteúdo." }) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return <div className="text-sm text-slate-400">{emptyText}</div>;
  }

  return (
    <div className="space-y-1 text-slate-800">
      {blocks.map((block) => {
        if (block?.type === "blank") {
          return <div key={block.key} className="h-3" />;
        }

        if (block?.type === "rule") {
          return <div key={block.key} className="my-2 border-t border-slate-300" />;
        }

        return (
          <div
            key={block.key}
            className="whitespace-pre-wrap break-words"
            style={{ textAlign: block?.align || "left" }}
          >
            {(block?.segments || []).map((segment, index) => (
              <span
                key={`${block.key}-${index}`}
                style={{
                  fontWeight: segment?.bold ? 700 : 400,
                  fontStyle: segment?.italic ? "italic" : "normal",
                  textDecoration: segment?.underline ? "underline" : "none",
                  fontSize: `${Math.max(8, Math.min(22, Number(segment?.fontSize || block?.fontSize || 11)))}px`,
                  lineHeight: 1.45,
                }}
              >
                {segment?.text}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function buildPreviewRecord(sampleRow, selectedCategory = 1, templateName = "Modelo em edição") {
  const row = sampleRow || {};
  return {
    paciente: row?.paciente || "Paciente Exemplo",
    profissional: row?.profissional || "Profissional Exemplo",
    dataHoraAgendada: row?.dataHoraAgendada || "01/01/2026 08:00",
    dataHoraCriada: row?.dataHoraCriada || "31/12/2025 18:00",
    procedimento: row?.procedimento || "Procedimento Exemplo",
    convenio: row?.convenio || "Convênio Exemplo",
    plano: row?.plano || "Plano Exemplo",
    status: row?.status || "Agendado",
    statusSecundario: row?.statusSecundario || "",
    celular: row?.celular || "(11) 99999-0000",
    telefone: row?.telefone || "(11) 3333-0000",
    cidade: row?.cidade || "São Paulo",
    local: row?.local || "Unidade Principal",
    unidade: row?.unidade || "São Miguel",
    origemAgendamento: row?.origemAgendamento || "Amplimed",
    tipoAtendimento: row?.tipoAtendimento || "Consulta",
    valor: row?.valor || "0,00",
    recebido: row?.recebido || "Não",
    observacao: row?.observacao || "Observação de exemplo.",
    motivoBloqueio: row?.motivoBloqueio || "",
    motivoCancelamento: row?.motivoCancelamento || "",
    nomeAgendou: row?.nomeAgendou || "Equipe",
    tags: row?.tags || "Demanda Exemplo",
    codigoPaciente: row?.codigoPaciente || "00001",
    cpf: row?.cpf || "000.000.000-00",
    dataNascimento: row?.dataNascimento || "01/01/1990",
    entradaPaciente: row?.entradaPaciente || "",
    saidaPaciente: row?.saidaPaciente || "",
    entradaProfissional: row?.entradaProfissional || "",
    saidaProfissional: row?.saidaProfissional || "",
    sourceRow: row?.sourceRow || {},
    demandName: row?.demandName || "Demanda Exemplo",
    demandDescription: row?.demandDescription || "Descrição geral da demanda.",
    demandCidInf: row?.demandCidInf || "F90",
    demandCidAdult: row?.demandCidAdult || "F41",
    resolvedCid: row?.resolvedCid || row?.demandCidAdult || "F41",
    selectedCategory,
    categoryTitle: row?.categoryTitle || `Categoria ${selectedCategory}`,
    categoryContent:
      row?.categoryContent ||
      `Conteúdo de exemplo da categoria ${selectedCategory}. Você pode combinar texto livre, alinhamento, tamanhos e TAGS automáticas.`,
    _templateName: templateName,
  };
}

export function TemplateRenderedPreview({ templateForm, previewRecord, selectedCategory }) {
  const context = {
    selectedCategory,
    generatedAt: new Date(),
    templateName: templateForm?.name || previewRecord?._templateName || "Modelo em edição",
    recordIndex: 0,
    recordCount: 1,
  };

  const headerBlocks = buildTemplateRenderBlocks(templateForm?.headerTemplate || "", previewRecord, context, {
    fontSize: 11,
    align: "left",
  });
  const bodyBlocks = buildTemplateRenderBlocks(templateForm?.bodyTemplate || "", previewRecord, context, {
    fontSize: 10.5,
    align: "left",
  });
  const footerBlocks = buildTemplateRenderBlocks(templateForm?.footerTemplate || "", previewRecord, context, {
    fontSize: 8.8,
    align: "center",
  });

  const renderMiniReport = (key) => (
    <div
      key={key}
      className="flex h-[430px] flex-col rounded-[20px] border border-slate-300 bg-white px-4 py-4 shadow-sm"
    >
      <div className="border-b border-slate-200 pb-3">
        {templateForm?.headerLogoDataUrl ? (
          <div className="mb-3">
            <img
              src={templateForm.headerLogoDataUrl}
              alt="Logo do relatório"
              className="max-h-14 w-auto max-w-[180px] object-contain"
            />
          </div>
        ) : null}

        <TemplateBlocksPreview blocks={headerBlocks} emptyText="Cabeçalho vazio." />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden py-4">
        <TemplateBlocksPreview blocks={bodyBlocks} emptyText="Corpo vazio." />
      </div>

      <div className="border-t border-slate-200 pt-3">
        <TemplateBlocksPreview blocks={footerBlocks} emptyText="Rodapé vazio." />
      </div>
    </div>
  );

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-xs font-bold uppercase text-slate-500">Preview da página</div>
        <div className="mt-1 text-sm text-slate-500">
          O PDF sai em A4 paisagem, com 2 relatórios lado a lado. O preview agora mostra o cabeçalho sem a caixa lateral e com suporte à logo.
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="rounded-[28px] border border-slate-200 bg-slate-100 p-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {[1, 2].map((slotIndex) => renderMiniReport(slotIndex))}
          </div>
        </div>
      </div>
    </div>
  );
}
