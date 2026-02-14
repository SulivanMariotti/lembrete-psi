import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { rateLimit } from "@/lib/server/rateLimit";
import { adminError } from "@/lib/server/adminError";

export const runtime = "nodejs";

function tsToIso(ts) {
  if (!ts) return null;
  try {
    // Firebase Admin Timestamp
    if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
    // Firestore Timestamp-like
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toISOString();
    // JS Date
    if (ts instanceof Date) return ts.toISOString();
    const parsed = Date.parse(String(ts));
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  } catch (_) {}
  return null;
}

/**
 * GET /api/admin/system/health
 *
 * Retorna dados de saúde do sistema para o Dashboard Admin.
 * Segurança:
 * - Authorization: Bearer <idToken> + role admin
 *
 * Firestore:
 * - system/health (doc)
 *   - lastBackup: { mode, id, at, ok, collectionsTotal, collectionsOk, collectionsError, documentsTotal }
 *   - updatedAt
 */
export async function GET(req) {
  let auth = null;
  try {
    auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const rl = await rateLimit(req, { bucket: "admin:system:health", uid: auth.uid, limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rl.res;


    const snap = await admin.firestore().collection("system").doc("health").get();
    const data = snap.exists ? snap.data() : null;

    const lastBackup = data?.lastBackup || null;

    return NextResponse.json(
      {
        ok: true,
        serverNow: new Date().toISOString(),
        health: {
          lastBackup: lastBackup
            ? {
                ...lastBackup,
                atIso: tsToIso(lastBackup.at),
              }
            : null,
          updatedAtIso: tsToIso(data?.updatedAt),
        },
      },
      { status: 200 }
    );
  } catch (e) {
    return adminError({ req, auth: auth?.ok ? auth : null, action: "system_health", err: e });
  }
}
