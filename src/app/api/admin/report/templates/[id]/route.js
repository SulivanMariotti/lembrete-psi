
import { NextResponse } from "next/server";

import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { adminError } from "@/lib/server/adminError";
import { rateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/auditLog";
import { readJsonObjectBody } from "@/lib/server/payloadSchema";
import {
  buildTemplateAllowedKeys,
  normalizeTemplatePayload,
  ensureTemplateNameUnique,
  serializeTemplateDoc,
  setActiveTemplate,
} from "@/lib/server/reportTemplatesStore";

export const runtime = "nodejs";

async function resolveTemplateId(ctx) {
  const params = await Promise.resolve(ctx?.params);
  return String(params?.id || "").trim();
}

export async function PATCH(req, ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:templates:update",
    limit: 100,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const id = await resolveTemplateId(ctx);
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
    }

    const ref = admin.firestore().collection("report_templates").doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ ok: false, error: "Modelo não encontrado." }, { status: 404 });
    }

    const bodyRes = await readJsonObjectBody(req, {
      maxBytes: 250_000,
      defaultValue: {},
      allowedKeys: buildTemplateAllowedKeys(),
      label: "report-template",
      showKeys: true,
    });
    if (!bodyRes.ok) return NextResponse.json({ ok: false, error: bodyRes.error }, { status: 400 });

    const patch = normalizeTemplatePayload(bodyRes.value, { partial: true });
    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: false, error: "Nenhum campo informado para atualizar." }, { status: 400 });
    }
    if (patch.name !== undefined && !patch.name) {
      return NextResponse.json({ ok: false, error: "Nome do Modelo é obrigatório." }, { status: 400 });
    }

    if (patch.slug) {
      const unique = await ensureTemplateNameUnique({
        db: admin.firestore(),
        slug: patch.slug,
        ignoreId: id,
      });
      if (!unique.ok) {
        return NextResponse.json(
          { ok: false, error: "Já existe um Modelo de Relatório com esse nome." },
          { status: 409 }
        );
      }
    }

    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    patch.updatedBy = auth.uid;

    await ref.set(patch, { merge: true });
    if (patch.isActive === true) {
      await setActiveTemplate(admin.firestore(), id);
    }

    const merged = { ...(existing.data() || {}), ...patch };

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_template:update",
      target: id,
      status: "success",
      meta: {
        templateName: String(merged?.name || ""),
        sections: Array.isArray(merged?.sections) ? merged.sections.length : 0,
        fields: Object.keys(patch).filter((key) => !/(updatedAt|updatedBy)/.test(key)),
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return adminError({ req, auth, action: "report_template_update", err });
  }
}

export async function DELETE(req, ctx) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:templates:delete",
    limit: 40,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const id = await resolveTemplateId(ctx);
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
    }

    const ref = admin.firestore().collection("report_templates").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: "Modelo não encontrado." }, { status: 404 });
    }

    const current = serializeTemplateDoc(snap);
    await ref.delete();

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_template:delete",
      target: id,
      status: "success",
      meta: {
        templateName: current?.name || null,
        sections: Array.isArray(current?.sections) ? current.sections.length : 0,
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return adminError({ req, auth, action: "report_template_delete", err });
  }
}
