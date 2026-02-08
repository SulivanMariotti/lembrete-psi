import { NextResponse } from "next/server";
import admin from "firebase-admin";

function initAdmin() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_SERVICE_ACCOUNT env var");

  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const password = body?.password || "";

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD not set" }, { status: 500 });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Senha inválida" }, { status: 401 });
    }

    const adminUid = process.env.ADMIN_UID;
    if (!adminUid) {
      return NextResponse.json({ ok: false, error: "ADMIN_UID not set" }, { status: 500 });
    }

    initAdmin();

    const token = await admin.auth().createCustomToken(adminUid, { role: "admin" });

    return NextResponse.json({ ok: true, token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message || "Erro" }, { status: 500 });
  }
}
