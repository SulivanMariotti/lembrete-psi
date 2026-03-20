import { NextResponse } from "next/server";

import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { adminError } from "@/lib/server/adminError";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import { readJsonObjectBody } from "@/lib/server/payloadSchema";
import { invalidateReportImportCatalogCache } from "@/lib/server/reportImportAnalysis";
import {
  REPORT_SPECIALTY_DEMAND_SOURCE_MODES,
  normalizeSpecialtyName,
  slugifySpecialtyName,
} from "@/lib/shared/reportSpecialties";

export const runtime = "nodejs";

function serializeFirestoreValue(value) {
  if (value == null) return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = serializeFirestoreValue(nested);
    }
    return out;
  }
  return value;
}

function buildAllowedKeys() {
  return ["name", "description", "isActive", "demandSourceMode", "defaultDemandId"];
}

function normalizeSpecialtyPayload(body = {}) {
  const name = String(body?.name || "").trim();
  return {
    name,
    nameNormalized: normalizeSpecialtyName(name),
    description: String(body?.description || "").trim(),
    isActive: body?.isActive == null ? true : body?.isActive === true || String(body?.isActive).toLowerCase() === "true",
    demandSourceMode:
      String(body?.demandSourceMode || "").trim() || REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL,
    defaultDemandId: String(body?.defaultDemandId || "").trim(),
  };
}

async function ensureNameUnique({ db, nameNormalized, ignoreId = null }) {
  const snap = await db.collection("report_specialties").where("nameNormalized", "==", nameNormalized).limit(10).get();
  for (const doc of snap.docs) {
    if (ignoreId && doc.id === ignoreId) continue;
    return { ok: false, existingId: doc.id };
  }
  return { ok: true };
}

async function ensureUniqueDocId(db, baseSlug) {
  let docId = baseSlug;
  for (let index = 0; index < 20; index += 1) {
    const ref = db.collection("report_specialties").doc(docId);
    const snap = await ref.get();
    if (!snap.exists) return docId;
    docId = `${baseSlug}-${index + 2}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

function buildSpecialtyDemandIndex(demandDocs = []) {
  const demandIndex = new Map();

  demandDocs.forEach((doc) => {
    const specialtyRef = doc.ref.parent?.parent;
    const specialtyId = String(specialtyRef?.id || "").trim();
    const specialtyCollectionId = String(specialtyRef?.parent?.id || "").trim();
    if (!specialtyId || specialtyCollectionId !== "report_specialties") return;

    const list = demandIndex.get(specialtyId) || [];
    list.push({ id: doc.id, ...serializeFirestoreValue(doc.data() || {}) });
    demandIndex.set(specialtyId, list);
  });

  return demandIndex;
}

function shapeSpecialty(doc, demandIndex = new Map()) {
  const data = serializeFirestoreValue(doc.data() || {});
  const specialtyDemands = demandIndex.get(doc.id) || [];
  const defaultDemandId = String(data?.defaultDemandId || "").trim();
  const defaultDemand = defaultDemandId
    ? specialtyDemands.find((item) => String(item?.id || item?.docId || "").trim() === defaultDemandId)
    : null;

  return {
    id: doc.id,
    name: String(data?.name || "").trim(),
    nameNormalized: String(data?.nameNormalized || "").trim(),
    description: String(data?.description || "").trim(),
    isActive: data?.isActive == null ? true : Boolean(data.isActive),
    demandSourceMode:
      String(data?.demandSourceMode || "").trim() || REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL,
    defaultDemandId,
    defaultDemandName: String(defaultDemand?.name || "").trim(),
    demandsCount: specialtyDemands.length,
    createdAt: data?.createdAt ?? null,
    updatedAt: data?.updatedAt ?? null,
  };
}

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:specialties:list",
    limit: 180,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const db = admin.firestore();
    let specialtiesSnap;
    let demandIndex = new Map();

    try {
      const [specialtiesResult, allDemandsResult] = await Promise.all([
        db.collection("report_specialties").limit(200).get(),
        db.collectionGroup("demands").get(),
      ]);
      specialtiesSnap = specialtiesResult;
      demandIndex = buildSpecialtyDemandIndex(allDemandsResult.docs);
    } catch (_) {
      specialtiesSnap = await db.collection("report_specialties").limit(200).get();
      const demandDocs = [];
      for (const doc of specialtiesSnap.docs) {
        const demandSnap = await doc.ref.collection("demands").limit(500).get();
        demandSnap.docs.forEach((item) => demandDocs.push(item));
      }
      demandIndex = buildSpecialtyDemandIndex(demandDocs);
    }

    const items = specialtiesSnap.docs.map((doc) => shapeSpecialty(doc, demandIndex));

    items.sort((a, b) => {
      if (a.isActive !== b.isActive) return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });

    return NextResponse.json({
      ok: true,
      items,
      demandSourceModes: REPORT_SPECIALTY_DEMAND_SOURCE_MODES,
    });
  } catch (err) {
    return adminError({ req, auth, action: "report_specialties_list", err });
  }
}

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:specialties:create",
    limit: 60,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const bodyRes = await readJsonObjectBody(req, {
      maxBytes: 30_000,
      defaultValue: {},
      allowedKeys: buildAllowedKeys(),
      label: "report-specialty",
      showKeys: true,
    });
    if (!bodyRes.ok) return NextResponse.json({ ok: false, error: bodyRes.error }, { status: 400 });

    const payload = normalizeSpecialtyPayload(bodyRes.value);
    if (payload.demandSourceMode !== REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT) {
      payload.defaultDemandId = "";
    }
    if (!payload.name) {
      return NextResponse.json({ ok: false, error: "Nome da Especialidade é obrigatório." }, { status: 400 });
    }
    if (!payload.nameNormalized) {
      return NextResponse.json({ ok: false, error: "Nome da Especialidade inválido." }, { status: 400 });
    }
    if (!Object.values(REPORT_SPECIALTY_DEMAND_SOURCE_MODES).includes(payload.demandSourceMode)) {
      return NextResponse.json({ ok: false, error: "Modo de origem da Demanda inválido." }, { status: 400 });
    }
    if (
      payload.demandSourceMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT &&
      !payload.defaultDemandId
    ) {
      return NextResponse.json(
        { ok: false, error: "Escolha a Demanda padrão da Especialidade." },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const unique = await ensureNameUnique({ db, nameNormalized: payload.nameNormalized });
    if (!unique.ok) {
      return NextResponse.json(
        { ok: false, error: "Já existe uma Especialidade cadastrada com esse nome." },
        { status: 409 }
      );
    }

    const docId = await ensureUniqueDocId(db, slugifySpecialtyName(payload.name));
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("report_specialties").doc(docId).set({
      ...payload,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.uid,
      updatedBy: auth.uid,
    });

    invalidateReportImportCatalogCache();

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_specialty:create",
      target: docId,
      status: "success",
      meta: {
        specialtyName: payload.name,
        demandSourceMode: payload.demandSourceMode,
        defaultDemandId: payload.defaultDemandId || null,
      },
    });

    return NextResponse.json({ ok: true, id: docId });
  } catch (err) {
    return adminError({ req, auth, action: "report_specialty_create", err });
  }
}
