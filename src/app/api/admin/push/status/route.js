import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
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
  try {
    initAdmin();

    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];

    if (!idToken) {
      return NextResponse.json({ ok: false, error: "Missing Authorization token." }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded?.uid;
    if (!uid) return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 });

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
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}