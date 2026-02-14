import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
export const runtime = "nodejs";
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

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

/**
 * Canonical phone for this project:
 * - DDD + número (10/11 dígitos)
 * - SEM 55
 */
function toPhoneCanonical(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d.slice(2);
  if (d.length === 10 || d.length === 11) return d;
  if (d.length > 11) return d.slice(-11);
  return d;
}

export async function POST(req) {
  try {
    initAdmin();

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const body = await req.json().catch(() => ({}));
    const phonesRaw = Array.isArray(body.phones) ? body.phones : [];
    const phones = phonesRaw.map(toPhoneCanonical).filter(Boolean);

    if (!phones.length) {
      return NextResponse.json({ ok: true, byPhone: {}, count: 0 });
    }

    const db = admin.firestore();
    const byPhone = {};

    const chunks = [];
    for (let i = 0; i < phones.length; i += 500) chunks.push(phones.slice(i, i + 500));

    for (const chunk of chunks) {
      const refs = chunk.map((p) => db.collection("subscribers").doc(p));
      const snaps = await db.getAll(...refs);
      snaps.forEach((snap) => {
        const phone = snap.id;
        const data = snap.exists ? snap.data() : null;
        byPhone[phone] = !!(data && data.pushToken);
      });
    }

    return NextResponse.json({ ok: true, byPhone, count: Object.keys(byPhone).length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || "status-batch failed" }, { status: 500 });
  }
}