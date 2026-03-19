import { NextResponse } from "next/server";

import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { adminError } from "@/lib/server/adminError";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import { readJsonObjectBody } from "@/lib/server/payloadSchema";
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

function normalizeDemandPayload(body = {}) {
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

async function ensureNameUnique({ db, nameNormalized, ignoreId = null }) {
  const snap = await db.collection("report_demands").where("nameNormalized", "==", nameNormalized).limit(10).get();
  for (const doc of snap.docs) {
    if (ignoreId && doc.id === ignoreId) continue;
    return { ok: false, existingId: doc.id };
  }
  return { ok: true };
}

async function resolveDemandId(ctx) {
  const params = await Promise.resolve(ctx?.params);
  return String(params?.id || "").trim();
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
    bucket: "admin:report:demands:update",
    limit: 120,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const id = await resolveDemandId(ctx);
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
    }

    const ref = admin.firestore().collection("report_demands").doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ ok: false, error: "Demanda não encontrada." }, { status: 404 });
    }

    const bodyRes = await readJsonObjectBody(req, {
      maxBytes: 120_000,
      defaultValue: {},
      allowedKeys: buildAllowedKeys(),
      label: "report-demand",
      showKeys: true,
    });
    if (!bodyRes.ok) return NextResponse.json({ ok: false, error: bodyRes.error }, { status: 400 });

    const patch = normalizeDemandPayload(bodyRes.value);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "Nenhum campo informado para atualizar." }, { status: 400 });
    }

    if (patch.name !== undefined && !patch.name) {
      return NextResponse.json({ ok: false, error: "Nome da Demanda é obrigatório." }, { status: 400 });
    }

    if (patch.nameNormalized) {
      const unique = await ensureNameUnique({
        db: admin.firestore(),
        nameNormalized: patch.nameNormalized,
        ignoreId: id,
      });
      if (!unique.ok) {
        return NextResponse.json(
          { ok: false, error: "Já existe uma Demanda cadastrada com esse nome." },
          { status: 409 }
        );
      }
    }

    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    patch.updatedBy = auth.uid;

    await ref.set(patch, { merge: true });

    const currentData = serializeFirestoreValue({ ...(existing.data() || {}), ...patch });

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_demand:update",
      target: id,
      status: "success",
      meta: {
        fields: Object.keys(patch).filter((key) => !/(updatedAt|updatedBy)/.test(key)),
        demandName: currentData?.name || null,
        filledCategories: countFilledDemandCategories(currentData),
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return adminError({ req, auth, action: "report_demand_update", err });
  }
}

export async function DELETE(req, ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:demands:delete",
    limit: 60,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const id = await resolveDemandId(ctx);
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
    }

    const ref = admin.firestore().collection("report_demands").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: "Demanda não encontrada." }, { status: 404 });
    }

    const current = serializeFirestoreValue(snap.data() || {});
    await ref.delete();

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_demand:delete",
      target: id,
      status: "success",
      meta: {
        demandName: current?.name || null,
        filledCategories: countFilledDemandCategories(current),
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return adminError({ req, auth, action: "report_demand_delete", err });
  }
}
