import admin from "@/lib/firebaseAdmin";
import { unauthorized } from "@/lib/server/adminError";

/**
 * requireAuth(req)
 *
 * - Exige Authorization: Bearer <idToken>
 * - Valida o token via Firebase Admin
 * - Retorna { ok: true, decoded } ou { ok: false, res }
 */

export async function requireAuth(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1]?.trim();

    if (!idToken) {
      return { ok: false, res: unauthorized() };
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded?.uid) {
      return { ok: false, res: unauthorized() };
    }

    return { ok: true, decoded };
  } catch (_) {
    return { ok: false, res: unauthorized() };
  }
}
