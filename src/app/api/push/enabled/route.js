import { NextResponse } from "next/server";
import admin from "firebase-admin";
import crypto from "crypto";

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

function sha256(input) {
  return crypto.createHash("sha256").update(String(input || ""), "utf8").digest("hex");
}

export async function POST(req) {
  try {
    initAdmin();

    // Auth: Bearer <firebase idToken>
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];

    if (!idToken) {
      return NextResponse.json({ ok: false, error: "Missing Authorization token." }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded?.uid;

    if (!uid) {
      return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone || "").replace(/\D/g, "");
    const token = String(body?.token || "");

    if (!phone) return NextResponse.json({ ok: false, error: "Missing phone." }, { status: 400 });
    if (!token) return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });

    // ✅ Não salvar o token bruto em logs. Apenas hash + sufixo para auditoria.
    const tokenHash = sha256(token);
    const tokenTail = token.length >= 8 ? token.slice(-8) : token;

    const payload = {
      type: "push_enabled",
      patientId: uid,
      phone,
      tokenHash,
      tokenTail,
      userAgent: req.headers.get("user-agent") || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("history").add(payload);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message || "Erro" }, { status: 500 });
  }
}
