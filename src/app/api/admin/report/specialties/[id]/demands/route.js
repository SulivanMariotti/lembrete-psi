import { NextResponse } from "next/server";

import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { adminError } from "@/lib/server/adminError";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import { readJsonObjectBody } from "@/lib/server/payloadSchema";
import { invalidateReportImportCatalogCache } from "@/lib/server/reportImportAnalysis";
import {
  REPORT_DEMAND_CATEGORY_OPTIONS,
  normalizeDemandName,
  slugifyDemandName,
  countFilledDemandCategories,
} from "@/lib/shared/reportDemands";

export const runtime = "nodejs";

function serializeFirestoreValue(v) {
  if (v == null) return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  if (Array.isArray(v)) return v.map(serializeFirestoreValue);
  if (typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = serializeFirestoreValue(val);
    return out;
  }
  return v;
}

function buildAllowedKeys() {
  const keys = ["name", "description", "isActive", "cidInf", "cidAdult"];
  REPORT_DEMAND_CATEGORY_OPTIONS.forEach((categoryNumber) => {
    keys.push(`category${categoryNumber}Title`, `category${categoryNumber}Content`);
  });
  return keys;
}

function normalizeDemandPayload(body = {}) {
  const name = String(body?.name || "").trim();
  const description = String(body?.description || "").trim();
  const isActive = body?.isActive == null ? true : body?.isActive === true || String(body?.isActive).toLowerCase() === "true";
  const cidInf = String(body?.cidInf || "").trim();
  const cidAdult = String(body?.cidAdult || "").trim();
  const nameNormalized = normalizeDemandName(name);

  const categories = REPORT_DEMAND_CATEGORY_OPTIONS.reduce((acc, categoryNumber) => {
    acc[`category${categoryNumber}Title`] = String(body?.[`category${categoryNumber}Title`] || `Categoria ${categoryNumber}`).trim();
    acc[`category${categoryNumber}Content`] = String(body?.[`category${categoryNumber}Content`] || "").trim();
    return acc;
  }, {});

  return {
    name,
    nameNormalized,
    description,
    isActive,
    cidInf,
    cidAdult,
    ...categories,
  };
}

async function resolveSpecialtyId(ctx) {
  const params = await Promise.resolve(ctx?.params);
  return String(params?.id || "").trim();
}

async function ensureNameUnique({ ref, nameNormalized, ignoreId = null }) {
  const snap = await ref.collection("demands").where("nameNormalized", "==", nameNormalized).limit(10).get();
  for (const doc of snap.docs) {
    if (ignoreId && doc.id === ignoreId) continue;
    return { ok: false, existingId: doc.id };
  }
  return { ok: true };
}

async function ensureUniqueDocId(ref, baseSlug) {
  let docId = baseSlug;
  for (let index = 0; index < 20; index += 1) {
    const snap = await ref.collection("demands").doc(docId).get();
    if (!snap.exists) return docId;
    docId = `${baseSlug}-${index + 2}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

function shapeDemand(doc) {
  const data = serializeFirestoreValue(doc.data() || {});
  const item = {
    id: doc.id,
    name: String(data?.name || "").trim(),
    nameNormalized: String(data?.nameNormalized || "").trim(),
    description: String(data?.description || "").trim(),
    isActive: data?.isActive == null ? true : Boolean(data.isActive),
    cidInf: String(data?.cidInf || "").trim(),
    cidAdult: String(data?.cidAdult || "").trim(),
    createdAt: data?.createdAt ?? null,
    updatedAt: data?.updatedAt ?? null,
  };

  REPORT_DEMAND_CATEGORY_OPTIONS.forEach((categoryNumber) => {
    item[`category${categoryNumber}Title`] = String(data?.[`category${categoryNumber}Title`] || "").trim();
    item[`category${categoryNumber}Content`] = String(data?.[`category${categoryNumber}Content`] || "").trim();
  });

  item.filledCategories = countFilledDemandCategories(item);

  return item;
}

export async function GET(req, ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:specialty-demands:list",
    limit: 180,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const specialtyId = await resolveSpecialtyId(ctx);
    if (!specialtyId) {
      return NextResponse.json({ ok: false, error: "ID da Especialidade inválido." }, { status: 400 });
    }

    const specialtyRef = admin.firestore().collection("report_specialties").doc(specialtyId);
    const specialtySnap = await specialtyRef.get();
    if (!specialtySnap.exists) {
      return NextResponse.json({ ok: false, error: "Especialidade não encontrada." }, { status: 404 });
    }

    const snap = await specialtyRef.collection("demands").limit(500).get();

    const items = snap.docs
      .map(shapeDemand)
      .filter((item) => item.id && item.name)
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
        return a.name.localeCompare(b.name, "pt-BR");
      });

    return NextResponse.json({
      ok: true,
      specialtyId,
      items,
      categoryOptions: REPORT_DEMAND_CATEGORY_OPTIONS,
      defaultDemandId: String(specialtySnap.data()?.defaultDemandId || "").trim(),
    });
  } catch (err) {
    return adminError({ req, auth, action: "report_specialty_demands_list", err });
  }
}

export async function POST(req, ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:specialty-demands:create",
    limit: 80,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const specialtyId = await resolveSpecialtyId(ctx);
    if (!specialtyId) {
      return NextResponse.json({ ok: false, error: "ID da Especialidade inválido." }, { status: 400 });
    }

    const specialtyRef = admin.firestore().collection("report_specialties").doc(specialtyId);
    const specialtySnap = await specialtyRef.get();
    if (!specialtySnap.exists) {
      return NextResponse.json({ ok: false, error: "Especialidade não encontrada." }, { status: 404 });
    }

    const bodyRes = await readJsonObjectBody(req, {
      maxBytes: 120_000,
      defaultValue: {},
      allowedKeys: buildAllowedKeys(),
      label: "report-specialty-demand",
      showKeys: true,
    });
    if (!bodyRes.ok) return NextResponse.json({ ok: false, error: bodyRes.error }, { status: 400 });

    const payload = normalizeDemandPayload(bodyRes.value);
    if (!payload.name) {
      return NextResponse.json({ ok: false, error: "Nome da Demanda é obrigatório." }, { status: 400 });
    }
    if (!payload.nameNormalized) {
      return NextResponse.json({ ok: false, error: "Nome da Demanda inválido." }, { status: 400 });
    }

    const unique = await ensureNameUnique({ ref: specialtyRef, nameNormalized: payload.nameNormalized });
    if (!unique.ok) {
      return NextResponse.json(
        { ok: false, error: "Já existe uma Demanda cadastrada com esse nome nesta Especialidade." },
        { status: 409 }
      );
    }

    const docId = await ensureUniqueDocId(specialtyRef, slugifyDemandName(payload.name));
    const now = admin.firestore.FieldValue.serverTimestamp();

    await specialtyRef.collection("demands").doc(docId).set({
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
      action: "report_specialty_demand:create",
      target: `${specialtyId}/${docId}`,
      status: "success",
      meta: {
        specialtyId,
        specialtyName: specialtySnap.data()?.name || null,
        demandName: payload.name,
        filledCategories: countFilledDemandCategories(payload),
      },
    });

    return NextResponse.json({ ok: true, id: docId, specialtyId });
  } catch (err) {
    return adminError({ req, auth, action: "report_specialty_demand_create", err });
  }
}
