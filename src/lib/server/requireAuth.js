import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

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
      return {
        ok: false,
        res: NextResponse.json({ ok: false, error: "Missing Authorization token." }, { status: 401 }),
      };
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded?.uid) {
      return {
        ok: false,
        res: NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 }),
      };
    }

    return { ok: true, decoded };
  } catch (_) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 }),
    };
  }
}
