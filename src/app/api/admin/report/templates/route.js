
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
  ensureUniqueTemplateDocId,
  serializeTemplateDoc,
  setActiveTemplate,
} from "@/lib/server/reportTemplatesStore";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:templates:list",
    limit: 180,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas consultas. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const snap = await admin.firestore().collection("report_templates").limit(100).get();
    const items = snap.docs
      .map(serializeTemplateDoc)
      .sort((a, b) => {
        if (Boolean(b?.isActive) !== Boolean(a?.isActive)) return Number(Boolean(b?.isActive)) - Number(Boolean(a?.isActive));
        return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR");
      });

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return adminError({ req, auth, action: "report_template_list", err });
  }
}

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const rl = await rateLimit(req, {
    bucket: "admin:report:templates:create",
    limit: 60,
    windowMs: 60_000,
    uid: auth.uid,
    errorMessage: "Muitas requisições. Aguarde um pouco e tente novamente.",
  });
  if (!rl.ok) return rl.res;

  try {
    const bodyRes = await readJsonObjectBody(req, {
      maxBytes: 250_000,
      defaultValue: {},
      allowedKeys: buildTemplateAllowedKeys(),
      label: "report-template",
      showKeys: true,
    });
    if (!bodyRes.ok) return NextResponse.json({ ok: false, error: bodyRes.error }, { status: 400 });

    const payload = normalizeTemplatePayload(bodyRes.value, { partial: false });
    if (!payload.name) {
      return NextResponse.json({ ok: false, error: "Nome do Modelo é obrigatório." }, { status: 400 });
    }

    const db = admin.firestore();
    const unique = await ensureTemplateNameUnique({ db, slug: payload.slug });
    if (!unique.ok) {
      return NextResponse.json(
        { ok: false, error: "Já existe um Modelo de Relatório com esse nome." },
        { status: 409 }
      );
    }

    const docId = await ensureUniqueTemplateDocId(db, payload.slug);
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("report_templates").doc(docId).set({
      ...payload,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.uid,
      updatedBy: auth.uid,
    });

    if (payload.isActive) {
      await setActiveTemplate(db, docId);
    }

    await logAdminAudit({
      req,
      actorUid: auth.uid,
      actorEmail: auth.decoded?.email || null,
      action: "report_template:create",
      target: docId,
      status: "success",
      meta: {
        templateName: payload.name,
        sections: Array.isArray(payload.sections) ? payload.sections.length : 0,
      },
    });

    return NextResponse.json({ ok: true, id: docId });
  } catch (err) {
    return adminError({ req, auth, action: "report_template_create", err });
  }
}
