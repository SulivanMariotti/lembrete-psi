import { NextResponse } from "next/server";
import admin from "firebase-admin";

/**
 * POST /api/admin/patient/register
 *
 * Cria/edita paciente (whitelist):
 * - users/{uid} (perfil + contrato + patientExternalId)
 * - subscribers/{phoneCanonical} (pushToken/metadata) — paciente NÃO lê no client
 *
 * Payload:
 * { name, email, phone, patientExternalId?, previousPhoneCanonical?, previousEmail? }
 *
 * phoneCanonical padrão: DDD+número (10/11) sem 55
 */

function getServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_SERVICE_ACCOUNT(_B64) env var");
  return JSON.parse(raw);
}

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({ credential: admin.credential.cert(getServiceAccount()) });
}

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function normalizePhoneCanonical(input) {
  let d = onlyDigits(input).replace(/^0+/, "");
  if (!d) return "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d;
}

export async function POST(req) {
  try {
    initAdmin();

    const adminSecret = req.headers.get("x-admin-secret") || "";
    const requiredSecret = process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || "";
    if (requiredSecret && adminSecret !== requiredSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phoneCanonical = normalizePhoneCanonical(body.phone);

    const patientExternalId = String(body.patientExternalId || "").trim() || null;

    const previousPhoneCanonical = normalizePhoneCanonical(body.previousPhoneCanonical || "");
    const previousEmail = String(body.previousEmail || "").trim().toLowerCase();

    if (!name || !email || !(phoneCanonical.length === 10 || phoneCanonical.length === 11)) {
      return NextResponse.json({ ok: false, error: "Dados inválidos" }, { status: 400 });
    }

    const db = admin.firestore();
    const auth = admin.auth();
    const nowTs = admin.firestore.Timestamp.now();

    // Upsert user in Auth (by email)
    let userRecord = null;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (_) {
      userRecord = await auth.createUser({ email, displayName: name, disabled: false });
    }

    const uid = userRecord.uid;

    // Write users/{uid}
    await db.collection("users").doc(uid).set(
      {
        uid,
        name,
        email,
        phoneCanonical,
        patientExternalId, // 🔥 novo: ID do paciente (sistema atual)
        status: "active",
        updatedAt: nowTs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // subscribers/{phoneCanonical}
    await db.collection("subscribers").doc(phoneCanonical).set(
      {
        phoneCanonical,
        status: "active",
        // pushToken fica sendo registrado pelo /api/patient/push/register
        updatedAt: nowTs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Handle merge markers when changing email/phone
    if (previousEmail && previousEmail !== email) {
      // mark previous user (if exists) as merged (soft marker)
      try {
        const prev = await auth.getUserByEmail(previousEmail);
        await db.collection("users").doc(prev.uid).set(
          { status: "merged", mergedTo: uid, updatedAt: nowTs },
          { merge: true }
        );
      } catch (_) {}
    }

    if (previousPhoneCanonical && previousPhoneCanonical !== phoneCanonical) {
      await db.collection("subscribers").doc(previousPhoneCanonical).set(
        { status: "merged", mergedTo: phoneCanonical, updatedAt: nowTs },
        { merge: true }
      );
    }

    await db.collection("history").add({
      type: "patient_register",
      createdAt: nowTs,
      uid,
      phoneCanonical,
      email,
      patientExternalId,
    });

    return NextResponse.json({ ok: true, uid, phoneCanonical }, { status: 200 });
  } catch (e) {
    console.error("POST /api/admin/patient/register error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
