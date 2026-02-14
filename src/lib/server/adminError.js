import { NextResponse } from "next/server";
import { logAdminAudit } from "@/lib/server/auditLog";

function makeRequestId() {
  // Prefer global crypto if available
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch (_) {
    // ignore
  }
  // Fallback
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeString(v, max = 240) {
  const s = String(v ?? "");
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

/**
 * adminError
 *
 * - NÃO vaza detalhes técnicos para o cliente.
 * - Loga no console (server) e registra no audit_logs como status=error.
 * - Retorna um requestId para rastrear nos logs.
 */
export async function adminError({ req, auth = null, action = "admin_api_error", err = null, meta = null }) {
  const requestId = makeRequestId();

  // Log detalhado apenas no server
  try {
    // eslint-disable-next-line no-console
    console.error(`[ADMIN_API_ERROR] ${action} ${requestId}`, err);
  } catch (_) {
    // ignore
  }

  // Audit log (best-effort)
  await logAdminAudit({
    req,
    actorUid: auth?.uid || null,
    actorEmail: auth?.decoded?.email || null,
    action: `error:${String(action || "admin_api_error").slice(0, 110)}`,
    status: "error",
    target: meta?.target || null,
    meta: {
      requestId,
      reason: safeString(err?.message || err || "unknown", 400),
      ...(meta && typeof meta === "object" ? meta : {}),
    },
  });

  return NextResponse.json(
    {
      ok: false,
      error: "Ocorreu um erro. Tente novamente.",
      requestId,
    },
    { status: 500 }
  );
}

export function forbiddenOrigin() {
  return NextResponse.json(
    { ok: false, error: "Acesso bloqueado (origem inválida)." },
    { status: 403 }
  );
}

export function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Não autorizado." },
    { status: 401 }
  );
}
