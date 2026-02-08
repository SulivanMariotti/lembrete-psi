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

export async function GET(req) {
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

    // Busca confirmações feitas pelo paciente (eventType=patient_confirmed)
    const snap = await admin
      .firestore()
      .collection("attendance_logs")
      .where("patientId", "==", uid)
      .where("eventType", "==", "patient_confirmed")
      .limit(500)
      .get();

    const appointmentIds = [];
    snap.forEach((d) => {
      const v = d.data();
      if (v?.appointmentId) appointmentIds.push(String(v.appointmentId));
    });

    return NextResponse.json({ ok: true, appointmentIds });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message || "Erro" }, { status: 500 });
  }
}
