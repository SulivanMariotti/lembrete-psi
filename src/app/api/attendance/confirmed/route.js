import { NextResponse } from "next/server";
import admin from "firebase-admin";

/**
 * GET /api/attendance/confirmed
 *
 * Objetivo:
 * - Evitar 404 no PatientFlow.
 * - Responder de forma segura se existe confirmação de presença para uma sessão.
 *
 * Como usar (query params):
 * - appointmentId: string (recomendado)
 * - phoneCanonical: string (opcional; padrão do projeto: DDD+número, sem 55)
 *
 * Retorno:
 * { ok: true, confirmed: boolean, reason?: string }
 *
 * Observação clínica/produto:
 * - Não cria reagendamento/cancelamento.
 * - Apenas informa status de presença.
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
  if (admin.apps.length) return;
  const serviceAccount = getServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export async function GET(req) {
  try {
    initAdmin();

    const { searchParams } = new URL(req.url);
    const appointmentId = (searchParams.get("appointmentId") || "").trim();
    const phoneCanonical = (searchParams.get("phoneCanonical") || "").trim();

    // ✅ Se o front ainda não envia params, não quebrar o fluxo (evita loops/erros)
    if (!appointmentId && !phoneCanonical) {
      return NextResponse.json(
        { ok: true, confirmed: false, reason: "missing_params" },
        { status: 200 }
      );
    }

    const db = admin.firestore();

    // Estratégia:
    // 1) Se tiver appointmentId, procurar logs por appointmentId (mais preciso).
    // 2) Se não tiver, mas tiver phoneCanonical, procurar por último status "present/confirmed".
    //    (depende do seu modelo; aqui é um fallback seguro).
    let confirmed = false;

    if (appointmentId) {
      // Tentativas de campos comuns (suporta variações sem quebrar)
      const q1 = await db
        .collection("attendance_logs")
        .where("appointmentId", "==", appointmentId)
        .limit(1)
        .get();

      if (!q1.empty) {
        const data = q1.docs[0].data() || {};
        const status = String(data.status || data.state || "").toLowerCase();
        confirmed = status === "present" || status === "confirmed" || status === "attended" || status === "ok";
      } else {
        // fallback: alguns modelos guardam em "appointments" com flag de presença
        const apptSnap = await db.collection("appointments").doc(appointmentId).get();
        if (apptSnap.exists) {
          const data = apptSnap.data() || {};
          confirmed = Boolean(data.attendanceConfirmed || data.confirmed || data.present);
        }
      }
    } else if (phoneCanonical) {
      const q2 = await db
        .collection("attendance_logs")
        .where("phoneCanonical", "==", phoneCanonical)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!q2.empty) {
        const data = q2.docs[0].data() || {};
        const status = String(data.status || data.state || "").toLowerCase();
        confirmed = status === "present" || status === "confirmed" || status === "attended" || status === "ok";
      }
    }

    return NextResponse.json({ ok: true, confirmed }, { status: 200 });
  } catch (e) {
    console.error("GET /api/attendance/confirmed error:", e);
    // Retornar 200 com ok:false evita loops no client e mantém UX estável.
    return NextResponse.json(
      { ok: false, confirmed: false, error: e?.message || "Erro" },
      { status: 200 }
    );
  }
}
