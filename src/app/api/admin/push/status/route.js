import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { rateLimit } from "@/lib/server/rateLimit";
import { adminError } from "@/lib/server/adminError";
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

export async function GET(req) {
  let auth = null;
  try {
    initAdmin();

    auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;
    const uid = auth.uid;

    const rl = await rateLimit(req, { bucket: "admin:push:status", uid, limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rl.res;


    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : null;

    const phone = onlyDigits(userData?.phone || userData?.phoneNumber || "");
    if (!phone) {
      return NextResponse.json({ ok: true, hasToken: false, reason: "missing_phone" });
    }

    const subSnap = await admin.firestore().collection("subscribers").doc(phone).get();
    const sub = subSnap.exists ? subSnap.data() : null;

    return NextResponse.json({
      ok: true,
      hasToken: Boolean(sub?.pushToken),
      status: sub?.status || null,
      phone,
    });
  } catch (e) {
    return adminError({ req, auth: auth?.ok ? auth : null, action: "push_status", err: e });
  }
}