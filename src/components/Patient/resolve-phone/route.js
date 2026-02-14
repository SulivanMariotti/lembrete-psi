import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
/**
 * Resolve Phone (Paciente)
 *
 * Por que existe:
 * - O painel do paciente NÃO deve ler a coleção `subscribers` no client.
 * - As regras de `appointments` dependem do telefone do paciente (phone / phoneCanonical) para liberar leitura.
 * - Alguns cadastros antigos têm telefone apenas em `subscribers` (docId == phone).
 *
 * Fluxo:
 * - Recebe Authorization: Bearer <idToken>
 * - Valida o token (Admin SDK)
 * - Busca telefone no `users/{uid}`
 * - Fallback: busca `subscribers` por email
 *
 * Retorna: { ok: true, phone: "55..." }
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

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
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
    const email = String(decoded?.email || decoded?.token?.email || "").toLowerCase().trim();

    if (!uid) return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 401 });

    // 1) tenta pegar phone no perfil
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    const u = userDoc.exists ? userDoc.data() || {} : {};
    let phone = onlyDigits(u?.phone || u?.phoneNumber || u?.phoneCanonical || "");

    // 2) fallback: busca subscriber por email (docId costuma ser o phone)
    if (!phone && email) {
      const snap = await admin
        .firestore()
        .collection("subscribers")
        .where("email", "==", email)
        .limit(1)
        .get();
      const first = snap.docs?.[0];
      phone = onlyDigits(first?.id || first?.data()?.phone || "");
    }

    return NextResponse.json({ ok: true, phone: phone || "" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
