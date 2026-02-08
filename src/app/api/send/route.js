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

function pickMessage(item) {
  // tenta campos comuns vindo do parseCSV
  return (
    item?.message ||
    item?.msg ||
    item?.text ||
    item?.body ||
    item?.notificationBody ||
    ""
  );
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
    let skipped = 0;
    let errors = [];

    // Envia 1 a 1 (mais fácil de debugar). Depois podemos otimizar para batch.
    for (const item of items) {
      try {
        const phone = onlyDigits(item.cleanPhone || item.phone || "");
        if (!phone) {
          skipped++;
          continue;
        }

        // ✅ Busca token direto do Firestore (fonte de verdade)
        const subRef = db.collection("subscribers").doc(phone);
        const subSnap = await subRef.get();

        const token = subSnap.exists ? subSnap.data()?.pushToken : null;

        if (!token) {
          // não quebra o envio geral; apenas pula esse paciente
          skipped++;
          continue;
        }

        const messageText = pickMessage(item);
        if (!messageText) {
          skipped++;
          continue;
        }

        // Notification + data (data é útil para debug / abrir tela no futuro)
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

    // Log em history (admin-only)
    const types = [...new Set(items.map((i) => i.reminderType).filter(Boolean))].map(String);

    await db.collection("history").add({
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      count: sent,
      skipped,
      types,
      summary: `Envio push: ${sent} enviados, ${skipped} ignorados.`,
      errors: errors.slice(0, 10), // limita tamanho do log
    });

    if (sent === 0) {
      // Mantém a mensagem que você já viu, mas agora com motivo correto
      return NextResponse.json(
        {
          ok: false,
          error: "Nenhum token fornecido.",
          sent,
          skipped,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, sent, skipped });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message || "Erro" }, { status: 500 });
  }
}
