import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/requireAdmin";
import { adminError } from "@/lib/server/adminError";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import { purgeExpiredReportImportSessions } from "@/lib/server/reportImportSessions";

export const runtime = "nodejs";

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:import:cleanup",
    limit: 20,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas limpezas em sequência. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const payload = await req.json().catch(() => ({}));
    const requestedLimit = Number(payload?.limit || 25);
    const cleanup = await purgeExpiredReportImportSessions({
      limit: Math.max(1, Math.min(requestedLimit, 100)),
      actorUid: auth.uid,
      actorSource: "admin-api",
    });

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_import:cleanup",
      status: "success",
      target: null,
      meta: {
        deleted: cleanup.deleted,
        scanned: cleanup.scanned,
        limit: requestedLimit,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: cleanup.deleted,
      scanned: cleanup.scanned,
    });
  } catch (err) {
    return adminError({
      req,
      auth,
      action: "report_import:cleanup",
      err,
      meta: null,
    });
  }
}
