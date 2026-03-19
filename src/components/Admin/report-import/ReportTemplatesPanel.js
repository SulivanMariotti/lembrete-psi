
"use client";

import React, { useMemo } from "react";
import { PencilLine, Save, Trash2 } from "lucide-react";

import { Badge, Button, Card } from "../../DesignSystem";
import { buildTemplateSummary } from "../../../lib/shared/reportTemplates";
import {
  TemplateFormattingToolbar,
  TemplateRenderedPreview,
  TemplateTagToolbar,
  buildPreviewRecord,
} from "./shared";

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

  const templatePreviewRecord = useMemo(
    () => buildPreviewRecord(previewRows?.[0], selectedCategory, templateForm?.name || "Modelo em edição"),
    [previewRows, selectedCategory, templateForm?.name]
  );

  const hasUnknownTokens =
    templateUnknownTokens.header.length ||
    templateUnknownTokens.body.length ||
    templateUnknownTokens.footer.length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
      <div className="space-y-6">
        <Card title={editingTemplateId ? "Editar Modelo de Relatório" : "Novo Modelo de Relatório"}>
          <form className="space-y-6" onSubmit={handleTemplateSubmit}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
              <div>
                <label className="ml-1 text-xs font-bold uppercase text-slate-500">Nome do modelo</label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  value={templateForm.name}
                  onChange={(event) => handleTemplateFieldChange("name", event.target.value)}
                  placeholder="Ex.: Intermédica • padrão"
                />
              </div>

              <label className="mt-8 flex items-center gap-2 text-sm text-slate-600">
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
                className="mt-2 min-h-[90px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                value={templateForm.description}
                onChange={(event) => handleTemplateFieldChange("description", event.target.value)}
                placeholder="Uso interno do modelo, convênio, layout, observações..."
              />
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
              <div className="text-sm font-semibold text-violet-900">Como este modelo funciona</div>
              <div className="mt-2 text-sm leading-relaxed text-violet-800">
                Você escreve o relatório na ordem exata em que ele deve aparecer no PDF. As <b>TAGS</b> abaixo são
                substituídas automaticamente pelos dados da planilha, da Demanda e da categoria escolhida.
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_340px]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Cabeçalho fixo</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Use os botões para definir título, alinhamento e tamanho do texto.
                      </div>
                    </div>

                    <Button type="button" variant="secondary" onClick={() => setActiveTemplateArea("headerTemplate")}>
                      Inserir TAG aqui
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Logo da empresa</div>
                          <div className="mt-1 text-xs text-slate-500">
                            A logo será exibida acima do cabeçalho e no PDF. A imagem é convertida para JPG automaticamente.
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleTemplateLogoUpload}
                            />
                            <span className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700">
                              Carregar logo
                            </span>
                          </label>

                          {templateForm.headerLogoDataUrl ? (
                            <Button type="button" variant="secondary" onClick={handleRemoveTemplateLogo} icon={Trash2}>
                              Remover logo
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {templateForm.headerLogoDataUrl ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4">
                          <img
                            src={templateForm.headerLogoDataUrl}
                            alt="Logo do modelo"
                            className="max-h-16 w-auto max-w-[220px] object-contain"
                          />
                        </div>
                      ) : null}
                    </div>

                    <TemplateFormattingToolbar
                      onAction={(action) => handleTemplateFormattingAction("headerTemplate", action)}
                    />

                    <textarea
                      ref={headerTemplateRef}
                      className="min-h-[170px] w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-700"
                      value={templateForm.headerTemplate}
                      onFocus={() => setActiveTemplateArea("headerTemplate")}
                      onClick={() => setActiveTemplateArea("headerTemplate")}
                      onChange={(event) => handleTemplateTextChange("headerTemplate", event.target.value)}
                      placeholder={"[align=left][size=14][b]CLÍNICA EXEMPLO[/b][/size][/align]\nRua Exemplo, 123\n[align=left][size=13][b]RELATÓRIO CLÍNICO[/b][/size][/align]"}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Corpo do relatório</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Agora você controla a ordem exata e também a aparência do texto no PDF.
                      </div>
                    </div>

                    <Button type="button" variant="secondary" onClick={() => setActiveTemplateArea("bodyTemplate")}>
                      Inserir TAG aqui
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <TemplateFormattingToolbar
                      onAction={(action) => handleTemplateFormattingAction("bodyTemplate", action)}
                    />

                    <textarea
                      ref={bodyTemplateRef}
                      className="min-h-[360px] w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-700"
                      value={templateForm.bodyTemplate}
                      onFocus={() => setActiveTemplateArea("bodyTemplate")}
                      onClick={() => setActiveTemplateArea("bodyTemplate")}
                      onChange={(event) => handleTemplateTextChange("bodyTemplate", event.target.value)}
                      placeholder={"[align=left][size=14][b]Ao convênio {{convenio}},[/b][/size][/align]\n\n[align=justify]O(a) paciente [b]{{paciente}}[/b] encontra-se em acompanhamento com [b]{{profissional}}[/b].[/align]\n\n[align=justify]{{categoria_conteudo}}[/align]"}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Rodapé fixo</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Ideal para local/data, assinatura e observações finais.
                      </div>
                    </div>

                    <Button type="button" variant="secondary" onClick={() => setActiveTemplateArea("footerTemplate")}>
                      Inserir TAG aqui
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <TemplateFormattingToolbar
                      onAction={(action) => handleTemplateFormattingAction("footerTemplate", action)}
                    />

                    <textarea
                      ref={footerTemplateRef}
                      className="min-h-[180px] w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-700"
                      value={templateForm.footerTemplate}
                      onFocus={() => setActiveTemplateArea("footerTemplate")}
                      onClick={() => setActiveTemplateArea("footerTemplate")}
                      onChange={(event) => handleTemplateTextChange("footerTemplate", event.target.value)}
                      placeholder={"[align=center]São Paulo, {{data_geracao_extenso}}[/align]\n\n[align=center][b]{{profissional}}[/b][/align]"}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <Card title="Biblioteca de TAGS">
                  <TemplateTagToolbar onInsert={(tag) => handleInsertTemplateTag(tag, activeTemplateArea)} />
                </Card>

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
                    As TAGS do modelo estão válidas para o preview do PDF.
                  </div>
                )}

                <TemplateRenderedPreview
                  templateForm={templateForm}
                  previewRecord={templatePreviewRecord}
                  selectedCategory={selectedCategory}
                />
              </div>
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

      <div className="space-y-6">
        <Card title="Modelos cadastrados">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">Modelos carregados</div>
              <div className="mt-1 text-3xl font-bold text-slate-900">{templatesLoading ? "..." : templates.length}</div>
              <div className="mt-1 text-sm text-slate-500">
                O modelo marcado como ativo pode ser selecionado rapidamente no lote de importação.
              </div>
            </div>

            {!templatesLoading && !templates.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Nenhum modelo cadastrado ainda.
              </div>
            ) : null}

            {templates.map((item, index) => (
              <div key={item.id || `${item.name}-${index}`} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                      {item.isActive ? <Badge status="confirmed" text="Ativo" /> : null}
                      {String(item.id) === String(selectedTemplateId) ? <Badge status="warning">Selecionado</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{buildTemplateSummary(item)}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setSelectedTemplateId(String(item.id))}>
                      Usar no lote
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => handleEditTemplate(item)} icon={PencilLine}>
                      Editar
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => handleToggleTemplateActive(item)}>
                      Ativar
                    </Button>
                    <Button type="button" variant="danger" onClick={() => handleDeleteTemplate(item)} icon={Trash2}>
                      Excluir
                    </Button>
                  </div>
                </div>

                {item.description ? (
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {item.description}
                  </div>
                ) : null}

                {item.bodyTemplate ? (
                  <div className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    {String(item.bodyTemplate).split("\n").slice(0, 6).join("\n")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Como usar as TAGS">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="font-semibold text-slate-800">Exemplo prático</div>
              <div className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-600">
                {"Paciente: {{paciente}}\nProfissional: {{profissional}}\n\n{{categoria_titulo}}\n{{categoria_conteudo}}"}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-800">
              O PDF vai seguir exatamente a ordem em que você escrever o texto no editor.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
