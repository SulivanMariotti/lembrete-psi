import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/requireAdmin";
import { adminError } from "@/lib/server/adminError";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import {
  getReportImportSession,
  assertReportImportSessionAccess,
  markReportImportSessionPdfGenerated,
} from "@/lib/server/reportImportSessions";
import { buildReportPdf } from "@/lib/server/reportPdfBuilder";

export const runtime = "nodejs";

function buildFilename(fileName, selectedCategory) {
  const base = String(fileName || "relatorios")
    .replace(/\.[^.]+$/, "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "relatorios"}-categoria-${selectedCategory}.pdf`;
}

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:pdf:generate",
    limit: 20,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas gerações de PDF. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const payload = await req.json().catch(() => ({}));
    const importSessionId = String(payload?.importSessionId || "").trim();

    if (!importSessionId) {
      return NextResponse.json(
        {
          ok: false,
          code: "missing-import-session-id",
          error: "Informe a sessão congelada do preview antes de gerar o PDF.",
        },
        { status: 400 }
      );
    }

    const session = await getReportImportSession(importSessionId);
    assertReportImportSessionAccess(session, auth.uid);

    if (!session?.readyRows?.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Nenhuma linha pronta para PDF. Revise a Especialidade, a Demanda da planilha (com fallback em Tags nas especialidades em modo excel), o modelo e a categoria escolhida.",
          matchSummary: session?.matchSummary || null,
        },
        { status: 400 }
      );
    }

    const readyRows = Array.isArray(session.readyRows) ? session.readyRows : [];
    const totalRows = Number(session?.summary?.totalRows || 0);
    const skippedRows = Math.max(0, totalRows - readyRows.length);

    const pdfBuffer = buildReportPdf({
      rows: readyRows,
      selectedCategory: Number(session.selectedCategory || 1),
      selectedTemplate: session.selectedTemplate || null,
      generatedAt: new Date(),
    });

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_pdf:generate",
      status: "success",
      target: session?.selectedTemplate?.id || null,
      meta: {
        importSessionId,
        fileName: String(session?.fileName || ""),
        selectedCategory: Number(session?.selectedCategory || 1),
        templateId: session?.selectedTemplate?.id || null,
        templateName: session?.selectedTemplate?.name || null,
        readyRows: readyRows.length,
        skippedRows,
        snapshotVersion: Number(session?.snapshotVersion || 1),
      },
    });

    await markReportImportSessionPdfGenerated(importSessionId, {
      adminUid: auth.uid,
      templateId: session?.selectedTemplate?.id || null,
      snapshotVersion: Number(session?.snapshotVersion || 1),
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildFilename(
          session?.fileName,
          Number(session?.selectedCategory || 1)
        )}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
        "X-Report-Ready-Rows": String(readyRows.length),
        "X-Report-Skipped-Rows": String(skippedRows),
        "X-Report-Import-Session-Id": importSessionId,
      },
    });
  } catch (error) {
    if (error?.code === "report-import-session-not-found") {
      return NextResponse.json(
        { ok: false, code: error.code, error: error?.message || "Sessão de importação não encontrada." },
        { status: 404 }
      );
    }

    if (error?.code === "report-import-session-forbidden") {
      return NextResponse.json(
        { ok: false, code: error.code, error: error?.message || "A sessão não pertence a este administrador." },
        { status: 403 }
      );
    }

    if (error?.code === "report-import-session-expired") {
      return NextResponse.json(
        { ok: false, code: error.code, error: error?.message || "A sessão de importação expirou." },
        { status: 410 }
      );
    }

    return adminError({
      req,
      auth,
      action: "report_pdf:generate",
      err: error,
      meta: {
        selectedCategory: null,
      },
    });
  }
}
