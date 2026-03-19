import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/requireAdmin";
import { adminError } from "@/lib/server/adminError";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import { analyzeReportImportFile, parseSelectedCategory } from "@/lib/server/reportImportAnalysis";
import { createReportImportSession } from "@/lib/server/reportImportSessions";
import { REPORT_IMPORT_TEMPLATE } from "@/lib/shared/reportImportTemplate";

export const runtime = "nodejs";

export async function POST(req) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:import:analyze",
    limit: 10,
    windowMs: 60_000,
    uid: adminAuth.uid,
    errorMessage: "Muitas importações em sequência. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const selectedCategory = parseSelectedCategory(formData.get("selectedCategory"));
    const templateId = String(formData.get("templateId") || "").trim();

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { ok: false, error: "Envie um arquivo .xlsx para importar." },
        { status: 400 }
      );
    }

    const extension = String(file.name || "")
      .trim()
      .toLowerCase()
      .slice(String(file.name || "").lastIndexOf("."));

    if (!REPORT_IMPORT_TEMPLATE.acceptedExtensions.includes(extension)) {
      return NextResponse.json(
        { ok: false, error: "Formato inválido. Envie uma planilha .xlsx." },
        { status: 400 }
      );
    }

    if (file.size > REPORT_IMPORT_TEMPLATE.maxFileSizeBytes) {
      return NextResponse.json(
        { ok: false, error: "Arquivo acima do limite permitido para pré-análise." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = await analyzeReportImportFile({
      buffer,
      fileName: file.name,
      fileSize: file.size,
      selectedCategory,
      templateId,
    });

    const assumptions = [
      ...analysis.assumptions,
      "O PDF final é gerado somente com linhas prontas para a categoria escolhida.",
      "O PDF final será gerado com base neste preview congelado até a expiração da sessão.",
    ];

    const session = await createReportImportSession({
      adminUid: adminAuth.uid,
      adminEmail: adminAuth.decoded?.email || null,
      fileName: analysis?.file?.name || file.name,
      fileSize: analysis?.file?.size || file.size,
      selectedCategory: analysis.selectedCategory,
      templateId: analysis?.selectedTemplate?.id || templateId || null,
      selectedTemplate: analysis.selectedTemplate,
      summary: analysis.summary,
      matchSummary: analysis.matchSummary,
      previewRows: analysis.previewRows,
      readyRows: analysis.readyRows,
      assumptions,
    });

    await logAdminAudit({
      req,
      actorUid: adminAuth.uid,
      actorEmail: adminAuth.decoded?.email || null,
      action: "report_import:analyze",
      status: "success",
      target: analysis?.selectedTemplate?.id || null,
      meta: {
        importSessionId: session.sessionId,
        fileName: analysis?.file?.name || file.name,
        fileSize: Number(analysis?.file?.size || file.size || 0),
        selectedCategory: Number(analysis?.selectedCategory || selectedCategory || 1),
        templateId: analysis?.selectedTemplate?.id || templateId || null,
        templateName: analysis?.selectedTemplate?.name || null,
        totalRows: Number(analysis?.summary?.totalRows || 0),
        readyRows: Array.isArray(analysis?.readyRows) ? analysis.readyRows.length : 0,
        matchSummary: analysis?.matchSummary || {},
        cleanupDeletedSessions: Number(session?.cleanup?.deleted || 0),
      },
    });

    return NextResponse.json({
      ok: true,
      importSessionId: session.sessionId,
      expiresAt: session.expiresAt,
      template: analysis.template,
      selectedTemplate: analysis.selectedTemplate,
      file: analysis.file,
      workbook: analysis.workbook,
      validation: analysis.validation,
      summary: analysis.summary,
      selectedCategory: analysis.selectedCategory,
      matchSummary: analysis.matchSummary,
      previewRows: analysis.previewRows,
      importedAt: analysis.importedAt,
      assumptions,
    });
  } catch (error) {
    if (error?.code === "invalid-template-headers") {
      await logAdminAudit({
        req,
        actorUid: adminAuth.uid,
        actorEmail: adminAuth.decoded?.email || null,
        action: "report_import:analyze",
        status: "rejected",
        target: null,
        meta: {
          reason: "invalid-template-headers",
          validation: error?.validation || null,
        },
      });

      return NextResponse.json(
        {
          ok: false,
          code: "invalid-template-headers",
          error: error?.message || "A planilha não corresponde ao template esperado.",
          validation: error?.validation || null,
        },
        { status: 400 }
      );
    }

    return adminError({
      req,
      auth: adminAuth,
      action: "report_import:analyze",
      err: error,
      meta: {
        selectedCategory: null,
      },
    });
  }
}
