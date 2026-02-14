import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAuth } from "@/lib/server/requireAuth";

/**
 * requireAdmin(req)
 *
 * Padrão de segurança para rotas sensíveis (Admin):
 * - Exige Authorization: Bearer <idToken>
 * - Valida token via Firebase Admin
 * - Autoriza se:
 *   - decoded.role === 'admin'  OR decoded.admin === true
 *   - (fallback) users/{uid}.role === 'admin'
 *
 * Retorna { ok: true, uid, decoded } ou { ok: false, res }
 */

export async function requireAdmin(req) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  const decoded = auth.decoded;
  const uid = decoded.uid;

  const claimRole = String(decoded?.role || "").toLowerCase();
  const claimAdmin = decoded?.admin === true;
  if (claimRole === "admin" || claimAdmin) {
    return { ok: true, uid, decoded };
  }

  try {
    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    const user = userSnap.exists ? userSnap.data() : null;
    if (user?.role === "admin") {
      return { ok: true, uid, decoded };
    }
  } catch (_) {
    // ignore
  }

  return {
    ok: false,
    res: NextResponse.json({ ok: false, error: "Admin only." }, { status: 403 }),
  };
}
