import { NextResponse } from "next/server";
import admin from "firebase-admin";

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

function makeUidFromEmail(email) {
  const b64 = Buffer.from(email).toString("base64").replace(/=+$/, "");
  return `p_${b64}`.slice(0, 28);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const email = (body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
    }

    initAdmin();

    const snap = await admin
      .firestore()
      .collection("subscribers")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { ok: false, error: "E-mail não autorizado. Solicite cadastro à clínica." },
        { status: 403 }
      );
    }

    const subDoc = snap.docs[0].data();

    const uid = makeUidFromEmail(email);
    const name = subDoc?.name || "";
    const phone = String(subDoc?.phone || "").replace(/\D/g, "");

    await admin.firestore().collection("users").doc(uid).set(
      {
        uid,
        email,
        name,
        phone,
        role: "patient",
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // ✅ IMPORTANTE: incluir email como claim no custom token
    const token = await admin.auth().createCustomToken(uid, { role: "patient", email });

    return NextResponse.json({ ok: true, token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message || "Erro" }, { status: 500 });
  }
}

