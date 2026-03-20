
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/requireAdmin";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import { adminError } from "@/lib/server/adminError";
import {
  analyzeAdminExcelFile,
  ADMIN_ANALYSIS_UPLOAD_CONFIG,
  sanitizeAdminAnalysisFilters,
} from "@/lib/server/adminExcelAnalysis";

export const runtime = "nodejs";

function readJsonArrayField(formData, key) {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readBooleanField(formData, key, fallback = true) {
  const raw = String(formData.get(key) || "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

export async function POST(req) {
  let adminAuth = null;

  try {
    adminAuth = await requireAdmin(req);
    if (!adminAuth.ok) return adminAuth.res;

    const rl = await rateLimit(req, {
      bucket: "admin:analysis:excel-scan",
      limit: 12,
      windowMs: 60_000,
      uid: adminAuth.uid,
      errorMessage: "Muitos uploads em sequência. Aguarde um pouco e tente novamente.",
    });
    if (!rl.ok) return rl.res;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { ok: false, error: "Envie um arquivo .xlsx para análise." },
        { status: 400 }
      );
    }

    const fileName = String(file.name || "").trim();
    const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));

    if (!ADMIN_ANALYSIS_UPLOAD_CONFIG.acceptedExtensions.includes(extension)) {
      return NextResponse.json(
        { ok: false, error: "Formato inválido. Envie uma planilha .xlsx." },
        { status: 400 }
      );
    }

    if (Number(file.size || 0) > ADMIN_ANALYSIS_UPLOAD_CONFIG.maxFileSizeBytes) {
      return NextResponse.json(
        { ok: false, error: "Arquivo acima do limite permitido para esta análise." },
        { status: 400 }
      );
    }

    const filters = sanitizeAdminAnalysisFilters({
      statusMode: formData.get("statusMode"),
      statuses: readJsonArrayField(formData, "statuses"),
      dateFrom: formData.get("dateFrom"),
      dateTo: formData.get("dateTo"),
      ignorePatientMarkers: readJsonArrayField(formData, "ignorePatientMarkers"),
      ignoreEmptyPatientName: readBooleanField(formData, "ignoreEmptyPatientName", true),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = analyzeAdminExcelFile({
      buffer,
      fileName,
      fileSize: file.size,
      filters,
    });

    await logAdminAudit({
      req,
      actorUid: adminAuth.uid,
      actorEmail: adminAuth.decoded?.email || null,
      action: "admin_analysis:excel_scan",
      status: "success",
      target: analysis?.file?.name || fileName,
      meta: {
        fileName: analysis?.file?.name || fileName,
        fileSize: Number(analysis?.file?.size || file.size || 0),
        sheetName: analysis?.workbook?.sheetName || null,
        sheetCount: Number(analysis?.workbook?.sheetCount || 1),
        headerRowIndex: Number(analysis?.structure?.headerRowIndex || 1),
        columns: Number(analysis?.summary?.columns || 0),
        dataRows: Number(analysis?.summary?.dataRows || 0),
        analyzedRows: Number(analysis?.summary?.analyzedRows || 0),
        ignoredRows: Number(analysis?.summary?.ignoredRows || 0),
        filters: {
          statusMode: analysis?.filters?.statusMode || "all",
          statuses: analysis?.filters?.statuses || [],
          dateFrom: analysis?.filters?.dateFrom || "",
          dateTo: analysis?.filters?.dateTo || "",
          ignorePatientMarkers: analysis?.filters?.ignorePatientMarkers || [],
          ignoreEmptyPatientName: Boolean(analysis?.filters?.ignoreEmptyPatientName),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      analysis,
    });
  } catch (err) {
    return adminError({
      req,
      auth: adminAuth,
      action: "admin_analysis:excel_scan",
      err,
    });
  }
}
