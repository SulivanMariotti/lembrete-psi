
"use client";

import React, { useState } from "react";
import { ArrowLeft, FileSpreadsheet, Layers3, Tags, Upload } from "lucide-react";

import { Button } from "../DesignSystem";
import ReportImportFlowPanel from "./report-import/ReportImportFlowPanel";
import ReportSpecialtiesPanel from "./report-import/ReportSpecialtiesPanel";
import ReportTemplatesPanel from "./report-import/ReportTemplatesPanel";
import { useReportImportFlow } from "./report-import/hooks/useReportImportFlow";
import { useReportSpecialtiesManager } from "./report-import/hooks/useReportSpecialtiesManager";
import { useReportTemplatesManager } from "./report-import/hooks/useReportTemplatesManager";

export default function AdminReportImportView({ showToast }) {
  const [activeTab, setActiveTab] = useState("import");

  const templatesManager = useReportTemplatesManager({ showToast });
  const specialtiesManager = useReportSpecialtiesManager({ showToast });
  const importFlow = useReportImportFlow({
    showToast,
    selectedTemplateId: templatesManager.selectedTemplateId,
  });

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
              <FileSpreadsheet size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Relatórios • Importação, Especialidades e Modelos
              </h1>
              <p className="text-sm text-slate-500">
                Monte o modelo do PDF, cadastre Especialidades/Demandas e gere um preview congelado.
                Psicologia usa Demanda do arquivo; Nutrição/Fonoaudiologia usam a Demanda padrão do sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={activeTab === "import" ? "primary" : "secondary"}
            onClick={() => setActiveTab("import")}
            icon={Upload}
          >
            Importação
          </Button>
          <Button
            type="button"
            variant={activeTab === "demands" ? "primary" : "secondary"}
            onClick={() => setActiveTab("demands")}
            icon={Tags}
          >
            Especialidades / Demandas
          </Button>
          <Button
            type="button"
            variant={activeTab === "templates" ? "primary" : "secondary"}
            onClick={() => setActiveTab("templates")}
            icon={Layers3}
          >
            Modelos
          </Button>
        </div>
      </div>

      {activeTab === "import" ? (
        <ReportImportFlowPanel
          importFlow={importFlow}
          templatesManager={templatesManager}
          specialtiesCount={specialtiesManager.specialties.length}
        />
      ) : null}

      {activeTab === "demands" ? (
        <ReportSpecialtiesPanel specialtiesManager={specialtiesManager} />
      ) : null}

      {activeTab === "templates" ? (
        <ReportTemplatesPanel
          templatesManager={templatesManager}
          selectedCategory={importFlow.selectedCategory}
          previewRows={importFlow.result?.previewRows || []}
        />
      ) : null}
    </div>
  );
}
