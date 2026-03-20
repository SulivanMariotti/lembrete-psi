
"use client";

import React from "react";
import { PencilLine, Save, Trash2 } from "lucide-react";

import { Badge, Button, Card } from "../../DesignSystem";
import { REPORT_DEMAND_CATEGORY_OPTIONS } from "../../../lib/shared/reportDemands";
import { REPORT_SPECIALTY_DEMAND_SOURCE_MODES } from "../../../lib/shared/reportSpecialties";
import {
  buildDemandPreviewLabel,
  specialtyModeToHint,
  specialtyModeToLabel,
} from "./shared";

export default function ReportSpecialtiesPanel({ specialtiesManager }) {
  const {
    specialties,
    specialtiesLoading,
    specialtyBusy,
    editingSpecialtyId,
    selectedSpecialtyId,
    specialtyForm,
    specialtyDemands,
    specialtyDemandsLoading,
    specialtyDemandBusy,
    editingSpecialtyDemandId,
    specialtyDemandForm,
    selectedSpecialty,
    specialtyDefaultDemandOptions,
    setSpecialtyForm,
    handleSpecialtyFieldChange,
    handleCancelEditSpecialty,
    handleSelectSpecialty,
    handleEditSpecialty,
    handleSpecialtySubmit,
    handleToggleSpecialtyActive,
    handleDeleteSpecialty,
    handleSpecialtyDemandFieldChange,
    handleCancelEditSpecialtyDemand,
    handleEditSpecialtyDemand,
    handleSpecialtyDemandSubmit,
    handleToggleSpecialtyDemandActive,
    handleDeleteSpecialtyDemand,
    handleSetDefaultDemandForSpecialty,
  } = specialtiesManager;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
      <div className="space-y-6">
        <Card title={editingSpecialtyId ? "Editar Especialidade" : "Nova Especialidade"}>
          <form className="space-y-6" onSubmit={handleSpecialtySubmit}>
            <div className="space-y-4">
              <div>
                <label className="ml-1 text-xs font-bold uppercase text-slate-500">Nome da Especialidade</label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  value={specialtyForm.name}
                  onChange={(event) => handleSpecialtyFieldChange("name", event.target.value)}
                  placeholder="Ex.: Psicologia"
                />
              </div>

              <div>
                <label className="ml-1 text-xs font-bold uppercase text-slate-500">Descrição</label>
                <textarea
                  className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  value={specialtyForm.description}
                  onChange={(event) => handleSpecialtyFieldChange("description", event.target.value)}
                  placeholder="Resumo operacional da Especialidade, observações e regra de uso."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="ml-1 text-xs font-bold uppercase text-slate-500">Origem da Demanda</label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    value={specialtyForm.demandSourceMode}
                    onChange={(event) => {
                      const nextMode = event.target.value;
                      setSpecialtyForm((current) => ({
                        ...current,
                        demandSourceMode: nextMode,
                        defaultDemandId:
                          nextMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT
                            ? current.defaultDemandId
                            : "",
                      }));
                    }}
                  >
                    <option value={REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL}>Demanda do arquivo</option>
                    <option value={REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT}>Demanda do sistema</option>
                  </select>
                  <div className="mt-1 text-[11px] text-slate-500">{specialtyModeToHint(specialtyForm.demandSourceMode)}</div>
                </div>

                <div>
                  <label className="ml-1 text-xs font-bold uppercase text-slate-500">Demanda padrão</label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-50"
                    value={specialtyForm.defaultDemandId}
                    disabled={specialtyForm.demandSourceMode !== REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT}
                    onChange={(event) => handleSpecialtyFieldChange("defaultDemandId", event.target.value)}
                  >
                    <option value="">
                      {specialtyDefaultDemandOptions.length ? "Escolha a Demanda padrão" : "Cadastre uma Demanda primeiro"}
                    </option>
                    {specialtyDefaultDemandOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Obrigatória apenas quando a Especialidade usa Demanda do sistema. No modo arquivo, a resolução usa Demanda e fallback em Tags.
                  </div>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(specialtyForm.isActive)}
                  onChange={(event) => handleSpecialtyFieldChange("isActive", event.target.checked)}
                />
                Especialidade ativa para novos lotes
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" icon={Save} disabled={specialtyBusy}>
                {specialtyBusy
                  ? editingSpecialtyId
                    ? "Salvando..."
                    : "Cadastrando..."
                  : editingSpecialtyId
                    ? "Salvar Especialidade"
                    : "Cadastrar Especialidade"}
              </Button>

              {editingSpecialtyId ? (
                <Button type="button" variant="secondary" onClick={handleCancelEditSpecialty}>
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card title="Especialidades cadastradas">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">Especialidades carregadas</div>
              <div className="mt-1 text-3xl font-bold text-slate-900">{specialtiesLoading ? "..." : specialties.length}</div>
              <div className="mt-1 text-sm text-slate-500">
                Selecione uma Especialidade para liberar o cadastro de Demandas no painel da direita.
              </div>
            </div>

            {!specialtiesLoading && !specialties.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Nenhuma Especialidade cadastrada ainda.
              </div>
            ) : null}

            {specialties.map((item) => {
              const isSelected = String(item.id) === String(selectedSpecialtyId);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${isSelected ? "border-violet-300 bg-violet-50/60" : "border-slate-100 bg-white"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-slate-900">{item.name}</div>
                        <Badge status={item.isActive ? "confirmed" : "pending"}>
                          {item.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                        <Badge status="info">{specialtyModeToLabel(item.demandSourceMode)}</Badge>
                        {isSelected ? <Badge status="warning">Selecionada</Badge> : null}
                      </div>
                      <div className="text-sm text-slate-500">{item.description || "Sem descrição informada."}</div>
                      <div className="text-xs text-slate-500">
                        {item.demandsCount || 0} Demanda(s) cadastrada(s)
                        {item.defaultDemandName ? ` • Padrão: ${item.defaultDemandName}` : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => handleSelectSpecialty(item)}>
                        Usar
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => handleEditSpecialty(item)} icon={PencilLine}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleToggleSpecialtyActive(item)}
                        disabled={specialtyBusy}
                      >
                        {item.isActive ? "Inativar" : "Ativar"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleDeleteSpecialty(item)}
                        icon={Trash2}
                        disabled={specialtyBusy}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card
          title={
            selectedSpecialty
              ? editingSpecialtyDemandId
                ? `Editar Demanda • ${selectedSpecialty.name}`
                : `Nova Demanda • ${selectedSpecialty.name}`
              : "Demandas da Especialidade"
          }
        >
          {!selectedSpecialty ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Cadastre ou selecione uma Especialidade no painel da esquerda para liberar as Demandas.
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSpecialtyDemandSubmit}>
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                <div className="font-semibold">{selectedSpecialty.name}</div>
                <div className="mt-1">
                  Regra atual: <b>{specialtyModeToLabel(selectedSpecialty.demandSourceMode)}</b>
                </div>
                <div className="mt-1 text-violet-700">{specialtyModeToHint(selectedSpecialty.demandSourceMode)}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="ml-1 text-xs font-bold uppercase text-slate-500">Nome da Demanda</label>
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    value={specialtyDemandForm.name}
                    onChange={(event) => handleSpecialtyDemandFieldChange("name", event.target.value)}
                    placeholder="Ex.: Avaliação inicial"
                  />
                </div>

                <div>
                  <label className="ml-1 text-xs font-bold uppercase text-slate-500">Descrição geral</label>
                  <textarea
                    className="mt-2 min-h-[110px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    value={specialtyDemandForm.description}
                    onChange={(event) => handleSpecialtyDemandFieldChange("description", event.target.value)}
                    placeholder="Contexto da Demanda, observações gerais e uso interno..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="ml-1 text-xs font-bold uppercase text-slate-500">CID Inf</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                      value={specialtyDemandForm.cidInf}
                      onChange={(event) => handleSpecialtyDemandFieldChange("cidInf", event.target.value)}
                      placeholder="Ex.: F90 / CID infantil"
                    />
                  </div>

                  <div>
                    <label className="ml-1 text-xs font-bold uppercase text-slate-500">CID Adult</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                      value={specialtyDemandForm.cidAdult}
                      onChange={(event) => handleSpecialtyDemandFieldChange("cidAdult", event.target.value)}
                      placeholder="Ex.: F41 / CID adulto"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(specialtyDemandForm.isActive)}
                    onChange={(event) => handleSpecialtyDemandFieldChange("isActive", event.target.checked)}
                  />
                  Demanda ativa para novos lotes
                </label>

                {REPORT_DEMAND_CATEGORY_OPTIONS.map((categoryNumber) => (
                  <div key={categoryNumber} className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-semibold text-slate-900">Categoria {categoryNumber}</div>

                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className="ml-1 text-xs font-bold uppercase text-slate-500">Título</label>
                        <input
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                          value={specialtyDemandForm[`category${categoryNumber}Title`]}
                          onChange={(event) =>
                            handleSpecialtyDemandFieldChange(`category${categoryNumber}Title`, event.target.value)
                          }
                          placeholder={`Categoria ${categoryNumber}`}
                        />
                      </div>

                      <div>
                        <label className="ml-1 text-xs font-bold uppercase text-slate-500">Conteúdo</label>
                        <textarea
                          className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                          value={specialtyDemandForm[`category${categoryNumber}Content`]}
                          onChange={(event) =>
                            handleSpecialtyDemandFieldChange(`category${categoryNumber}Content`, event.target.value)
                          }
                          placeholder={`Texto da Categoria ${categoryNumber}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" icon={Save} disabled={specialtyDemandBusy}>
                  {specialtyDemandBusy
                    ? editingSpecialtyDemandId
                      ? "Salvando..."
                      : "Cadastrando..."
                    : editingSpecialtyDemandId
                      ? "Salvar Demanda"
                      : "Cadastrar Demanda"}
                </Button>

                {editingSpecialtyDemandId ? (
                  <Button type="button" variant="secondary" onClick={handleCancelEditSpecialtyDemand}>
                    Cancelar edição
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </Card>

        <Card title={selectedSpecialty ? `Demandas de ${selectedSpecialty.name}` : "Demandas da Especialidade"}>
          {!selectedSpecialty ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Escolha uma Especialidade para visualizar as Demandas cadastradas.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">Demandas carregadas</div>
                <div className="mt-1 text-3xl font-bold text-slate-900">
                  {specialtyDemandsLoading ? "..." : specialtyDemands.length}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedSpecialty.demandSourceMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL
                    ? "Psicologia usa a Demanda do arquivo. Mantenha os nomes do sistema alinhados ao Excel."
                    : "Nutrição/Fonoaudiologia podem usar a Demanda padrão do sistema para gerar o relatório."}
                </div>
              </div>

              {!specialtyDemandsLoading && !specialtyDemands.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Nenhuma Demanda cadastrada para esta Especialidade ainda.
                </div>
              ) : null}

              {specialtyDemands.map((item) => {
                const isDefault = String(selectedSpecialty.defaultDemandId || "") === String(item.id);
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-slate-900">{item.name}</div>
                          <Badge status={item.isActive ? "confirmed" : "pending"}>
                            {item.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                          {isDefault ? <Badge status="warning">Padrão</Badge> : null}
                        </div>
                        <div className="text-sm text-slate-500">{item.description || "Sem descrição informada."}</div>
                        <div className="text-xs text-slate-500">{buildDemandPreviewLabel(item)}</div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedSpecialty.demandSourceMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleSetDefaultDemandForSpecialty(item)}
                            disabled={specialtyBusy}
                          >
                            {isDefault ? "Demanda padrão" : "Definir padrão"}
                          </Button>
                        ) : null}
                        <Button type="button" variant="secondary" onClick={() => handleEditSpecialtyDemand(item)} icon={PencilLine}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleToggleSpecialtyDemandActive(item)}
                          disabled={specialtyDemandBusy}
                        >
                          {item.isActive ? "Inativar" : "Ativar"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleDeleteSpecialtyDemand(item)}
                          icon={Trash2}
                          disabled={specialtyDemandBusy}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
