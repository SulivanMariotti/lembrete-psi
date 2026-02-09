import { NextResponse } from "next/server";
import admin from "firebase-admin";

/**
 * POST /api/admin/attendance/import
 *
 * PADRÃO DA PLANILHA (CSV) — PRESENÇA/FALTAS
 * ID, Nome, Data, Hora, Profissional, Serviço, Local, Status
 *
 * ⚠️ IMPORTANTE (nova lógica):
 * - ID = ID DO PACIENTE (no seu sistema atual), NÃO é ID da sessão.
 * - Para permitir o MESMO paciente ter várias datas (presente em um dia e falta em outro),
 *   o registro em attendance_logs é gravado com chave composta:
 *     {patientId}_{isoDate}_{hora}_{profissionalSlug}
 *
 * Como obtemos o telefone (caso pai/filho usem o mesmo número):
 * - O telefone é do RESPONSÁVEL (contato). Ele pode ser compartilhado.
 * - Buscamos o telefone em `users` via campo `patientExternalId` (ou `patientId`), que você irá preencher no cadastro.
 *   - userDoc.phoneCanonical deve existir.
 *
 * Server-side (Admin SDK) para evitar rules no client.
 * NÃO cria/permite reagendar/cancelar.
 * Registra resumo em history (type=attendance_import_summary).
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

function normalizeToISODate(dateStr) {
  const s = String(dateStr || "").trim();
  if (!s) return "";
  const isoLike = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  if (isoLike) return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`;
  const brLike = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (brLike) return `${brLike[3]}-${brLike[2]}-${brLike[1]}`;
  return "";
}

function normalizeTime(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  // aceita HH:MM ou H:MM
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function parseCSVLine(line) {
  const sep = line.includes(";") && !line.includes(",") ? ";" : ",";
  return line.split(sep).map((x) => String(x || "").trim());
}

function normalizeHeaderKey(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function safeSlug(str, max = 18) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, max);
}

function mapStatus(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (["p", "presente", "presenca", "presença", "present", "compareceu", "ok", "sim", "1", "true"].includes(v))
    return "present";
  if (["f", "faltou", "falta", "absent", "missed", "nao", "não", "0", "false", "no_show", "noshow"].includes(v))
    return "absent";
  // default: absent (clínica: ausência precisa ser conscientizada)
  return "absent";
}

async function findUserByPatientId(db, patientId) {
  const pid = String(patientId || "").trim();
  if (!pid) return null;

  // 1) tenta patientExternalId
  const q1 = await db.collection("users").where("patientExternalId", "==", pid).limit(1).get();
  if (!q1.empty) return q1.docs[0].data() || null;

  // 2) fallback patientId
  const q2 = await db.collection("users").where("patientId", "==", pid).limit(1).get();
  if (!q2.empty) return q2.docs[0].data() || null;

  return null;
}

export async function POST(req) {
  try {
    initAdmin();

    const body = await req.json().catch(() => ({}));
    const headerSecret = req.headers.get("x-admin-secret") || "";
    const adminSecret = String(body.adminSecret || headerSecret || "");
    const requiredSecret = process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || "";

    if (requiredSecret && adminSecret !== requiredSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const csvText = String(body.csvText || "").trim();
    if (!csvText) return NextResponse.json({ ok: false, error: "csvText vazio" }, { status: 400 });

    const source = String(body.source || "attendance_import").trim();

    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ ok: false, error: "CSV sem dados" }, { status: 400 });

    const header = parseCSVLine(lines[0]).map(normalizeHeaderKey);

    const idxId = header.findIndex((h) => ["id", "codigo", "código", "patientid", "patient_id"].includes(h));
    const idxName = header.findIndex((h) => ["nome", "name", "paciente"].includes(h));
    const idxDate = header.findIndex((h) => ["data", "date", "dia"].includes(h));
    const idxTime = header.findIndex((h) => ["hora", "time", "horario", "horário"].includes(h));
    const idxProf = header.findIndex((h) => ["profissional", "profissional(a)", "prof"].includes(h));
    const idxService = header.findIndex((h) => ["servico", "serviço", "service", "tipo"].includes(h));
    const idxLocation = header.findIndex((h) => ["local", "location", "sala"].includes(h));
    const idxStatus = header.findIndex((h) => ["status", "presenca", "presença", "presenca/falta", "falta"].includes(h));

    if (idxId === -1) return NextResponse.json({ ok: false, error: "CSV sem coluna ID" }, { status: 400 });
    if (idxDate === -1) return NextResponse.json({ ok: false, error: "CSV sem coluna Data" }, { status: 400 });
    if (idxTime === -1) return NextResponse.json({ ok: false, error: "CSV sem coluna Hora" }, { status: 400 });
    if (idxStatus === -1) return NextResponse.json({ ok: false, error: "CSV sem coluna Status" }, { status: 400 });

    const db = admin.firestore();
    const nowTs = admin.firestore.Timestamp.now();

    let imported = 0;
    let skipped = 0;
    const errors = [];

    let batch = db.batch();
    let ops = 0;
    async function commitIfNeeded(force = false) {
      if (ops >= 450 || (force && ops > 0)) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    // cache de user por patientId
    const userCache = new Map();

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);

      const patientId = String(cols[idxId] || "").trim();
      const name = idxName >= 0 ? String(cols[idxName] || "").trim() : "";
      const rawDate = String(cols[idxDate] || "").trim();
      const rawTime = String(cols[idxTime] || "").trim();
      const profissional = idxProf >= 0 ? String(cols[idxProf] || "").trim() : "";
      const service = idxService >= 0 ? String(cols[idxService] || "").trim() : "";
      const location = idxLocation >= 0 ? String(cols[idxLocation] || "").trim() : "";
      const status = mapStatus(idxStatus >= 0 ? cols[idxStatus] : "");

      const isoDate = normalizeToISODate(rawDate);
      const time = normalizeTime(rawTime);

      if (!patientId) {
        skipped += 1;
        errors.push({ line: i + 1, error: "ID vazio" });
        continue;
      }
      if (!isoDate) {
        skipped += 1;
        errors.push({ line: i + 1, error: "Data inválida", value: rawDate });
        continue;
      }
      if (!time) {
        skipped += 1;
        errors.push({ line: i + 1, error: "Hora inválida", value: rawTime });
        continue;
      }

      let user = userCache.get(patientId);
      if (user === undefined) {
        user = await findUserByPatientId(db, patientId);
        userCache.set(patientId, user);
      }

      const phoneCanonical = user ? String(user.phoneCanonical || user.phone || "").trim() : "";
      if (!phoneCanonical) {
        skipped += 1;
        errors.push({ line: i + 1, error: "Não encontrou paciente em users pelo ID (sem phoneCanonical)", value: patientId });
        continue;
      }

      const profSlug = safeSlug(profissional || "prof", 12) || "prof";
      const docId = `${patientId}_${isoDate}_${time.replace(":", "")}_${profSlug}`.slice(0, 180);

      const ref = db.collection("attendance_logs").doc(docId);

      batch.set(
        ref,
        {
          patientId,                // ID do paciente (do seu sistema)
          phoneCanonical,           // pode ser compartilhado (responsável)
          name: name || (user ? (user.name || null) : null),
          isoDate,
          time,
          profissional: profissional || null,
          service: service || null,
          location: location || null,
          status,
          source,
          createdAt: nowTs,
          updatedAt: nowTs,
        },
        { merge: true }
      );
      ops += 1;
      imported += 1;

      await commitIfNeeded();
    }

    await commitIfNeeded(true);

    await db.collection("history").add({
      type: "attendance_import_summary",
      createdAt: nowTs,
      count: imported,
      skipped,
      source,
      sampleErrors: errors.slice(0, 10),
    });

    return NextResponse.json({ ok: true, imported, skipped, errors: errors.slice(0, 50) }, { status: 200 });
  } catch (e) {
    console.error("POST /api/admin/attendance/import error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
