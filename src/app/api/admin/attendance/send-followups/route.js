import { NextResponse } from "next/server";
import admin from "firebase-admin";

/**
 * POST /api/admin/attendance/send-followups
 *
 * Dispara mensagens FCM de constância terapêutica com base em attendance_logs:
 * - status=present  -> reforço (parabéns/continuidade)
 * - status=absent   -> psicoeducação (retomar constância)
 *
 * NÃO cria cancelamento/reagendamento.
 * Server-side (Admin SDK).
 *
 * Payload JSON:
 * {
 *   fromIsoDate?: "YYYY-MM-DD",
 *   toIsoDate?: "YYYY-MM-DD",
 *   days?: number,                 // últimos N dias (inclui hoje)
 *   dryRun?: boolean,              // true = prévia (não envia)
 *   limit?: number                 // limita nº de logs (segurança)
 * }
 *
 * Segurança:
 * - Header: x-admin-secret deve igualar NEXT_PUBLIC_ADMIN_PANEL_SECRET (se definido)
 */

function getServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_SERVICE_ACCOUNT(_B64) env var");
  return JSON.parse(raw);
}

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({ credential: admin.credential.cert(getServiceAccount()) });
}

function todayIsoUTC() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoAddDays(iso, deltaDays) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeInt(v, defVal) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : defVal;
}

function defaultTemplates() {
  return {
    presentTitle: "Você está sustentando o seu processo",
    presentBody:
      "Sua presença é um investimento em você. A constância é onde a mudança acontece. Seguimos juntos no seu cuidado.",
    absentTitle: "Retomar a constância é cuidado",
    absentBody:
      "Faltar não é só perder uma hora: é interromper um processo. Se algo dificultou sua vinda, traga isso para a terapia. A continuidade fortalece a evolução.",
  };
}

function interpolate(template, vars) {
  return String(template || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ""
  );
}

export async function POST(req) {
  try {
    initAdmin();

    const adminSecret = req.headers.get("x-admin-secret") || "";
    const requiredSecret = process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || "";
    if (requiredSecret && adminSecret !== requiredSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dryRun;
    const limit = Math.max(1, Math.min(2000, safeInt(body.limit, 500)));

    let fromIsoDate = String(body.fromIsoDate || "").trim();
    let toIsoDate = String(body.toIsoDate || "").trim();

    if (!fromIsoDate || !toIsoDate) {
      const days = Math.max(1, Math.min(90, safeInt(body.days, 7)));
      const today = todayIsoUTC();
      toIsoDate = today;
      fromIsoDate = isoAddDays(today, -(days - 1));
    }

    const db = admin.firestore();
    const nowTs = admin.firestore.Timestamp.now();

    // Templates em config/global (opcionais)
    const tpl = defaultTemplates();
    try {
      const cfgSnap = await db.collection("config").doc("global").get();
      const cfg = cfgSnap.exists ? cfgSnap.data() || {} : {};
      if (cfg.attendanceFollowupPresentTitle) tpl.presentTitle = String(cfg.attendanceFollowupPresentTitle);
      if (cfg.attendanceFollowupPresentBody) tpl.presentBody = String(cfg.attendanceFollowupPresentBody);
      if (cfg.attendanceFollowupAbsentTitle) tpl.absentTitle = String(cfg.attendanceFollowupAbsentTitle);
      if (cfg.attendanceFollowupAbsentBody) tpl.absentBody = String(cfg.attendanceFollowupAbsentBody);
    } catch (_) {}

    const snap = await db
      .collection("attendance_logs")
      .where("isoDate", ">=", fromIsoDate)
      .where("isoDate", "<=", toIsoDate)
      .limit(limit)
      .get();

    const logs = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

    const phones = Array.from(
      new Set(
        logs
          .map((d) => String(d.phoneCanonical || "").trim())
          .filter((p) => p.length === 10 || p.length === 11)
      )
    );

    const tokenByPhone = new Map();
    if (phones.length) {
      const chunkSize = 200;
      for (let i = 0; i < phones.length; i += chunkSize) {
        const chunk = phones.slice(i, i + chunkSize);
        const refs = chunk.map((p) => db.collection("subscribers").doc(p));
        const snaps = await db.getAll(...refs);
        snaps.forEach((s) => {
          if (!s.exists) return;
          const data = s.data() || {};
          tokenByPhone.set(s.id, { token: data.pushToken || data.token || null, status: data.status || "active" });
        });
      }
    }

    const results = {
      ok: true,
      dryRun,
      fromIsoDate,
      toIsoDate,
      totalLogs: logs.length,
      candidates: 0,
      sent: 0,
      blocked: 0,
      blockedNoToken: 0,
      blockedInactive: 0,
      byStatus: { present: 0, absent: 0 },
      sample: [],
    };

    const messaging = admin.messaging();
    const concurrency = 10;
    let idx = 0;

    async function worker() {
      while (idx < logs.length) {
        const current = logs[idx++];
        const phone = String(current.phoneCanonical || "").trim();
        const status = String(current.status || "").toLowerCase() === "present" ? "present" : "absent";
        results.byStatus[status] += 1;

        const tk = tokenByPhone.get(phone);
        const hasToken = !!(tk && tk.token);
        const isActive = !tk || tk.status !== "inactive";

        if (!phone || !(phone.length === 10 || phone.length === 11) || !hasToken) {
          results.blocked += 1;
          results.blockedNoToken += 1;
          if (results.sample.length < 12) {
            results.sample.push({ id: current.id, phoneCanonical: phone, status, reason: "no_token" });
          }
          continue;
        }
        if (!isActive) {
          results.blocked += 1;
          results.blockedInactive += 1;
          if (results.sample.length < 12) {
            results.sample.push({ id: current.id, phoneCanonical: phone, status, reason: "inactive" });
          }
          continue;
        }

        results.candidates += 1;

        const vars = {
          nome: current.name || "",
          data: current.isoDate || "",
          hora: current.time || "",
          profissional: current.profissional || "",
          servico: current.service || "",
          local: current.location || "",
        };

        const title = status === "present" ? tpl.presentTitle : tpl.absentTitle;
        const bodyText = status === "present" ? tpl.presentBody : tpl.absentBody;

        const message = {
          token: tk.token,
          notification: {
            title: interpolate(title, vars),
            body: interpolate(bodyText, vars),
          },
          data: {
            type: "attendance_followup",
            status,
            isoDate: String(current.isoDate || ""),
            time: String(current.time || ""),
            patientId: String(current.patientId || ""),
          },
        };

        if (dryRun) continue;

        try {
          await messaging.send(message);
          results.sent += 1;
        } catch (e) {
          results.blocked += 1;
          if (results.sample.length < 12) {
            results.sample.push({
              id: current.id,
              phoneCanonical: phone,
              status,
              reason: "send_error",
              error: e?.message || String(e),
            });
          }
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, logs.length || 1) }, () => worker());
    await Promise.all(workers);

    await db.collection("history").add({
      type: "attendance_followup_summary",
      createdAt: nowTs,
      dryRun,
      fromIsoDate,
      toIsoDate,
      totalLogs: results.totalLogs,
      candidates: results.candidates,
      sent: results.sent,
      blocked: results.blocked,
      blockedNoToken: results.blockedNoToken,
      blockedInactive: results.blockedInactive,
      byStatus: results.byStatus,
      sample: results.sample,
    });

    return NextResponse.json(results, { status: 200 });
  } catch (e) {
    console.error("POST /api/admin/attendance/send-followups error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
