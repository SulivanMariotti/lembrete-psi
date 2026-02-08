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

function makeUidFromEmail(email) {
  // UID determinístico para o mesmo email
  // (evita criar vários usuários diferentes para o mesmo paciente)
  const b64 = Buffer.from(email).toString("base64").replace(/=+$/, "");
  return `p_${b64}`.slice(0, 28); // 28 chars é seguro para UID
}

export async function POST(req) {
  try {
    const body = await req.json();
    const email = (body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
    }

    initAdmin();

    // ✅ Validação de autorização:
    // procura no "subscribers" (que seu Admin cadastra)
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

    // ✅ Garante perfil em users/{uid} (admin SDK bypass rules)
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

    // ✅ Token para login do paciente
    const token = await admin.auth().createCustomToken(uid, { role: "patient" });

    return NextResponse.json({ ok: true, token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message || "Erro" }, { status: 500 });
  }
}
