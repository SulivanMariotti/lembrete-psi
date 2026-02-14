import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { rateLimit } from "@/lib/server/rateLimit";
import { adminError } from "@/lib/server/adminError";

export const runtime = "nodejs";
/**
 * GET /api/admin/attendance/summary?days=7|30|90
 *
 * Server-side (Admin SDK) para evitar "Missing or insufficient permissions" no client.
 * Retorna estatísticas agregadas de attendance_logs no período.
 */

function getServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    return JSON.parse(json);
  }
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_SERVICE_ACCOUNT(_B64) env var");
  return JSON.parse(raw);
}

function initAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = getServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function clampDays(val) {
  const n = Number(val);
  return [7, 30, 90].includes(n) ? n : 7;
}

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase().trim();
  if (["present", "confirmed", "attended", "ok", "compareceu", "presente"].includes(v)) return "present";
  if (["absent", "missed", "faltou", "falta", "no_show", "noshow"].includes(v)) return "absent";
  return "unknown";
}

function pickTimestamp(data) {
  const ts = data.createdAt || data.date || data.sessionAt || data.updatedAt || null;
  return ts && typeof ts.toDate === "function" ? ts.toDate() : null;
}

export async function GET(req) {
  let auth = null;
  try {
    initAdmin();

    auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const rl = await rateLimit(req, {
      bucket: "admin:attendance:summary",
      uid: auth.uid,
      limit: 120,
      windowMs: 60_000,
    });
    if (!rl.ok) return rl.res;

    const { searchParams } = new URL(req.url);
    const days = clampDays(searchParams.get("days"));
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const startTs = admin.firestore.Timestamp.fromDate(startDate);

    const db = admin.firestore();

    // Estratégia:
    // 1) Tenta query por createdAt com range.
    // 2) Tenta por date com range.
    // 3) Fallback: pega últimos 1000 por createdAt e filtra em memória.
    let snaps = null;

    try {
      snaps = await db
        .collection("attendance_logs")
        .where("createdAt", ">=", startTs)
        .orderBy("createdAt", "desc")
        .get();
    } catch (_) {
      try {
        snaps = await db
          .collection("attendance_logs")
          .where("date", ">=", startTs)
          .orderBy("date", "desc")
          .get();
      } catch (_) {
        snaps = await db.collection("attendance_logs").orderBy("createdAt", "desc").limit(1000).get();
      }
    }

    let present = 0;
    let absent = 0;

    // faltas por paciente (phoneCanonical)
    const missesByPhone = new Map();

    for (const doc of snaps.docs) {
      const data = doc.data() || {};
      const dt = pickTimestamp(data);

      // no fallback sem range, filtra pelo período
      if (dt && dt < startDate) continue;

      const status = normalizeStatus(data.status || data.state);
      const phoneCanonical = String(data.phoneCanonical || data.phone || data.patientPhone || "").trim();

      if (status === "present") present += 1;
      if (status === "absent") {
        absent += 1;
        if (phoneCanonical) {
          missesByPhone.set(phoneCanonical, (missesByPhone.get(phoneCanonical) || 0) + 1);
        }
      }
    }

    const total = present + absent;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    const topMisses = Array.from(missesByPhone.entries())
      .map(([phoneCanonical, misses]) => ({ phoneCanonical, misses }))
      .sort((a, b) => b.misses - a.misses)
      .slice(0, 10);

    return NextResponse.json(
      { ok: true, days, present, absent, total, attendanceRate, topMisses },
      { status: 200 }
    );
  } catch (e) {
    return adminError({ req, auth: auth?.ok ? auth : null, action: "attendance_summary", err: e });
  }
}
