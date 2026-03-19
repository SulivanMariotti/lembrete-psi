
import admin from "@/lib/firebaseAdmin";
import {
  REPORT_TEMPLATE_LOGO_MAX_DATA_URL_LENGTH,
  REPORT_TEMPLATE_SYSTEM_DEFAULTS,
  createEmptyTemplateForm,
  mapTemplateToForm,
  slugifyReportTemplateName,
} from "@/lib/shared/reportTemplates";

function coerceText(value, max = 12000) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().slice(0, max);
}

export function serializeFirestoreValue(value) {
  if (value == null) return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) out[key] = serializeFirestoreValue(nested);
    return out;
  }
  return value;
}

export function serializeTemplateDoc(doc) {
  return mapTemplateToForm({
    id: doc.id,
    ...serializeFirestoreValue(doc.data() || {}),
  });
}

export function buildTemplateAllowedKeys() {
  return [
    "name",
    "description",
    "isActive",
    "pageFormat",
    "pageOrientation",
    "itemsPerPage",
    "layoutMode",
    "editorMode",
    "headerLogoDataUrl",
    "headerTemplate",
    "bodyTemplate",
    "footerTemplate",
  ];
}

export function normalizeTemplatePayload(body = {}, { partial = false } = {}) {
  const base = createEmptyTemplateForm();
  const patch = {};

  if (!partial || body?.name != null) {
    patch.name = coerceText(body?.name, 160);
    patch.slug = slugifyReportTemplateName(patch.name);
  }

  if (!partial || body?.description != null) {
    patch.description = coerceText(body?.description, 500);
  }

  if (!partial || body?.isActive != null) {
    patch.isActive = body?.isActive == null ? true : body?.isActive === true || String(body?.isActive).toLowerCase() === "true";
  }

  if (!partial || body?.pageFormat != null) {
    patch.pageFormat = REPORT_TEMPLATE_SYSTEM_DEFAULTS.pageFormat;
  }
  if (!partial || body?.pageOrientation != null) {
    patch.pageOrientation = REPORT_TEMPLATE_SYSTEM_DEFAULTS.pageOrientation;
  }
  if (!partial || body?.itemsPerPage != null) {
    patch.itemsPerPage = REPORT_TEMPLATE_SYSTEM_DEFAULTS.itemsPerPage;
  }
  if (!partial || body?.layoutMode != null) {
    patch.layoutMode = REPORT_TEMPLATE_SYSTEM_DEFAULTS.layoutMode;
  }

  if (!partial || body?.editorMode != null) {
    patch.editorMode = "tagTemplate";
  }
  if (!partial || body?.headerLogoDataUrl != null) {
    patch.headerLogoDataUrl = coerceText(body?.headerLogoDataUrl ?? "", REPORT_TEMPLATE_LOGO_MAX_DATA_URL_LENGTH);
  }

  if (!partial || body?.headerTemplate != null) {
    patch.headerTemplate = coerceText(body?.headerTemplate ?? base.headerTemplate, 4000);
  }

  if (!partial || body?.bodyTemplate != null) {
    patch.bodyTemplate = coerceText(body?.bodyTemplate ?? base.bodyTemplate, 20000);
  }

  if (!partial || body?.footerTemplate != null) {
    patch.footerTemplate = coerceText(body?.footerTemplate ?? base.footerTemplate, 4000);
  }

  return patch;
}

export async function ensureTemplateNameUnique({ db, slug, ignoreId = null }) {
  const snap = await db.collection("report_templates").where("slug", "==", slug).limit(10).get();
  for (const doc of snap.docs) {
    if (ignoreId && doc.id === ignoreId) continue;
    return { ok: false, existingId: doc.id };
  }
  return { ok: true };
}

export async function ensureUniqueTemplateDocId(db, baseSlug) {
  const root = String(baseSlug || "modelo-relatorio").slice(0, 80) || "modelo-relatorio";
  let candidate = root;
  let attempt = 0;

  while (attempt < 100) {
    const snap = await db.collection("report_templates").doc(candidate).get();
    if (!snap.exists) return candidate;
    attempt += 1;
    candidate = `${root}-${attempt + 1}`;
  }

  return `${root}-${Date.now().toString(36)}`;
}

export async function setActiveTemplate(db, id) {
  const snap = await db.collection("report_templates").where("isActive", "==", true).limit(20).get();
  const batch = db.batch();
  snap.docs.forEach((doc) => {
    if (doc.id === id) return;
    batch.set(doc.ref, { isActive: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
  const ref = db.collection("report_templates").doc(id);
  batch.set(ref, { isActive: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
}
