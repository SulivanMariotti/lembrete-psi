
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { adminFetch } from "../../../../services/adminApi";
import { createEmptyDemandForm, mapDemandToForm } from "../../../../lib/shared/reportDemands";
import {
  REPORT_SPECIALTY_DEMAND_SOURCE_MODES,
  createEmptySpecialtyForm,
  mapSpecialtyToForm,
} from "../../../../lib/shared/reportSpecialties";

export function useReportSpecialtiesManager({ showToast }) {
  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false);
  const [specialtyBusy, setSpecialtyBusy] = useState(false);
  const [editingSpecialtyId, setEditingSpecialtyId] = useState("");
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [specialtyForm, setSpecialtyForm] = useState(createEmptySpecialtyForm());

  const [specialtyDemands, setSpecialtyDemands] = useState([]);
  const [specialtyDemandsLoading, setSpecialtyDemandsLoading] = useState(false);
  const [specialtyDemandBusy, setSpecialtyDemandBusy] = useState(false);
  const [editingSpecialtyDemandId, setEditingSpecialtyDemandId] = useState("");
  const [specialtyDemandForm, setSpecialtyDemandForm] = useState(createEmptyDemandForm());

  const selectedSpecialty = useMemo(
    () => specialties.find((item) => String(item.id) === String(selectedSpecialtyId)) || null,
    [specialties, selectedSpecialtyId]
  );

  const specialtyDefaultDemandOptions = useMemo(
    () => specialtyDemands.filter((item) => item?.id && String(item?.name || "").trim()),
    [specialtyDemands]
  );

  const loadSpecialties = useCallback(
    async (preferredId = "") => {
      setSpecialtiesLoading(true);
      try {
        const response = await adminFetch("/api/admin/report/specialties");
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.ok) {
          showToast?.(data?.error || "Falha ao carregar as Especialidades.", "error");
          return;
        }

        const items = Array.isArray(data?.items) ? data.items : [];
        setSpecialties(items);
        setSelectedSpecialtyId((current) => {
          const preferred = String(preferredId || editingSpecialtyId || current || "").trim();
          if (preferred && items.some((item) => String(item.id) === preferred)) {
            return preferred;
          }
          return String(items[0]?.id || "");
        });
      } catch (error) {
        console.error(error);
        showToast?.("Erro ao carregar o cadastro de Especialidades.", "error");
      } finally {
        setSpecialtiesLoading(false);
      }
    },
    [editingSpecialtyId, showToast]
  );

  const loadSpecialtyDemands = useCallback(
    async (specialtyId) => {
      const id = String(specialtyId || "").trim();
      if (!id) {
        setSpecialtyDemands([]);
        return;
      }

      setSpecialtyDemandsLoading(true);
      try {
        const response = await adminFetch(`/api/admin/report/specialties/${id}/demands`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.ok) {
          showToast?.(data?.error || "Falha ao carregar as Demandas da Especialidade.", "error");
          return;
        }

        setSpecialtyDemands(Array.isArray(data?.items) ? data.items : []);
      } catch (error) {
        console.error(error);
        showToast?.("Erro ao carregar as Demandas da Especialidade.", "error");
      } finally {
        setSpecialtyDemandsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadSpecialties();
  }, [loadSpecialties]);

  useEffect(() => {
    if (!selectedSpecialtyId) {
      setSpecialtyDemands([]);
      setEditingSpecialtyDemandId("");
      setSpecialtyDemandForm(createEmptyDemandForm());
      return;
    }

    loadSpecialtyDemands(selectedSpecialtyId);
  }, [loadSpecialtyDemands, selectedSpecialtyId]);

  const handleSpecialtyFieldChange = (field, value) => {
    setSpecialtyForm((current) => ({ ...current, [field]: value }));
  };

  const handleCancelEditSpecialty = () => {
    setEditingSpecialtyId("");
    setSpecialtyForm(createEmptySpecialtyForm());
  };

  const handleSelectSpecialty = (item) => {
    const specialtyId = String(item?.id || "").trim();
    if (!specialtyId) return;
    setSelectedSpecialtyId(specialtyId);
    setEditingSpecialtyDemandId("");
    setSpecialtyDemandForm(createEmptyDemandForm());
  };

  const handleEditSpecialty = (item) => {
    setEditingSpecialtyId(String(item?.id || ""));
    setSelectedSpecialtyId(String(item?.id || ""));
    setSpecialtyForm(mapSpecialtyToForm(item));
  };

  const handleSpecialtySubmit = async (event) => {
    event?.preventDefault?.();

    const payload = {
      ...specialtyForm,
      isActive: Boolean(specialtyForm.isActive),
      defaultDemandId:
        specialtyForm.demandSourceMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT
          ? String(specialtyForm.defaultDemandId || "").trim()
          : "",
    };

    if (!String(payload.name || "").trim()) {
      showToast?.("Informe o nome da Especialidade.", "error");
      return;
    }

    if (
      payload.demandSourceMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT &&
      !payload.defaultDemandId
    ) {
      showToast?.("Escolha a Demanda padrão da Especialidade.", "error");
      return;
    }

    setSpecialtyBusy(true);
    try {
      const url = editingSpecialtyId
        ? `/api/admin/report/specialties/${editingSpecialtyId}`
        : "/api/admin/report/specialties";
      const method = editingSpecialtyId ? "PATCH" : "POST";

      const response = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao salvar a Especialidade.", "error");
        return;
      }

      const specialtyId = String(data?.id || editingSpecialtyId || "").trim();
      await loadSpecialties(specialtyId);
      if (specialtyId) {
        setSelectedSpecialtyId(specialtyId);
        await loadSpecialtyDemands(specialtyId);
      }
      handleCancelEditSpecialty();
      showToast?.(
        editingSpecialtyId
          ? "Especialidade atualizada com sucesso."
          : "Especialidade cadastrada com sucesso.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao salvar a Especialidade.", "error");
    } finally {
      setSpecialtyBusy(false);
    }
  };

  const handleToggleSpecialtyActive = async (item) => {
    if (!item?.id) return;

    setSpecialtyBusy(true);
    try {
      const response = await adminFetch(`/api/admin/report/specialties/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao atualizar a Especialidade.", "error");
        return;
      }

      await loadSpecialties(item.id);
      showToast?.(
        item.isActive ? "Especialidade inativada com sucesso." : "Especialidade ativada com sucesso.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao atualizar a Especialidade.", "error");
    } finally {
      setSpecialtyBusy(false);
    }
  };

  const handleDeleteSpecialty = async (item) => {
    if (!item?.id) return;
    const confirmed = window.confirm(`Excluir a Especialidade "${item.name}"?`);
    if (!confirmed) return;

    setSpecialtyBusy(true);
    try {
      const response = await adminFetch(`/api/admin/report/specialties/${item.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao excluir a Especialidade.", "error");
        return;
      }

      if (String(editingSpecialtyId) === String(item.id)) {
        handleCancelEditSpecialty();
      }
      if (String(selectedSpecialtyId) === String(item.id)) {
        setSelectedSpecialtyId("");
        setSpecialtyDemands([]);
        setEditingSpecialtyDemandId("");
        setSpecialtyDemandForm(createEmptyDemandForm());
      }

      await loadSpecialties();
      showToast?.("Especialidade excluída com sucesso.", "success");
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao excluir a Especialidade.", "error");
    } finally {
      setSpecialtyBusy(false);
    }
  };

  const handleSpecialtyDemandFieldChange = (field, value) => {
    setSpecialtyDemandForm((current) => ({ ...current, [field]: value }));
  };

  const handleCancelEditSpecialtyDemand = () => {
    setEditingSpecialtyDemandId("");
    setSpecialtyDemandForm(createEmptyDemandForm());
  };

  const handleEditSpecialtyDemand = (item) => {
    setEditingSpecialtyDemandId(String(item?.id || ""));
    setSpecialtyDemandForm(mapDemandToForm(item));
  };

  const handleSpecialtyDemandSubmit = async (event) => {
    event?.preventDefault?.();

    if (!selectedSpecialtyId) {
      showToast?.("Escolha uma Especialidade antes de cadastrar a Demanda.", "error");
      return;
    }

    const payload = {
      ...specialtyDemandForm,
      isActive: Boolean(specialtyDemandForm.isActive),
    };

    if (!String(payload.name || "").trim()) {
      showToast?.("Informe o nome da Demanda.", "error");
      return;
    }

    setSpecialtyDemandBusy(true);
    try {
      const url = editingSpecialtyDemandId
        ? `/api/admin/report/specialties/${selectedSpecialtyId}/demands/${editingSpecialtyDemandId}`
        : `/api/admin/report/specialties/${selectedSpecialtyId}/demands`;
      const method = editingSpecialtyDemandId ? "PATCH" : "POST";

      const response = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao salvar a Demanda da Especialidade.", "error");
        return;
      }

      await loadSpecialtyDemands(selectedSpecialtyId);
      await loadSpecialties(selectedSpecialtyId);
      handleCancelEditSpecialtyDemand();
      showToast?.(
        editingSpecialtyDemandId
          ? "Demanda da Especialidade atualizada com sucesso."
          : "Demanda da Especialidade cadastrada com sucesso.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao salvar a Demanda da Especialidade.", "error");
    } finally {
      setSpecialtyDemandBusy(false);
    }
  };

  const handleToggleSpecialtyDemandActive = async (item) => {
    if (!selectedSpecialtyId || !item?.id) return;

    setSpecialtyDemandBusy(true);
    try {
      const response = await adminFetch(`/api/admin/report/specialties/${selectedSpecialtyId}/demands/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao atualizar a Demanda da Especialidade.", "error");
        return;
      }

      await loadSpecialtyDemands(selectedSpecialtyId);
      await loadSpecialties(selectedSpecialtyId);
      showToast?.(
        item.isActive
          ? "Demanda da Especialidade inativada com sucesso."
          : "Demanda da Especialidade ativada com sucesso.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao atualizar a Demanda da Especialidade.", "error");
    } finally {
      setSpecialtyDemandBusy(false);
    }
  };

  const handleDeleteSpecialtyDemand = async (item) => {
    if (!selectedSpecialtyId || !item?.id) return;
    const confirmed = window.confirm(`Excluir a Demanda "${item.name}" da Especialidade selecionada?`);
    if (!confirmed) return;

    setSpecialtyDemandBusy(true);
    try {
      const response = await adminFetch(`/api/admin/report/specialties/${selectedSpecialtyId}/demands/${item.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao excluir a Demanda da Especialidade.", "error");
        return;
      }

      if (String(editingSpecialtyDemandId) === String(item.id)) {
        handleCancelEditSpecialtyDemand();
      }

      await loadSpecialtyDemands(selectedSpecialtyId);
      await loadSpecialties(selectedSpecialtyId);
      showToast?.("Demanda da Especialidade excluída com sucesso.", "success");
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao excluir a Demanda da Especialidade.", "error");
    } finally {
      setSpecialtyDemandBusy(false);
    }
  };

  const handleSetDefaultDemandForSpecialty = async (item) => {
    if (!selectedSpecialty?.id || !item?.id) return;

    setSpecialtyBusy(true);
    try {
      const response = await adminFetch(`/api/admin/report/specialties/${selectedSpecialty.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demandSourceMode: selectedSpecialty.demandSourceMode,
          defaultDemandId: item.id,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao definir a Demanda padrão.", "error");
        return;
      }

      await loadSpecialties(selectedSpecialty.id);
      if (String(editingSpecialtyId) === String(selectedSpecialty.id)) {
        setSpecialtyForm((current) => ({ ...current, defaultDemandId: item.id }));
      }
      showToast?.("Demanda padrão definida com sucesso.", "success");
    } catch (error) {
      console.error(error);
      showToast?.("Erro ao definir a Demanda padrão.", "error");
    } finally {
      setSpecialtyBusy(false);
    }
  };

  return {
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
    setSelectedSpecialtyId,
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
  };
}
