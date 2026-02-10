// src/app/api/patient/login/route.js
import { NextResponse } from "next/server";
import admin from "firebase-admin";

/**
 * Patient Login (email) - server-side (Firebase Admin)
 *
 * BUGFIX:
 * - Antes, validava o acesso em `subscribers` e criava um uid "p_base64(email)" em `users`,
 *   gerando inconsistências e impedindo acesso quando o Admin cadastrava só em `users`.
 *
 * Agora:
 * - Autoriza o acesso consultando `users` (role == "patient") pelo email cadastrado no Admin
 * - Bloqueia se paciente estiver inativo (status != active, ou flags deletedAt/disabledAt/isActive=false/disabled=true)
 * - Usa o UID REAL (docId do Firestore / uid do Auth quando for o caso) para gerar o custom token
 * - Atualiza lastLogin e updatedAt
 *
 * Resposta:
 *   { ok: true, token, uid }
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

function isInactiveUser(u) {
  const status = String(u?.status ?? "active").toLowerCase().trim();
  if (["inactive", "disabled", "archived", "deleted"].includes(status)) return true;
  if (u?.isActive === false) return true;
  if (u?.disabled === true) return true;
  if (u?.deletedAt) return true;
  if (u?.disabledAt) return true;
  if (u?.mergedTo) return true;
  return false;
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  const n = Date.parse(String(ts));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
    }

    initAdmin();

    // Authorize based on users collection (Admin cadastro)
    const q = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "patient")
      .where("email", "==", email)
      .get();

    if (q.empty) {
      return NextResponse.json(
        { ok: false, error: "E-mail não autorizado. Solicite cadastro à clínica." },
        { status: 403 }
      );
    }

    // If multiple docs exist, prefer the most recently updated
    let chosen = null;
    q.forEach((doc) => {
      const data = doc.data() || {};
      const candidate = { id: doc.id, data };
      if (!chosen) {
        chosen = candidate;
        return;
      }
      const a = toMillis(chosen.data?.updatedAt) || toMillis(chosen.data?.createdAt);
      const b = toMillis(data?.updatedAt) || toMillis(data?.createdAt);
      if (b >= a) chosen = candidate;
    });

    const uid = chosen.id;
    const userData = chosen.data || {};

    if (isInactiveUser(userData)) {
      return NextResponse.json(
        { ok: false, error: "Cadastro inativo. Fale com a clínica para reativação." },
        { status: 403 }
      );
    }

    // Update lastLogin (server timestamp)
    const now = admin.firestore.FieldValue.serverTimestamp();
    await admin.firestore().collection("users").doc(uid).set(
      {
        lastLogin: now,
        updatedAt: now,
      },
      { merge: true }
    );

    // Custom token with claims (keeps email for client convenience)
    const token = await admin.auth().createCustomToken(uid, { role: "patient", email });

    return NextResponse.json({ ok: true, token, uid });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
