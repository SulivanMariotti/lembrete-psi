import { NextResponse } from "next/server";
import admin from "firebase-admin";

/**
 * PASSO 32/45 — Disparar lembretes (server-side) usando templates msg1/msg2/msg3
 *
 * Endpoint: POST /api/admin/reminders/send
 * Proteção: header x-admin-secret == env ADMIN_PANEL_SECRET
 *
 * Body:
 * {
 *   uploadId?: string | null,
 *   reminders: Array<{
 *     appointmentId?: string|null,
 *     phoneCanonical: string,
 *     patientName?: string,
 *     startISO?: string|null,
 *     reminderType?: string|null, // 'slot1' | 'slot2' | 'slot3' | legado '48h'/'24h'/'12h'
 *     serviceType?: string,
 *     location?: string
 *   }>
 * }
 *
 * Compatibilidade:
 * - Preferência: msg1/msg2/msg3
 * - Fallback: msg48h/msg24h/msg12h
 *
 * Envio:
 * - Algumas versões do firebase-admin não expõem messaging().sendAll()
 * - Este endpoint tenta sendAll -> sendEach -> fallback send() com concorrência limitada.
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

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function normalizePhoneCanonical(input) {
  let d = onlyDigits(input).replace(/^0+/, "");
  if (!d) return "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d;
}

function safeDateParts(startISO) {
  const s = String(startISO || "");
  const date = s.length >= 10 ? s.slice(0, 10) : "";
  const time = s.length >= 16 ? s.slice(11, 16) : "";
  return { date, time };
}

function applyTemplate(tpl, vars) {
  const template = String(tpl || "");
  return template
    .replaceAll("{name}", vars.name || "")
    .replaceAll("{date}", vars.date || "")
    .replaceAll("{time}", vars.time || "")
    .replaceAll("{serviceType}", vars.serviceType || "Sessão")
    .replaceAll("{location}", vars.location || "Clínica");
}

function pickTemplate(cfg, reminderType) {
  const rt = String(reminderType || "").toLowerCase().trim();

  // Preferência: slots (offsets variáveis)
  if (rt === "slot1" || rt.includes("slot1") || rt === "1") return cfg?.msg1 || "";
  if (rt === "slot2" || rt.includes("slot2") || rt === "2") return cfg?.msg2 || "";
  if (rt === "slot3" || rt.includes("slot3") || rt === "3") return cfg?.msg3 || "";

  // Compat legado 48/24/12
  if (rt.includes("48")) return cfg?.msg48h || cfg?.msg1 || "";
  if (rt.includes("24")) return cfg?.msg24h || cfg?.msg2 || "";
  if (rt.includes("12")) return cfg?.msg12h || cfg?.msg3 || "";

  // Fallback final: msg2 -> msg1 -> msg3 (ordem mais comum)
  return cfg?.msg2 || cfg?.msg1 || cfg?.msg3 || cfg?.msg24h || cfg?.msg48h || cfg?.msg12h || "";
}

// concorrência limitada para fallback send()
async function sendWithConcurrency(messaging, messages, concurrency = 20) {
  const results = new Array(messages.length);
  let idx = 0;

  async function worker() {
    while (idx < messages.length) {
      const myIdx = idx++;
      try {
        const res = await messaging.send(messages[myIdx]);
        results[myIdx] = { success: true, messageId: res };
      } catch (err) {
        results[myIdx] = { success: false, error: err };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, messages.length) }, () => worker());
  await Promise.all(workers);
  return { results };
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
    const uploadId = body?.uploadId ? String(body.uploadId) : null;
    const remindersRaw = Array.isArray(body?.reminders) ? body.reminders : [];

    const reminders = remindersRaw
      .map((r) => ({
        appointmentId: r?.appointmentId ? String(r.appointmentId) : null,
        phoneCanonical: normalizePhoneCanonical(r?.phoneCanonical || r?.phone || ""),
        patientName: r?.patientName ? String(r.patientName) : "",
        startISO: r?.startISO ? String(r.startISO) : null,
        reminderType: r?.reminderType ? String(r.reminderType) : null,
        serviceType: r?.serviceType ? String(r.serviceType) : "Sessão",
        location: r?.location ? String(r.location) : "Clínica",
      }))
      .filter((r) => r.phoneCanonical && (r.phoneCanonical.length === 10 || r.phoneCanonical.length === 11));

    if (!reminders.length) {
      return NextResponse.json({ ok: false, error: "Nenhum lembrete válido para enviar." }, { status: 400 });
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Templates
    const cfgSnap = await db.collection("config").doc("global").get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : {};
    const defaultTitle = "Lembrete Psi • Sua sessão";

    // Agrupa por telefone
    const byPhone = new Map();
    for (const r of reminders) {
      const arr = byPhone.get(r.phoneCanonical) || [];
      arr.push(r);
      byPhone.set(r.phoneCanonical, arr);
    }

    // Busca subscribers em batch
    const phones = Array.from(byPhone.keys());
    const resultsByPhone = {};
    const chunkSize = 50;

    for (let i = 0; i < phones.length; i += chunkSize) {
      const chunk = phones.slice(i, i + chunkSize);
      const refs = chunk.map((p) => db.collection("subscribers").doc(p));
      const snaps = await db.getAll(...refs);

      snaps.forEach((snap, idx) => {
        const phone = chunk[idx];
        const data = snap.exists ? snap.data() : null;
        const token = data?.pushToken || data?.fcmToken || data?.token || null;
        const inactive = data?.status === "inactive";
        resultsByPhone[phone] = { token: token ? String(token) : null, inactive: Boolean(inactive) };
      });
    }

    // Monta 1 mensagem por telefone
    const messages = [];
    const perPhoneMeta = [];

    let skippedInactive = 0;
    let skippedNoToken = 0;

    for (const phone of phones) {
      const meta = resultsByPhone[phone] || { token: null, inactive: false };
      const items = byPhone.get(phone) || [];

      if (meta.inactive) {
        skippedInactive += items.length;
        continue;
      }
      if (!meta.token) {
        skippedNoToken += items.length;
        continue;
      }

      const first = items[0];
      const { date, time } = safeDateParts(first.startISO);

      const tpl = pickTemplate(cfg, first.reminderType);
      const bodyText = tpl
        ? applyTemplate(tpl, {
            name: first.patientName,
            date,
            time,
            serviceType: first.serviceType,
            location: first.location,
          })
        : `Olá${first.patientName ? ", " + first.patientName : ""}. Seu horário de cuidado está reservado para ${date || "a data agendada"} às ${
            time || "hora agendada"
          }.`;

      const extraCount = items.length - 1;
      const finalBody =
        extraCount > 0 ? `${bodyText}\n\nVocê tem mais ${extraCount} lembrete(s) pendente(s) nesta seleção.` : bodyText;

      messages.push({
        token: meta.token,
        notification: { title: defaultTitle, body: finalBody },
        data: {
          kind: "appointment_reminder",
          phoneCanonical: phone,
          uploadId: uploadId || "",
          reminderType: first.reminderType || "",
          appointmentId: first.appointmentId || "",
        },
      });

      perPhoneMeta.push({ phone, items });
    }

    const messaging = admin.messaging();

    let sendResponses = null;

    if (typeof messaging.sendAll === "function") {
      const resp = await messaging.sendAll(messages);
      sendResponses = resp.responses.map((r) => ({ success: r.success, error: r.error || null }));
    } else if (typeof messaging.sendEach === "function") {
      const resp = await messaging.sendEach(messages);
      sendResponses = resp.responses.map((r) => ({ success: r.success, error: r.error || null }));
    } else {
      const resp = await sendWithConcurrency(messaging, messages, 20);
      sendResponses = resp.results.map((r) => ({ success: r.success, error: r.error || null }));
    }

    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < sendResponses.length; i++) {
      const r = sendResponses[i];
      const { phone, items } = perPhoneMeta[i];

      if (r?.success) {
        sentCount += 1;
        db.collection("history").add({
          type: "push_reminder_sent",
          uploadId: uploadId || null,
          phoneCanonical: phone,
          appointmentIds: items.map((x) => x.appointmentId).filter(Boolean),
          reminderTypes: items.map((x) => x.reminderType).filter(Boolean),
          createdAt: now,
        });
      } else {
        failCount += 1;
        db.collection("history").add({
          type: "push_reminder_failed",
          uploadId: uploadId || null,
          phoneCanonical: phone,
          error: r?.error?.message || "FCM send error",
          appointmentIds: items.map((x) => x.appointmentId).filter(Boolean),
          createdAt: now,
        });
      }
    }

    await db.collection("history").add({
      type: "push_reminder_send_summary",
      uploadId: uploadId || null,
      phonesTotal: phones.length,
      messagesTotal: messages.length,
      sentCount,
      failCount,
      skippedInactive,
      skippedNoToken,
      createdAt: now,
    });

    return NextResponse.json({
      ok: true,
      sentCount,
      failCount,
      skippedInactive,
      skippedNoToken,
      messagesPrepared: messages.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
