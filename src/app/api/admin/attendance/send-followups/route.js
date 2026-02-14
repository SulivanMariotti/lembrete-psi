import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
export const runtime = "nodejs";
/**
 * POST /api/admin/attendance/send-followups
 *
 * Envia mensagens de reforço (presença) e psicoeducação (falta) com base em logs importados.
 *
 * Segurança:
 * - Authorization Bearer (idToken) + role admin
 *
 * Placeholders suportados nos templates (config/global):
 * - {nome}, {data}, {dataIso}, {hora}, {profissional}, {servico}, {local}, {id}
 * - Compatível também com {{nome}} etc.
 */

function normalizeDigits(s) {
  return String(s || "").replace(/\D+/g, "");
}

function canonicalPhone(raw) {
  // remove +55 / 55 se vier junto
  const d = normalizeDigits(raw);
  if (d.length >= 12 && d.startsWith("55")) return d.slice(2);
  return d;
}

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

function formatDateBR(iso) {
  const s = String(iso || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Suporta placeholders em dois formatos (compatibilidade):
 * - {{ nome }}  (formato antigo)
 * - {nome}      (formato novo)
 */
function interpolate(template, vars) {
  const t = String(template || "");
  // {{var}}
  const a = t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ""
  );
  // {var}
  return a.replace(/\{\s*(\w+)\s*\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ""
  );
}

function isInactiveUserDoc(u) {
  if (!u) return true;
  const status = String(u.status || "").toLowerCase();
  if (["inactive", "disabled", "archived", "deleted"].includes(status)) return true;
  if (u.isActive === false) return true;
  if (u.disabled === true) return true;
  if (u.disabledAt) return true;
  if (u.deletedAt) return true;
  if (u.mergedTo) return true;
  return false;
}

async function loadTemplates(db) {
  const snap = await db.collection("config").doc("global").get();
  const cfg = snap.exists ? snap.data() : {};

  const tpl = {
    presentTitle: "💜 Permittá • Lembrete Psi — Parabéns pela presença",
    presentBody:
      "Olá {nome}. Sua presença em {data} às {hora} é um passo de cuidado. A continuidade fortalece o processo.",
    absentTitle: "💜 Permittá • Lembrete Psi — Senti sua falta hoje",
    absentBody:
      "Olá {nome}. Percebemos sua ausência em {data} às {hora}. Quando você retorna, o processo continua. Se precisar, fale com a clínica.",
  };

  if (cfg.attendanceFollowupPresentTitle) tpl.presentTitle = String(cfg.attendanceFollowupPresentTitle);
  if (cfg.attendanceFollowupPresentBody) tpl.presentBody = String(cfg.attendanceFollowupPresentBody);
  if (cfg.attendanceFollowupAbsentTitle) tpl.absentTitle = String(cfg.attendanceFollowupAbsentTitle);
  if (cfg.attendanceFollowupAbsentBody) tpl.absentBody = String(cfg.attendanceFollowupAbsentBody);

  return tpl;
}

function parseBodyRange(body) {
  const days = Number(body?.days || 30);
  const fromIsoDate = body?.fromIsoDate ? String(body.fromIsoDate) : null;
  const toIsoDate = body?.toIsoDate ? String(body.toIsoDate) : null;

  if (fromIsoDate && toIsoDate) return { fromIsoDate, toIsoDate, days: null };

  // default: [today-days+1, today]
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(1, days) + 1);

  const iso = (d) => d.toISOString().slice(0, 10);
  return { fromIsoDate: iso(start), toIsoDate: iso(end), days };
}

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    initAdmin();
    const db = admin.firestore();

    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dryRun;

    const { fromIsoDate, toIsoDate, days } = parseBodyRange(body);

    const tpl = await loadTemplates(db);

    // Carrega logs do período
    const logsSnap = await db
      .collection("attendance_logs")
      .where("isoDate", ">=", fromIsoDate)
      .where("isoDate", "<=", toIsoDate)
      .get();

    const totalLogs = logsSnap.size;

    // Dedup por chave (patientId + isoDate + time + profissional) quando existe docId composto,
    // mas como já está gravado em docId composto, basta iterar.
    const logs = [];
    logsSnap.forEach((d) => logs.push({ id: d.id, ...d.data() }));

    // Agrupar por patientId+isoDate (mais recente por updatedAt) — se vier duplicado
    const keyOf = (x) =>
      `${String(x.patientId || "")}__${String(x.isoDate || "")}__${String(x.time || "")}__${String(
        x.profissional || x.professional || ""
      )}`;

    const pickNewest = (a, b) => {
      const ta = a?.updatedAt?.toMillis ? a.updatedAt.toMillis() : Number(a?.updatedAt || 0);
      const tb = b?.updatedAt?.toMillis ? b.updatedAt.toMillis() : Number(b?.updatedAt || 0);
      return tb >= ta ? b : a;
    };

    const byKey = new Map();
    for (const l of logs) {
      const k = keyOf(l);
      if (!k) continue;
      byKey.set(k, byKey.has(k) ? pickNewest(byKey.get(k), l) : l);
    }

    const candidatesList = Array.from(byKey.values());
    const candidates = candidatesList.length;

    const out = {
      ok: true,
      dryRun,
      fromIsoDate,
      toIsoDate,
      days: days ?? null,
      totalLogs,
      candidates,
      sent: 0,
      blocked: 0,
      blockedNoToken: 0,
      blockedNoPhone: 0,
      blockedInactive: 0,
      blockedInactivePatient: 0,
      blockedInactiveSubscriber: 0,
      byStatus: { present: 0, absent: 0 },
      sample: [],
    };

    // Pré-carregar users por phoneCanonical para reduzir reads
    // (como é volume pequeno, faremos lookup individual com cache)
    const userCache = new Map();
    const subCache = new Map();

    async function getUserByPhone(phone) {
      if (userCache.has(phone)) return userCache.get(phone);
      const snap = await db
        .collection("users")
        .where("role", "==", "patient")
        .where("phoneCanonical", "==", phone)
        .limit(1)
        .get();
      const doc = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
      userCache.set(phone, doc);
      return doc;
    }


    const userByIdCache = new Map();

    async function getUserByPatientId(patientId) {
      const key = String(patientId || "").trim();
      if (!key) return null;
      if (userByIdCache.has(key)) return userByIdCache.get(key);

      // Primeiro tenta patientExternalId (padrão recomendado), depois patientId (legado)
      let snap = await db
        .collection("users")
        .where("role", "==", "patient")
        .where("patientExternalId", "==", key)
        .limit(1)
        .get();

      if (snap.empty) {
        snap = await db
          .collection("users")
          .where("role", "==", "patient")
          .where("patientId", "==", key)
          .limit(1)
          .get();
      }

      const doc = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
      userByIdCache.set(key, doc);
      return doc;
    }

    async function getSubscriber(phone) {
      if (subCache.has(phone)) return subCache.get(phone);
      const doc = await db.collection("subscribers").doc(phone).get();
      const data = doc.exists ? doc.data() : null;
      subCache.set(phone, data);
      return data;
    }

    const maxSample = 8;

    for (const current of candidatesList) {
      const status = String(current.status || "").toLowerCase() === "present" ? "present" : "absent";
      out.byStatus[status] += 1;

      const pid =
        String(current.patientId || current.patientExternalId || current.id || "").trim() || null;

      let phone = canonicalPhone(current.phoneCanonical || current.phone || "");
      let userDoc = null;

      // 1) Se tiver phone no log, busca user por phoneCanonical
      if (phone) {
        userDoc = await getUserByPhone(phone);
      }

      // 2) Se NÃO tiver phone no log (dados legados), tenta resolver pelo patientId em users
      if (!phone && pid) {
        userDoc = await getUserByPatientId(pid);
        const fromUser = canonicalPhone(userDoc?.phoneCanonical || userDoc?.phone || "");
        if (fromUser) phone = fromUser;
      }

      // 3) Se achou phone via users mas ainda não tinha userDoc por phone, mantém userDoc existente.
      // (Se userDoc veio nulo pelo PID mas phone existe, tenta por phone)
      if (phone && !userDoc) {
        userDoc = await getUserByPhone(phone);
      }

      const vars = {
        nome: current.name || userDoc?.name || "",
        data: formatDateBR(current.isoDate || ""),
        dataIso: current.isoDate || "",
        hora: current.time || "",
        profissional: current.profissional || current.professional || "",
        servico: current.service || "",
        local: current.location || "",
        id: pid || current.patientId || userDoc?.patientExternalId || "",
      };

      const title = status === "present" ? tpl.presentTitle : tpl.absentTitle;
      const bodyText = status === "present" ? tpl.presentBody : tpl.absentBody;

      const finalTitle = interpolate(title, vars);
      const finalBody = interpolate(bodyText, vars);

      // Verifica bloqueios (mas ainda assim devolve amostra em dryRun)
      let blockedReason = null;

      // Sem telefone (dados legados / incompletos)
      if (!phone) {
        blockedReason = "no_phone";
      }

      // Paciente inativo (users)
      if (!blockedReason && isInactiveUserDoc(userDoc)) {
        blockedReason = "inactive_patient";
      }

      // Subscriber: token/ativo (só se tiver phone)
      const sub = phone ? await getSubscriber(phone) : null;
      const token = sub?.pushToken || sub?.token || null;
      if (!blockedReason && sub?.isActive === false) {
        blockedReason = "inactive_subscriber";
      }
      if (!blockedReason && !token) {
        blockedReason = "no_token";
      }

      // Amostra (para preview): mostra a mensagem mesmo se bloquear (para validar placeholders)
      if (dryRun && out.sample.length < maxSample) {
        out.sample.push({
          status,
          phoneCanonical: phone,
          name: vars.nome,
          title: finalTitle,
          body: finalBody,
          canSend: blockedReason == null,
          blockedReason,
        });
      }

      // Contadores de bloqueio/fluxo
      if (blockedReason === "no_phone") {
        out.blocked += 1;
        out.blockedNoPhone += 1;
        continue;
      }

      if (blockedReason === "inactive_patient") {
        out.blocked += 1;
        out.blockedInactive += 1;
        out.blockedInactivePatient += 1;
        continue;
      }
      if (blockedReason === "inactive_subscriber") {
        out.blocked += 1;
        out.blockedInactive += 1;
        out.blockedInactiveSubscriber += 1;
        continue;
      }
      if (blockedReason === "no_token") {
        out.blocked += 1;
        out.blockedNoToken += 1;
        continue;
      }

      if (dryRun) continue;

      // Envio real
      const message = {
        token,
        notification: {
          title: finalTitle,
          body: finalBody,
        },
        data: {
          kind: "attendance_followup",
          status,
          phoneCanonical: phone,
          isoDate: String(current.isoDate || ""),
        },
      };

      try {
        await admin.messaging().send(message);
        out.sent += 1;
      } catch (e) {
        out.blocked += 1;
      }
    }

    return NextResponse.json(out);
  } catch (e) {
    console.error("POST /api/admin/attendance/send-followups error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}