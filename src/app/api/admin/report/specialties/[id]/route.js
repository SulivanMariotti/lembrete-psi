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
} from "@/lib/shared/reportSpecialties";

export const runtime = "nodejs";

function buildAllowedKeys() {
  return ["name", "description", "isActive", "demandSourceMode", "defaultDemandId"];
}

function normalizeSpecialtyPatch(body = {}) {
  const patch = {};

  if (body?.name != null) {
    patch.name = String(body.name || "").trim();
    patch.nameNormalized = normalizeSpecialtyName(patch.name);
  }
  if (body?.description != null) {
    patch.description = String(body.description || "").trim();
  }
  if (body?.isActive != null) {
    patch.isActive = body?.isActive === true || String(body?.isActive).toLowerCase() === "true";
  }
  if (body?.demandSourceMode != null) {
    patch.demandSourceMode = String(body?.demandSourceMode || "").trim();
  }
  if (body?.defaultDemandId != null) {
    patch.defaultDemandId = String(body?.defaultDemandId || "").trim();
  }

  return patch;
}

async function resolveSpecialtyId(ctx) {
  const params = await Promise.resolve(ctx?.params);
  return String(params?.id || "").trim();
}

async function ensureNameUnique({ db, nameNormalized, ignoreId = null }) {
  const snap = await db.collection("report_specialties").where("nameNormalized", "==", nameNormalized).limit(10).get();
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
    bucket: "admin:report:specialties:update",
    limit: 120,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const id = await resolveSpecialtyId(ctx);
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
    }

    const ref = admin.firestore().collection("report_specialties").doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ ok: false, error: "Especialidade não encontrada." }, { status: 404 });
    }

    const bodyRes = await readJsonObjectBody(req, {
      maxBytes: 30_000,
      defaultValue: {},
      allowedKeys: buildAllowedKeys(),
      label: "report-specialty",
      showKeys: true,
    });
    if (!bodyRes.ok) return NextResponse.json({ ok: false, error: bodyRes.error }, { status: 400 });

    const patch = normalizeSpecialtyPatch(bodyRes.value);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "Nenhum campo informado para atualizar." }, { status: 400 });
    }

    if (patch.name !== undefined && !patch.name) {
      return NextResponse.json({ ok: false, error: "Nome da Especialidade é obrigatório." }, { status: 400 });
    }
    if (patch.nameNormalized) {
      const unique = await ensureNameUnique({
        db: admin.firestore(),
        nameNormalized: patch.nameNormalized,
        ignoreId: id,
      });
      if (!unique.ok) {
        return NextResponse.json(
          { ok: false, error: "Já existe uma Especialidade cadastrada com esse nome." },
          { status: 409 }
        );
      }
    }

    const current = serializeFirestoreValue(existing.data() || {});
    const nextDemandSourceMode =
      patch.demandSourceMode ?? current?.demandSourceMode ?? REPORT_SPECIALTY_DEMAND_SOURCE_MODES.EXCEL;
    const rawNextDefaultDemandId = patch.defaultDemandId ?? String(current?.defaultDemandId || "").trim();
    const nextDefaultDemandId =
      nextDemandSourceMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT ? rawNextDefaultDemandId : "";

    if (!Object.values(REPORT_SPECIALTY_DEMAND_SOURCE_MODES).includes(nextDemandSourceMode)) {
      return NextResponse.json({ ok: false, error: "Modo de origem da Demanda inválido." }, { status: 400 });
    }

    if (
      nextDemandSourceMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT &&
      !nextDefaultDemandId
    ) {
      return NextResponse.json(
        { ok: false, error: "Escolha a Demanda padrão da Especialidade." },
        { status: 400 }
      );
    }

    if (nextDemandSourceMode !== REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT) {
      patch.defaultDemandId = "";
    }

    if (nextDemandSourceMode === REPORT_SPECIALTY_DEMAND_SOURCE_MODES.SYSTEM_DEFAULT && nextDefaultDemandId) {
      const demandSnap = await ref.collection("demands").doc(nextDefaultDemandId).get();
      if (!demandSnap.exists) {
        return NextResponse.json({ ok: false, error: "Demanda padrão não encontrada." }, { status: 404 });
      }
    }

    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    patch.updatedBy = auth.uid;

    await ref.set(patch, { merge: true });

    invalidateReportImportCatalogCache();

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_specialty:update",
      target: id,
      status: "success",
      meta: {
        fields: Object.keys(patch).filter((key) => !/(updatedAt|updatedBy)/.test(key)),
        specialtyName: patch.name || current?.name || null,
        demandSourceMode: nextDemandSourceMode,
        defaultDemandId: nextDefaultDemandId || null,
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return adminError({ req, auth, action: "report_specialty_update", err });
  }
}

export async function DELETE(req, ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:specialties:delete",
    limit: 60,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const id = await resolveSpecialtyId(ctx);
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
    }

    const ref = admin.firestore().collection("report_specialties").doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ ok: false, error: "Especialidade não encontrada." }, { status: 404 });
    }

    const demandsSnap = await ref.collection("demands").limit(1).get();
    if (!demandsSnap.empty) {
      return NextResponse.json(
        { ok: false, error: "Não é possível excluir a Especialidade com Demandas vinculadas." },
        { status: 409 }
      );
    }

    const current = serializeFirestoreValue(existing.data() || {});
    await ref.delete();

    invalidateReportImportCatalogCache();

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_specialty:delete",
      target: id,
      status: "success",
      meta: {
        specialtyName: current?.name || null,
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return adminError({ req, auth, action: "report_specialty_delete", err });
  }
}
