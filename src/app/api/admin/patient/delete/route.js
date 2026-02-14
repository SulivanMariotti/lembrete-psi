// src/app/api/admin/patient/delete/route.js
import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
export const runtime = "nodejs";
/**
 * Admin server-side: desativar (soft-delete) paciente
 *
 * Endpoint: POST /api/admin/patient/delete
 * Proteção: header x-admin-secret == env ADMIN_PANEL_SECRET
 *
 * BUGFIX URGENTE:
 * - Antes, o endpoint criava um NOVO doc em users/{p_base64(email)} ao invés de atualizar
 *   o doc real (uid do Firebase Auth / docId existente), gerando "2 registros" no users:
 *   1) o doc real continua status=active
 *   2) o doc "p_base64" fica inactive
 *   Resultado: o paciente NÃO some da lista.
 *
 * Agora, o endpoint:
 * - Atualiza SEMPRE o doc real:
 *   1) Se body.uid vier, usa esse docId
 *   2) Senão, tenta localizar por email / phoneCanonical / patientExternalId (query) e atualiza TODOS os matches
 * - Também marca subscribers/{phoneCanonical} como inactive
 * - Loga em history
 *
 * Observação:
 * - Não deleta docs para preservar histórico (appointments, attendance_logs, patient_notes).
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
  if (admin.apps?.length) return;
  const serviceAccount = getServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePhoneCanonical(input) {
  let d = onlyDigits(input).replace(/^0+/, "");
  if (!d) return "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d;
}

async function findUserDocIds(db, { uid, email, phoneCanonical, patientExternalId }) {
  const ids = new Set();

  if (uid) ids.add(uid);

  // Try by email
  if (email) {
    const q = await db
      .collection("users")
      .where("role", "==", "patient")
      .where("email", "==", email)
      .get();
    q.forEach((d) => ids.add(d.id));
  }

  // Try by phoneCanonical
  if (phoneCanonical) {
    const q = await db
      .collection("users")
      .where("role", "==", "patient")
      .where("phoneCanonical", "==", phoneCanonical)
      .get();
    q.forEach((d) => ids.add(d.id));
  }

  // Try by patientExternalId
  if (patientExternalId) {
    const q = await db
      .collection("users")
      .where("role", "==", "patient")
      .where("patientExternalId", "==", String(patientExternalId))
      .get();
    q.forEach((d) => ids.add(d.id));
  }

  return Array.from(ids);
}

export async function POST(req) {
  try {
    initAdmin();

    const secret = req.headers.get("x-admin-secret") || "";
    const expected = process.env.ADMIN_PANEL_SECRET || "";
    if (!expected || secret !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const uid = String(body?.uid || "").trim() || null;
    const email = String(body?.email || "").trim().toLowerCase() || null;
    const patientExternalId = String(body?.patientExternalId || "").trim() || null;

    const phoneCanonical = normalizePhoneCanonical(
      body?.phoneCanonical || body?.phone || ""
    ) || null;

    const reason = String(body?.reason || "admin_ui_remove").trim();

    if (!uid && !phoneCanonical && !email && !patientExternalId) {
      return NextResponse.json(
        { ok: false, error: "Missing uid or phoneCanonical or email or patientExternalId" },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // 1) Soft-delete subscriber
    if (phoneCanonical) {
      await db.collection("subscribers").doc(phoneCanonical).set(
        {
          status: "inactive",
          inactiveReason: reason,
          deletedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    // 2) Soft-delete user(s) REAL doc(s)
    const userDocIds = await findUserDocIds(db, { uid, email, phoneCanonical, patientExternalId });

    if (!userDocIds.length) {
      // No match found; still log so you can track the attempt
      await db.collection("history").add({
        type: "patient_deactivate_not_found",
        uid: uid || null,
        email: email || null,
        phoneCanonical: phoneCanonical || null,
        patientExternalId: patientExternalId || null,
        reason,
        createdAt: now,
      });

      return NextResponse.json(
        { ok: false, error: "User not found in users collection", userDocIds: [] },
        { status: 404 }
      );
    }

    // Update all matches (handles duplicates)
    await Promise.all(
      userDocIds.map((docId) =>
        db.collection("users").doc(docId).set(
          {
            status: "inactive",
            inactiveReason: reason,
            deletedAt: now,
            updatedAt: now,
          },
          { merge: true }
        )
      )
    );

    await db.collection("history").add({
      type: "patient_deactivate",
      userDocIds,
      uid: uid || null,
      email: email || null,
      phoneCanonical: phoneCanonical || null,
      patientExternalId: patientExternalId || null,
      reason,
      createdAt: now,
    });

    return NextResponse.json({ ok: true, userDocIds, phoneCanonical, email, patientExternalId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}