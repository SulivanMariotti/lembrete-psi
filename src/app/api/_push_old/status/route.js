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
    const email = (decoded?.email || "").toLowerCase().trim();

    if (!uid) return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 });

    // 1) tenta pegar phone no perfil
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    let phone = String(userDoc.data()?.phone || "").replace(/\D/g, "");

    // 2) fallback: busca subscriber por email
    if (!phone && email) {
      const snap = await admin.firestore().collection("subscribers").where("email", "==", email).limit(1).get();
      const first = snap.docs?.[0];
      phone = first?.id ? String(first.id).replace(/\D/g, "") : "";
    }

    if (!phone) {
      return NextResponse.json({ ok: true, hasToken: false });
    }

    const subDoc = await admin.firestore().collection("subscribers").doc(phone).get();
    const hasToken = Boolean(subDoc.exists && subDoc.data()?.pushToken);

    return NextResponse.json({ ok: true, hasToken });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}