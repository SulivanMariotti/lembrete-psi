import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import { adminError } from "@/lib/server/adminError";

export const runtime = "nodejs";

/**
 * PASSO 16.2/45 — Push sem duplicar + sempre com conteúdo da sessão
 *
 * Problema observado:
 * - DATA-ONLY depende do SW atualizar 100%; se o SW antigo estiver ativo, a notificação pode chegar "vazia"
 * - NOTIFICATION + showNotification() no SW pode duplicar (2x)
 *
 * Solução:
 * - Enviar como WEBPUSH notification (para o navegador exibir com title/body SEM depender do SW)
 * - Enviar também "data" (para deep-link e auditoria)
 * - No SW (firebase-messaging-sw.js), se payload.notification existir, NÃO chamar showNotification (evita 2x)
 * - Usar "tag" (dedupeKey) para colapsar duplicatas no Android/Chrome
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

function safeDateParts(startISO, dateBR, timeBR) {
  const dbr = String(dateBR || "").trim();
  const tbr = String(timeBR || "").trim();
  if (dbr || tbr) return { date: dbr, time: tbr };

  const s = String(startISO || "");
  const date = s.length >= 10 ? s.slice(0, 10) : "";
  const time = s.length >= 16 ? s.slice(11, 16) : "";
  return { date, time };
}

function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\[\]\\]/g, "\\$&");
}

function applyTemplate(tpl, vars) {
  const template = String(tpl || "");
  if (!template) return "";

  const nameFull = String(vars.nameFull || vars.nomeCompleto || vars.name || vars.nome || "").trim();
  const firstName = nameFull ? nameFull.split(" ")[0] : "";

  const map = {
    // nomes
    nome: firstName,
    name: firstName,
    nomecompleto: nameFull,
    fullname: nameFull,

    // data/hora
    data: String(vars.date || vars.data || ""),
    date: String(vars.date || vars.data || ""),
    hora: String(vars.time || vars.hora || ""),
    time: String(vars.time || vars.hora || ""),

    // profissional
    profissional: String(vars.professional || vars.profissional || ""),
    professional: String(vars.professional || vars.profissional || ""),
    terapeuta: String(vars.professional || vars.profissional || ""),

    // serviço/local
    servicotype: String(vars.serviceType || vars.servico || "Sessão"),
    servico: String(vars.serviceType || vars.servico || "Sessão"),
    service: String(vars.serviceType || vars.servico || "Sessão"),

    location: String(vars.location || vars.local || "Clínica"),
    local: String(vars.location || vars.local || "Clínica"),
  };

  let out = template;

  for (const [k, v] of Object.entries(map)) {
    const key = escapeRegExp(k);
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}|\\{\\s*${key}\\s*\\}`, "gi");
    out = out.replace(re, String(v ?? ""));
  }

  return out;
}

function pickTemplate(cfg, reminderType) {
  const rt = String(reminderType || "").toLowerCase().trim();

  if (rt === "slot1" || rt.includes("slot1") || rt === "1") return cfg?.msg1 || "";
  if (rt === "slot2" || rt.includes("slot2") || rt === "2") return cfg?.msg2 || "";
  if (rt === "slot3" || rt.includes("slot3") || rt === "3") return cfg?.msg3 || "";

  if (rt.includes("48")) return cfg?.msg48h || cfg?.msg1 || "";
  if (rt.includes("24")) return cfg?.msg24h || cfg?.msg2 || "";
  if (rt.includes("12")) return cfg?.msg12h || cfg?.msg3 || "";

  return cfg?.msg2 || cfg?.msg1 || cfg?.msg3 || cfg?.msg24h || cfg?.msg48h || cfg?.msg12h || "";
}

function normalizeReminderSlot(reminderType) {
  const rt = String(reminderType || "").toLowerCase().trim();
  if (!rt) return "";
  if (rt === "slot1" || rt.includes("slot1") || rt === "1" || rt.includes("48")) return "slot1";
  if (rt === "slot2" || rt.includes("slot2") || rt === "2" || rt.includes("24")) return "slot2";
  if (rt === "slot3" || rt.includes("slot3") || rt === "3" || rt.includes("12")) return "slot3";
  return "";
}

function joinTitle(prefix, suffix) {
  const p = String(prefix || "").trim();
  const s = String(suffix || "").trim();
  if (!p) return s;
  if (!s) return p;
  const needsSpace = !p.endsWith(" ") && !s.startsWith(" ");
  if (/[—\-:•]$/.test(p)) return p + (needsSpace ? " " : "") + s;
  return p + " — " + s;
}

function resolveReminderTitle(cfg, slotKey) {
  const defaultsFull = {
    slot1: "💜 Permittá • Lembrete Psi — Seu espaço em 48h",
    slot2: "💜 Permittá • Lembrete Psi — Amanhã: seu horário",
    slot3: "💜 Permittá • Lembrete Psi — Hoje: sessão no seu horário",
    multi: "💜 Permittá • Lembrete Psi — Seus lembretes",
    fallback: "💜 Permittá • Lembrete Psi — Seu espaço de cuidado",
  };

  const suffixDefaults = {
    slot1: "Seu espaço em 48h",
    slot2: "Amanhã: seu horário",
    slot3: "Hoje: sessão no seu horário",
    multi: "Seus lembretes",
    fallback: "Seu espaço de cuidado",
  };

  const keyMap = {
    slot1: "reminderTitle1",
    slot2: "reminderTitle2",
    slot3: "reminderTitle3",
    multi: "reminderTitleMulti",
    fallback: "reminderTitleDefault",
  };

  const k = keyMap[slotKey] || keyMap.fallback;
  const raw = cfg && cfg[k] != null ? String(cfg[k]).trim() : "";
  const prefix = cfg && cfg.reminderTitlePrefix != null ? String(cfg.reminderTitlePrefix).trim() : "";

  if (raw) {
    if (prefix && !raw.includes("Permittá") && !raw.includes("Lembrete Psi")) return joinTitle(prefix, raw);
    return raw;
  }

  if (prefix) {
    const suf = suffixDefaults[slotKey] || suffixDefaults.fallback;
    return joinTitle(prefix, suf);
  }

  return defaultsFull[slotKey] || defaultsFull.fallback;
}

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

function isUserInactive(u) {
  if (!u) return false;
  const st = String(u.status || "").toLowerCase();
  if (["inactive", "disabled", "archived", "deleted"].includes(st)) return true;
  if (u.deletedAt || u.disabledAt) return true;
  if (u.isActive === false || u.disabled === true) return true;
  if (u.mergedTo) return true;
  return false;
}

export async function POST(req) {
  let auth = null;
  try {
    initAdmin();

    auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const rl = await rateLimit(req, {
      bucket: "admin:reminders:send",
      uid: auth.uid,
      limit: 8,
      windowMs: 5 * 60_000,
    });
    if (!rl.ok) return rl.res;

    const body = await req.json().catch(() => ({}));
    const uploadId = body?.uploadId ? String(body.uploadId) : null;
    const remindersRaw = Array.isArray(body?.reminders) ? body.reminders : [];

    const reminders = remindersRaw
      .map((r) => ({
        appointmentId: r?.appointmentId ? String(r.appointmentId) : null,
        phoneCanonical: normalizePhoneCanonical(r?.phoneCanonical || r?.phone || ""),
        patientName: r?.patientName ? String(r.patientName) : "",
        professionalName: r?.professionalName ? String(r.professionalName) : "",
        startISO: r?.startISO ? String(r.startISO) : null,
        dateBR: r?.dateBR ? String(r.dateBR) : "",
        time: r?.time ? String(r.time) : "",
        reminderType: r?.reminderType ? String(r.reminderType) : null,
        serviceType: r?.serviceType ? String(r.serviceType) : "Sessão",
        location: r?.location ? String(r.location) : "Clínica",
        messageBody: r?.messageBody ? String(r.messageBody) : "",
      }))
      .filter((r) => r.phoneCanonical && (r.phoneCanonical.length === 10 || r.phoneCanonical.length === 11));

    if (!reminders.length) {
      return NextResponse.json({ ok: false, error: "Nenhum lembrete válido para enviar." }, { status: 400 });
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const cfgSnap = await db.collection("config").doc("global").get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : {};

    const byPhone = new Map();
    for (const r of reminders) {
      const arr = byPhone.get(r.phoneCanonical) || [];
      arr.push(r);
      byPhone.set(r.phoneCanonical, arr);
    }
    const phones = Array.from(byPhone.keys());

    // Subscribers (token) em batch
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

    // Users inativos (bloqueio) — best effort
    const userInactiveByPhone = {};
    if (phones.length) {
      const inChunk = 10;
      for (let i = 0; i < phones.length; i += inChunk) {
        const chunk = phones.slice(i, i + inChunk);
        const snapUsers = await db
          .collection("users")
          .where("role", "==", "patient")
          .where("phoneCanonical", "in", chunk)
          .get();
        snapUsers.docs.forEach((d) => {
          const data = d.data() || {};
          const ph = String(data.phoneCanonical || "").trim();
          if (!ph) return;
          userInactiveByPhone[ph] = isUserInactive(data);
        });
      }
    }

    const messages = [];
    const perPhoneMeta = [];

    let skippedInactiveSubscriber = 0;
    let skippedInactivePatient = 0;
    let skippedNoToken = 0;

    const clickUrl = "https://agenda.msgflow.app.br";

    for (const phone of phones) {
      const meta = resultsByPhone[phone] || { token: null, inactive: false };
      const itemsRaw = byPhone.get(phone) || [];

      if (userInactiveByPhone[phone] === true) {
        skippedInactivePatient += itemsRaw.length;
        continue;
      }
      if (meta.inactive) {
        skippedInactiveSubscriber += itemsRaw.length;
        continue;
      }
      if (!meta.token) {
        skippedNoToken += itemsRaw.length;
        continue;
      }

      // Dedup local por appointmentId+slot (mesma chamada)
      const seen = new Set();
      const items = [];
      for (const it of itemsRaw) {
        const slot = normalizeReminderSlot(it.reminderType);
        const key = `${it.appointmentId || "noid"}:${slot || "noslot"}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ ...it, _slot: slot });
      }
      if (!items.length) continue;

      const first = items[0];
      const { date, time } = safeDateParts(first.startISO, first.dateBR, first.time);

      // 1) Preferência: messageBody (já preenchido pelo parseCSV)
      let bodyText = String(first.messageBody || "").trim();

      // 2) Fallback: template global com placeholders PT/EN
      if (!bodyText) {
        const tpl = pickTemplate(cfg, first.reminderType);
        bodyText = tpl
          ? applyTemplate(tpl, {
              nameFull: first.patientName,
              professional: first.professionalName,
              date,
              time,
              serviceType: first.serviceType,
              location: first.location,
            })
          : "";
      }

      // 3) Fallback final: mensagem segura com data/hora se disponíveis
      if (!bodyText) {
        const firstName = first.patientName ? first.patientName.split(" ")[0] : "";
        bodyText = `Olá${firstName ? ", " + firstName : ""}. Seu horário de cuidado está reservado para ${date || "a data agendada"} às ${
          time || "hora agendada"
        }.`;
      }

      const extraCount = items.length - 1;
      const finalBody = extraCount > 0 ? `${bodyText}\n\nVocê tem mais ${extraCount} lembrete(s) nesta seleção.` : bodyText;

      const slotKeys = items.map((x) => x._slot).filter(Boolean);
      const uniqSlots = Array.from(new Set(slotKeys));

      const titleKey = uniqSlots.length > 1 ? "multi" : uniqSlots.length === 1 ? uniqSlots[0] : "fallback";
      const title = resolveReminderTitle(cfg, titleKey);

      const slotForKey = uniqSlots.length === 1 ? uniqSlots[0] : (first._slot || "");
      const dedupeKey = `${first.appointmentId || phone}:${slotForKey || "reminder"}`;

      messages.push({
        token: meta.token,
        webpush: {
          notification: {
            title: String(title),
            body: String(finalBody),
            icon: "/icon.png",
            tag: String(dedupeKey),
            renotify: false,
          },
          fcmOptions: { link: clickUrl },
        },
        data: {
          kind: "appointment_reminder",
          title: String(title),
          body: String(finalBody),
          phoneCanonical: String(phone),
          uploadId: String(uploadId || ""),
          reminderType: String(first.reminderType || ""),
          appointmentId: String(first.appointmentId || ""),
          reminderTypes: JSON.stringify(uniqSlots),
          dedupeKey: String(dedupeKey),
          click_url: clickUrl,
        },
      });

      perPhoneMeta.push({ phone, items, uniqSlots });
    }

    if (!messages.length) {
      await db.collection("history").add({
        type: "push_reminder_send_summary",
        uploadId: uploadId || null,
        phonesTotal: phones.length,
        messagesTotal: 0,
        sentCount: 0,
        failCount: 0,
        skippedInactiveSubscriber,
        skippedInactivePatient,
        skippedNoToken,
        createdAt: now,
      });

      return NextResponse.json({
        ok: true,
        sentCount: 0,
        failCount: 0,
        messagesPrepared: 0,
        skippedInactiveSubscriber,
        skippedInactivePatient,
        skippedNoToken,
      });
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
      const { phone, items, uniqSlots } = perPhoneMeta[i];
      const reminderType = uniqSlots.length > 1 ? "multi" : uniqSlots[0] || "";

      if (r?.success) {
        sentCount += 1;
        db.collection("history").add({
          type: "push_reminder_sent",
          uploadId: uploadId || null,
          phoneCanonical: phone,
          appointmentIds: items.map((x) => x.appointmentId).filter(Boolean),
          reminderType,
          reminderTypes: uniqSlots,
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
          reminderType,
          reminderTypes: uniqSlots,
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
      skippedInactiveSubscriber,
      skippedInactivePatient,
      skippedNoToken,
      createdAt: now,
    });

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "reminders_send",
      target: uploadId || null,
      meta: {
        uploadId: uploadId || null,
        phonesTotal: phones.length,
        messagesTotal: messages.length,
        sentCount,
        failCount,
        skippedInactiveSubscriber,
        skippedInactivePatient,
        skippedNoToken,
      },
    });

    return NextResponse.json({
      ok: true,
      sentCount,
      failCount,
      messagesPrepared: messages.length,
      skippedInactiveSubscriber,
      skippedInactivePatient,
      skippedNoToken,
    });
  } catch (e) {
    return adminError({ req, auth: auth?.ok ? auth : null, action: "reminders_send", err: e });
  }
}
