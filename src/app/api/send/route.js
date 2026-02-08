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

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

// ✅ Agora pega a mensagem correta do seu parseCSV (messageBody)
function pickMessage(item) {
  return (
    item?.messageBody ||              // <-- seu parseCSV
    item?.message ||
    item?.msg ||
    item?.text ||
    item?.body ||
    item?.notificationBody ||
    ""
  ).toString().trim();
}

export async function POST(req) {
  try {
    initAdmin();

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ ok: false, error: "Nenhum item para envio." }, { status: 400 });
    }

    const db = admin.firestore();
    const messaging = admin.messaging();

    let sent = 0;
    let skippedNoPhone = 0;
    let skippedNoMessage = 0;
    let skippedNoToken = 0;
    let errors = [];

    for (const item of items) {
      try {
        const phone = onlyDigits(item.cleanPhone || item.phone || "");
        if (!phone) {
          skippedNoPhone++;
          continue;
        }

        const messageText = pickMessage(item);
        if (!messageText) {
          skippedNoMessage++;
          continue;
        }

        // ✅ prioridade: token que já veio do parseCSV (subscribers.pushToken)
        let token = (item.pushToken || "").toString().trim();

        // ✅ fallback: buscar no Firestore pelo doc subscribers/{phone}
        if (!token) {
          const subSnap = await db.collection("subscribers").doc(phone).get();
          token = subSnap.exists ? (subSnap.data()?.pushToken || "").toString().trim() : "";
        }

        if (!token) {
          skippedNoToken++;
          continue;
        }

        const payload = {
          token,
          notification: {
            title: "Lembrete Psi",
            body: messageText,
          },
          data: {
            type: "appointment_reminder",
            reminderType: String(item.reminderType || ""),
            phone,
            nome: String(item.nome || ""),
            date: String(item.data || item.date || ""),
            time: String(item.hora || item.time || ""),
            profissional: String(item.profissional || ""),
          },
        };

        await messaging.send(payload);
        sent++;
      } catch (e) {
        errors.push(String(e?.message || e));
      }
    }

    const types = [...new Set(items.map((i) => i.reminderType).filter(Boolean))].map(String);

    await db.collection("history").add({
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      count: sent,
      skipped: {
        noPhone: skippedNoPhone,
        noMessage: skippedNoMessage,
        noToken: skippedNoToken,
      },
      types,
      summary: `Envio push: ${sent} enviados | sem tel: ${skippedNoPhone} | sem msg: ${skippedNoMessage} | sem token: ${skippedNoToken}`,
      errors: errors.slice(0, 10),
    });

    if (sent === 0) {
      // ✅ mensagem mais verdadeira do motivo
      const reason =
        skippedNoToken > 0
          ? "Nenhum token fornecido."
          : skippedNoMessage > 0
          ? "Nenhuma mensagem gerada para envio."
          : "Nada para enviar.";

      return NextResponse.json(
        { ok: false, error: reason, sent, skippedNoPhone, skippedNoMessage, skippedNoToken },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      sent,
      skippedNoPhone,
      skippedNoMessage,
      skippedNoToken,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message || "Erro" }, { status: 500 });
  }
}
