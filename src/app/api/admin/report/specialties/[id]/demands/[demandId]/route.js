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
  countFilledDemandCategories,
} from "@/lib/shared/reportDemands";

export const runtime = "nodejs";

function buildAllowedKeys() {
  const keys = ["name", "description", "isActive", "cidInf", "cidAdult"];
  REPORT_DEMAND_CATEGORY_OPTIONS.forEach((categoryNumber) => {
    keys.push(`category${categoryNumber}Title`, `category${categoryNumber}Content`);
  });
  return keys;
}

function normalizeDemandPatch(body = {}) {
  const patch = {};

  if (body?.name != null) {
    patch.name = String(body.name || "").trim();
    patch.nameNormalized = normalizeDemandName(patch.name);
  }
  if (body?.description != null) {
    patch.description = String(body.description || "").trim();
  }
  if (body?.isActive != null) {
    patch.isActive = body?.isActive === true || String(body?.isActive).toLowerCase() === "true";
  }
  if (body?.cidInf != null) {
    patch.cidInf = String(body.cidInf || "").trim();
  }
  if (body?.cidAdult != null) {
    patch.cidAdult = String(body.cidAdult || "").trim();
  }

  REPORT_DEMAND_CATEGORY_OPTIONS.forEach((categoryNumber) => {
    const titleKey = `category${categoryNumber}Title`;
    const contentKey = `category${categoryNumber}Content`;
    if (body?.[titleKey] != null) {
      patch[titleKey] = String(body[titleKey] || `Categoria ${categoryNumber}`).trim();
    }
    if (body?.[contentKey] != null) {
      patch[contentKey] = String(body[contentKey] || "").trim();
    }
  });

  return patch;
}

async function resolveParams(ctx) {
  const params = await Promise.resolve(ctx?.params);
  return {
    specialtyId: String(params?.id || "").trim(),
    demandId: String(params?.demandId || "").trim(),
  };
}

async function ensureNameUnique({ ref, nameNormalized, ignoreId = null }) {
  const snap = await ref.collection("demands").where("nameNormalized", "==", nameNormalized).limit(10).get();
  for (const doc of snap.docs) {
    if (ignoreId && doc.id === ignoreId) continue;
    return { ok: false, existingId: doc.id };
  }
  return { ok: true };
}

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

export async function PATCH(req, ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:specialty-demands:update",
    limit: 120,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const { specialtyId, demandId } = await resolveParams(ctx);
    if (!specialtyId || !demandId) {
      return NextResponse.json({ ok: false, error: "IDs inválidos." }, { status: 400 });
    }

    const specialtyRef = admin.firestore().collection("report_specialties").doc(specialtyId);
    const specialtySnap = await specialtyRef.get();
    if (!specialtySnap.exists) {
      return NextResponse.json({ ok: false, error: "Especialidade não encontrada." }, { status: 404 });
    }

    const ref = specialtyRef.collection("demands").doc(demandId);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ ok: false, error: "Demanda não encontrada." }, { status: 404 });
    }

    const bodyRes = await readJsonObjectBody(req, {
      maxBytes: 120_000,
      defaultValue: {},
      allowedKeys: buildAllowedKeys(),
      label: "report-specialty-demand",
      showKeys: true,
    });
    if (!bodyRes.ok) return NextResponse.json({ ok: false, error: bodyRes.error }, { status: 400 });

    const patch = normalizeDemandPatch(bodyRes.value);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "Nenhum campo informado para atualizar." }, { status: 400 });
    }
    if (patch.name !== undefined && !patch.name) {
      return NextResponse.json({ ok: false, error: "Nome da Demanda é obrigatório." }, { status: 400 });
    }

    if (patch.nameNormalized) {
      const unique = await ensureNameUnique({
        ref: specialtyRef,
        nameNormalized: patch.nameNormalized,
        ignoreId: demandId,
      });
      if (!unique.ok) {
        return NextResponse.json(
          { ok: false, error: "Já existe uma Demanda cadastrada com esse nome nesta Especialidade." },
          { status: 409 }
        );
      }
    }

    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    patch.updatedBy = auth.uid;

    await ref.set(patch, { merge: true });

    const currentData = serializeFirestoreValue({ ...(existing.data() || {}), ...patch });

    invalidateReportImportCatalogCache();

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_specialty_demand:update",
      target: `${specialtyId}/${demandId}`,
      status: "success",
      meta: {
        specialtyId,
        specialtyName: specialtySnap.data()?.name || null,
        fields: Object.keys(patch).filter((key) => !/(updatedAt|updatedBy)/.test(key)),
        demandName: currentData?.name || null,
        filledCategories: countFilledDemandCategories(currentData),
      },
    });

    return NextResponse.json({ ok: true, id: demandId, specialtyId });
  } catch (err) {
    return adminError({ req, auth, action: "report_specialty_demand_update", err });
  }
}

export async function DELETE(req, ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:specialty-demands:delete",
    limit: 60,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const { specialtyId, demandId } = await resolveParams(ctx);
    if (!specialtyId || !demandId) {
      return NextResponse.json({ ok: false, error: "IDs inválidos." }, { status: 400 });
    }

    const specialtyRef = admin.firestore().collection("report_specialties").doc(specialtyId);
    const specialtySnap = await specialtyRef.get();
    if (!specialtySnap.exists) {
      return NextResponse.json({ ok: false, error: "Especialidade não encontrada." }, { status: 404 });
    }

    const specialtyData = serializeFirestoreValue(specialtySnap.data() || {});
    if (String(specialtyData?.defaultDemandId || "").trim() === demandId) {
      return NextResponse.json(
        { ok: false, error: "A Demanda padrão da Especialidade não pode ser excluída." },
        { status: 409 }
      );
    }

    const ref = specialtyRef.collection("demands").doc(demandId);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ ok: false, error: "Demanda não encontrada." }, { status: 404 });
    }

    const currentData = serializeFirestoreValue(existing.data() || {});
    await ref.delete();

    invalidateReportImportCatalogCache();

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_specialty_demand:delete",
      target: `${specialtyId}/${demandId}`,
      status: "success",
      meta: {
        specialtyId,
        specialtyName: specialtyData?.name || null,
        demandName: currentData?.name || null,
      },
    });

    return NextResponse.json({ ok: true, id: demandId, specialtyId });
  } catch (err) {
    return adminError({ req, auth, action: "report_specialty_demand_delete", err });
  }
}
