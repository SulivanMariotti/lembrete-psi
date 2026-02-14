// src/app/api/admin/patient/pair-code/route.js
import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import crypto from "crypto";
export const runtime = "nodejs";

/**
 * POST /api/admin/patient/pair-code
 *
 * Gera um código único (não armazenado em texto puro) para o paciente vincular o aparelho.
 * - Armazena apenas hash + salt no users/{uid}
 * - Retorna o código UMA vez (para o Admin copiar e entregar ao paciente)
 *
 * Segurança:
 * - Se NEXT_PUBLIC_ADMIN_PANEL_SECRET estiver definido, exige header:
 *   x-admin-secret: <secret>
 *
 * Body:
 * { uid: string }
 *
 * Resposta:
 * { ok: true, uid, pairCode, last4 }
 */

function getServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_SERVICE_ACCOUNT(_B64) env var");
  return JSON.parse(raw);
}

function initAdmin() {
  if (admin.apps?.length) return;
  admin.initializeApp({ credential: admin.credential.cert(getServiceAccount()) });
}

function getAdminSecret() {
  return process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || "";
}

function assertAdminSecret(req) {
  const secret = getAdminSecret();
  if (!secret) return;
  const headerSecret = req.headers.get("x-admin-secret") || "";
  if (headerSecret !== secret) {
    const err = new Error("Unauthorized (missing/invalid x-admin-secret)");
    // @ts-ignore
    err.statusCode = 401;
    throw err;
  }
}

function generateReadableCode() {
  // 80 bits de entropia: suficiente para evitar brute force.
  // Formato amigável: XXXX-XXXX-XXXX (A-Z0-9, sem caracteres especiais).
  const raw = crypto.randomBytes(10).toString("base64");
  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const s = (clean + "000000000000").slice(0, 12);
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function jsonError(err) {
  const status = err?.statusCode || 500;
  return NextResponse.json(
    { ok: false, error: err?.message || "Unknown error", status },
    { status }
  );
}

export async function POST(req) {
  try {
    assertAdminSecret(req);

    const body = await req.json().catch(() => ({}));
    const uid = String(body?.uid || "").trim();
    if (!uid) return NextResponse.json({ ok: false, error: "uid obrigatório" }, { status: 400 });

    initAdmin();
    const db = admin.firestore();

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: "Paciente não encontrado." }, { status: 404 });
    }

    const d = snap.data() || {};
    const role = String(d?.role || "").toLowerCase();
    if (role && role !== "patient") {
      return NextResponse.json({ ok: false, error: "Usuário não é paciente." }, { status: 400 });
    }

    const pairCode = generateReadableCode();
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = sha256Hex(`${salt}:${pairCode}`);

    const now = admin.firestore.FieldValue.serverTimestamp();

    await userRef.set(
      {
        pairCodeHash: hash,
        pairCodeSalt: salt,
        pairCodeStatus: "active", // active|used|revoked
        pairCodeCreatedAt: now,
        pairCodeUsedAt: null,
        pairCodeLast4: pairCode.slice(-4),
        updatedAt: now,
      },
      { merge: true }
    );

    // Auditoria (opcional, mas útil)
    await db.collection("history").add({
      type: "patient_pair_code_issued",
      createdAt: now,
      payload: {
        uid,
        patientExternalId: d?.patientExternalId ?? null,
        phoneCanonical: d?.phoneCanonical ?? null,
        last4: pairCode.slice(-4),
      },
    });

    return NextResponse.json({
      ok: true,
      uid,
      pairCode,
      last4: pairCode.slice(-4),
    });
  } catch (err) {
    console.error(err);
    return jsonError(err);
  }
}