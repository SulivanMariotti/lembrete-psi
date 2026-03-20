"use client";

import React, { useMemo, useState } from "react";
import {
  Eye,
  FileText,
  Layers3,
  PencilLine,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge, Button, Card } from "../../DesignSystem";
import {
  buildTemplateSummary,
  extractTemplateTokens,
} from "../../../lib/shared/reportTemplates";
import {
  TemplateFormattingToolbar,
  TemplateRenderedPreview,
  TemplateTagToolbar,
  buildPreviewRecord,
} from "./shared";

const TEMPLATE_FILTER_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Ativos" },
  { key: "selected", label: "Selecionado no lote" },
  { key: "editing", label: "Em edição" },
];

const TEMPLATE_SECTIONS = [
  {
    key: "headerTemplate",
    title: "Cabeçalho fixo",
    shortTitle: "Cabeçalho",
    description: "Use título, logo, alinhamento e informações fixas do documento.",
    placeholder:
      "[align=left][size=14][b]CLÍNICA EXEMPLO[/b][/size][/align]\nRua Exemplo, 123\n[align=left][size=13][b]RELATÓRIO CLÍNICO[/b][/size][/align]",
  },
  {
    key: "bodyTemplate",
    title: "Corpo do relatório",
    shortTitle: "Corpo",
    description: "Defina a narrativa principal, a ordem dos blocos e o conteúdo dinâmico.",
    placeholder:
      "[align=left][size=14][b]Ao convênio {{convenio}},[/b][/size][/align]\n\n[align=justify]O(a) paciente [b]{{paciente}}[/b] encontra-se em acompanhamento com [b]{{profissional}}[/b].[/align]\n\n[align=justify]{{categoria_conteudo}}[/align]",
  },
  {
    key: "footerTemplate",
    title: "Rodapé fixo",
    shortTitle: "Rodapé",
    description: "Reserve para local/data, assinatura, conselho e observações finais.",
    placeholder:
      "[align=center]São Paulo, {{data_geracao_extenso}}[/align]\n\n[align=center][b]{{profissional}}[/b][/align]",
  },
];

function getFilledLineCount(value = "") {
  return String(value || "")
    .split(/\r?\n/g)
    .filter((line) => String(line || "").trim())
    .length;
}

function getSectionStats(value = "") {
  const safeValue = String(value || "");
  const tokens = extractTemplateTokens(safeValue);
  return {
    isEmpty: !safeValue.trim(),
    charCount: safeValue.trim().length,
    lineCount: getFilledLineCount(safeValue),
    tokenCount: tokens.length,
  };
}

function MetricPill({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone] || tones.slate}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}

function TemplateSectionCard({
  section,
  value,
  activeTemplateArea,
  setActiveTemplateArea,
  handleTemplateTextChange,
  handleTemplateFormattingAction,
  headerTemplateRef,
  bodyTemplateRef,
  footerTemplateRef,
  handleTemplateLogoUpload,
  handleRemoveTemplateLogo,
  headerLogoDataUrl,
}) {
  const isActive = activeTemplateArea === section.key;
  const stats = getSectionStats(value);

  const refMap = {
    headerTemplate: headerTemplateRef,
    bodyTemplate: bodyTemplateRef,
    footerTemplate: footerTemplateRef,
  };

  return (
    <div
      className={`rounded-3xl border p-4 transition-all md:p-5 ${
        isActive
          ? "border-violet-200 bg-violet-50/40 shadow-sm shadow-violet-100"
          : "border-slate-100 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">{section.title}</div>
            {isActive ? <Badge status="confirmed" text="Área ativa" /> : null}
            {!stats.isEmpty ? <Badge status="pending" text="Com conteúdo" /> : null}
          </div>
          <div className="max-w-2xl text-sm leading-relaxed text-slate-500">{section.description}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[360px]">
          <MetricPill label="Linhas" value={stats.lineCount} />
          <MetricPill label="TAGS" value={stats.tokenCount} tone="violet" />
          <MetricPill label="Caracteres" value={stats.charCount} />
          <Button
            type="button"
            variant={isActive ? "primary" : "secondary"}
            className="h-full min-h-[58px] px-3 py-2"
            onClick={() => setActiveTemplateArea(section.key)}
          >
            Inserir TAG aqui
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {section.key === "headerTemplate" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Logo da empresa</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">
                  A imagem é convertida para JPG automaticamente e entra acima do cabeçalho no preview e no PDF.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex">
                  <input type="file" accept="image/*" className="hidden" onChange={handleTemplateLogoUpload} />
                  <span className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700">
                    Carregar logo
                  </span>
                </label>

                {headerLogoDataUrl ? (
                  <Button type="button" variant="secondary" onClick={handleRemoveTemplateLogo} icon={Trash2}>
                    Remover logo
                  </Button>
                ) : null}
              </div>
            </div>

            {headerLogoDataUrl ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4">
                <img
                  src={headerLogoDataUrl}
                  alt="Logo do modelo"
                  className="max-h-16 w-auto max-w-[220px] object-contain"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <TemplateFormattingToolbar onAction={(action) => handleTemplateFormattingAction(section.key, action)} />

        <textarea
          ref={refMap[section.key]}
          className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm text-slate-700 outline-none transition-colors ${
            section.key === "bodyTemplate" ? "min-h-[380px]" : "min-h-[210px]"
          } ${
            isActive
              ? "border-violet-300 bg-white shadow-sm shadow-violet-100 focus:border-violet-400"
              : "border-slate-200 bg-white focus:border-violet-300"
          }`}
          value={value}
          onFocus={() => setActiveTemplateArea(section.key)}
          onClick={() => setActiveTemplateArea(section.key)}
          onChange={(event) => handleTemplateTextChange(section.key, event.target.value)}
          placeholder={section.placeholder}
        />
      </div>
    </div>
  );
}

export default function ReportTemplatesPanel({
  templatesManager,
  selectedCategory,
  previewRows,
}) {
  const {
    templates,
    templatesLoading,
    templateBusy,
    editingTemplateId,
    selectedTemplateId,
    templateForm,
    activeTemplateArea,
    headerTemplateRef,
    bodyTemplateRef,
    footerTemplateRef,
    templateUnknownTokens,
    setActiveTemplateArea,
    setSelectedTemplateId,
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
  } = templatesManager;

  const [searchTerm, setSearchTerm] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");

  const templatePreviewRecord = useMemo(
    () => buildPreviewRecord(previewRows?.[0], selectedCategory, templateForm?.name || "Modelo em edição"),
    [previewRows, selectedCategory, templateForm?.name]
  );

  const hasUnknownTokens =
    templateUnknownTokens.header.length ||
    templateUnknownTokens.body.length ||
    templateUnknownTokens.footer.length;

  const selectedTemplate = useMemo(
    () => templates.find((item) => String(item.id) === String(selectedTemplateId)) || null,
    [templates, selectedTemplateId]
  );

  const sectionStats = useMemo(
    () =>
      TEMPLATE_SECTIONS.map((section) => ({
        ...section,
        stats: getSectionStats(templateForm?.[section.key] || ""),
      })),
    [templateForm]
  );

  const activeSection = useMemo(
    () => sectionStats.find((section) => section.key === activeTemplateArea) || sectionStats[0],
    [sectionStats, activeTemplateArea]
  );

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = String(searchTerm || "").trim().toLowerCase();

    return templates.filter((item) => {
      const matchesFilter =
        templateFilter === "all"
          ? true
          : templateFilter === "active"
            ? Boolean(item?.isActive)
            : templateFilter === "selected"
              ? String(item?.id) === String(selectedTemplateId)
              : String(item?.id) === String(editingTemplateId);

      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = `${item?.name || ""} ${item?.description || ""} ${buildTemplateSummary(item)}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [templates, templateFilter, searchTerm, selectedTemplateId, editingTemplateId]);

  const activeTemplatesCount = useMemo(
    () => templates.filter((item) => Boolean(item?.isActive)).length,
    [templates]
  );

  const completedSections = sectionStats.filter((section) => !section.stats.isEmpty).length;
  const previewRowsCount = Array.isArray(previewRows) ? previewRows.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                <Sparkles size={14} />
                Workspace de Modelos
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                Monte, valide e reuse seus layouts de PDF em um único fluxo.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                A tela foi reorganizada para deixar claro o que está em edição, qual área vai receber a próxima TAG
                e como o modelo fica no PDF antes de salvar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
              <MetricPill label="Modelos" value={templatesLoading ? "..." : templates.length} tone="violet" />
              <MetricPill label="Ativos" value={templatesLoading ? "..." : activeTemplatesCount} tone="emerald" />
              <MetricPill label="Seções prontas" value={`${completedSections}/3`} />
              <MetricPill label="Base do preview" value={previewRowsCount ? `${previewRowsCount} linha(s)` : "Exemplo"} tone="amber" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-slate-900">Fluxo recomendado</div>
                {editingTemplateId ? <Badge status="pending" text="Modo edição" /> : <Badge status="confirmed" text="Novo modelo" />}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {sectionStats.map((section, index) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveTemplateArea(section.key)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      activeTemplateArea === section.key
                        ? "border-violet-300 bg-violet-50 text-violet-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                        {index + 1}
                      </span>
                      {section.shortTitle}
                    </div>
                    <div className="mt-2 text-sm font-medium">
                      {section.stats.isEmpty ? "Ainda sem conteúdo" : `${section.stats.tokenCount} TAG(s) • ${section.stats.lineCount} linhas`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Eye size={16} className="text-violet-600" />
                Estado atual
              </div>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Modelo do lote</div>
                  <div className="mt-1 font-medium text-slate-800">{selectedTemplate?.name || "Nenhum modelo selecionado no lote"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Área para TAG</div>
                  <div className="mt-1 font-medium text-slate-800">{activeSection?.shortTitle || "Corpo"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</div>
                  <div className="mt-1 font-medium text-slate-800">
                    {previewRowsCount
                      ? `Usando a primeira linha do preview congelado (${previewRowsCount} linha(s) disponíveis).`
                      : "Sem preview congelado: o sistema mostra dados de exemplo para orientar a edição."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-violet-600">
              <Layers3 size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Resumo do editor</div>
              <div className="mt-1 text-sm text-slate-500">
                Veja rapidamente o estado do formulário antes de salvar ou trocar de modelo.
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricPill label="Modelo ativo no formulário" value={templateForm?.name?.trim() || "Sem nome"} tone="violet" />
            <MetricPill label="Categoria atual" value={selectedCategory ? `Categoria ${selectedCategory}` : "Sem categoria"} />
            <MetricPill label="TAGS válidas" value={hasUnknownTokens ? "Revisar" : "OK"} tone={hasUnknownTokens ? "amber" : "emerald"} />
            <MetricPill
              label="Seções preenchidas"
              value={`${completedSections} de ${sectionStats.length}`}
              tone={completedSections === sectionStats.length ? "emerald" : "slate"}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-800">Como este modelo funciona</div>
            <div className="mt-2 leading-relaxed">
              Você escreve o relatório na ordem exata em que ele deve aparecer no PDF. As <b>TAGS</b> abaixo são
              substituídas automaticamente pelos dados da planilha, da Demanda e da categoria escolhida.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          <Card title={editingTemplateId ? "Editar Modelo de Relatório" : "Novo Modelo de Relatório"}>
            <form className="space-y-6" onSubmit={handleTemplateSubmit}>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
                <div>
                  <label className="ml-1 text-xs font-bold uppercase text-slate-500">Nome do modelo</label>
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-300"
                    value={templateForm.name}
                    onChange={(event) => handleTemplateFieldChange("name", event.target.value)}
                    placeholder="Ex.: Intermédica • padrão"
                  />
                </div>

                <label className="mt-8 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(templateForm.isActive)}
                    onChange={(event) => handleTemplateFieldChange("isActive", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  />
                  Modelo ativo
                </label>
              </div>

              <div>
                <label className="ml-1 text-xs font-bold uppercase text-slate-500">Descrição interna</label>
                <textarea
                  className="mt-2 min-h-[90px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-300"
                  value={templateForm.description}
                  onChange={(event) => handleTemplateFieldChange("description", event.target.value)}
                  placeholder="Uso interno do modelo, convênio, layout, observações..."
                />
              </div>

              <div className="space-y-5">
                {TEMPLATE_SECTIONS.map((section) => (
                  <TemplateSectionCard
                    key={section.key}
                    section={section}
                    value={templateForm?.[section.key] || ""}
                    activeTemplateArea={activeTemplateArea}
                    setActiveTemplateArea={setActiveTemplateArea}
                    handleTemplateTextChange={handleTemplateTextChange}
                    handleTemplateFormattingAction={handleTemplateFormattingAction}
                    headerTemplateRef={headerTemplateRef}
                    bodyTemplateRef={bodyTemplateRef}
                    footerTemplateRef={footerTemplateRef}
                    handleTemplateLogoUpload={handleTemplateLogoUpload}
                    handleRemoveTemplateLogo={handleRemoveTemplateLogo}
                    headerLogoDataUrl={templateForm?.headerLogoDataUrl}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" icon={Save} disabled={templateBusy}>
                  {templateBusy
                    ? editingTemplateId
                      ? "Salvando..."
                      : "Cadastrando..."
                    : editingTemplateId
                      ? "Salvar modelo"
                      : "Cadastrar modelo"}
                </Button>

                {editingTemplateId ? (
                  <Button type="button" variant="secondary" onClick={handleCancelEditTemplate}>
                    Cancelar edição
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <Card title="Preview e validação">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricPill label="Categoria" value={selectedCategory ? `Categoria ${selectedCategory}` : "Sem categoria"} />
                <MetricPill label="Registro de base" value={previewRowsCount ? "Preview congelado" : "Dados de exemplo"} tone="amber" />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-800">Base do preview</div>
                <div className="mt-2 leading-relaxed">
                  {previewRowsCount
                    ? "A prévia abaixo usa a primeira linha do preview congelado. Isso ajuda a validar TAGS, categoria e hierarquia do modelo com dados reais do lote."
                    : "Ainda não existe preview congelado. O sistema usa dados de exemplo para você estruturar o modelo com segurança antes do primeiro lote."}
                </div>
              </div>

              {hasUnknownTokens ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  <div className="font-semibold">TAGS não reconhecidas</div>
                  <div className="mt-2 space-y-1">
                    {templateUnknownTokens.header.length > 0 && (
                      <div><b>Cabeçalho:</b> {templateUnknownTokens.header.join(", ")}</div>
                    )}
                    {templateUnknownTokens.body.length > 0 && (
                      <div><b>Corpo:</b> {templateUnknownTokens.body.join(", ")}</div>
                    )}
                    {templateUnknownTokens.footer.length > 0 && (
                      <div><b>Rodapé:</b> {templateUnknownTokens.footer.join(", ")}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  Todas as TAGS do modelo estão válidas para o preview do PDF.
                </div>
              )}

              <TemplateRenderedPreview
                templateForm={templateForm}
                previewRecord={templatePreviewRecord}
                selectedCategory={selectedCategory}
              />
            </div>
          </Card>

          <Card title="Biblioteca de TAGS">
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4 text-sm text-violet-900">
                <div className="font-semibold">Inserção atual</div>
                <div className="mt-1">
                  A próxima TAG será enviada para <b>{activeSection?.shortTitle || "Corpo"}</b>.
                </div>
              </div>

              <TemplateTagToolbar onInsert={(tag) => handleInsertTemplateTag(tag, activeTemplateArea)} />
            </div>
          </Card>

          <Card title="Modelos cadastrados">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px]">
                <label className="space-y-1.5 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Buscar modelo</span>
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Nome, descrição ou resumo"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400"
                    />
                  </div>
                </label>

                <label className="space-y-1.5 text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">Filtro rápido</span>
                  <div className="relative">
                    <select
                      value={templateFilter}
                      onChange={(event) => setTemplateFilter(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400"
                    >
                      {TEMPLATE_FILTER_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ListFilterProxy />
                  </div>
                </label>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <MetricPill label="Carregados" value={templatesLoading ? "..." : templates.length} />
                  <MetricPill label="Visíveis" value={templatesLoading ? "..." : filteredTemplates.length} tone="violet" />
                  <MetricPill label="Ativos" value={templatesLoading ? "..." : activeTemplatesCount} tone="emerald" />
                </div>
                <div className="mt-3 text-sm text-slate-500">
                  O modelo marcado como ativo pode ser selecionado rapidamente no lote de importação.
                </div>
              </div>

              {!templatesLoading && !templates.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Nenhum modelo cadastrado ainda.
                </div>
              ) : null}

              {!templatesLoading && templates.length > 0 && !filteredTemplates.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Nenhum modelo encontrado para o filtro atual.
                </div>
              ) : null}

              <div className="space-y-3">
                {filteredTemplates.map((item, index) => {
                  const isSelected = String(item.id) === String(selectedTemplateId);
                  const isEditing = String(item.id) === String(editingTemplateId);

                  return (
                    <div
                      key={item.id || `${item.name}-${index}`}
                      className={`rounded-2xl border p-4 transition ${
                        isEditing
                          ? "border-violet-200 bg-violet-50/40"
                          : isSelected
                            ? "border-slate-300 bg-slate-50/80"
                            : "border-slate-100 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
                              {item.isActive ? <Badge status="confirmed" text="Ativo" /> : null}
                              {isSelected ? <Badge status="pending" text="Selecionado no lote" /> : null}
                              {isEditing ? <Badge status="signed" text="Em edição" /> : null}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{buildTemplateSummary(item)}</div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={isSelected ? "primary" : "secondary"}
                              className="px-3 py-2"
                              onClick={() => setSelectedTemplateId(String(item.id))}
                            >
                              {isSelected ? "Usando no lote" : "Usar no lote"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-3 py-2"
                              onClick={() => handleEditTemplate(item)}
                              icon={PencilLine}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-3 py-2"
                              onClick={() => handleToggleTemplateActive(item)}
                            >
                              {item.isActive ? "Manter ativo" : "Ativar"}
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              className="px-3 py-2"
                              onClick={() => handleDeleteTemplate(item)}
                              icon={Trash2}
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>

                        {item.description ? (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            {item.description}
                          </div>
                        ) : null}

                        {item.bodyTemplate ? (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                            <div className="mb-2 flex items-center gap-2 font-semibold uppercase tracking-wide text-slate-400">
                              <FileText size={14} />
                              Trecho do corpo
                            </div>
                            <div className="whitespace-pre-wrap">{String(item.bodyTemplate).split("\n").slice(0, 5).join("\n")}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card title="Atalhos de escrita">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="font-semibold text-slate-800">Exemplo prático</div>
                <div className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-600">
                  {"Paciente: {{paciente}}\nProfissional: {{profissional}}\n\n{{categoria_titulo}}\n{{categoria_conteudo}}"}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-800">
                O PDF vai seguir exatamente a ordem em que você escrever o texto no editor, respeitando cabeçalho,
                corpo, rodapé, alinhamento e TAGS.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ListFilterProxy() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
      <FileText size={16} />
    </div>
  );
}
