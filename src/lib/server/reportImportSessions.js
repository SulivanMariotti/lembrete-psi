import { randomUUID } from "crypto";

import admin from "@/lib/firebaseAdmin";

export const REPORT_IMPORT_SESSIONS_COLLECTION = "report_import_sessions";
export const REPORT_IMPORT_SESSION_TTL_MINUTES = 30;
export const REPORT_IMPORT_SESSION_CLEANUP_BATCH_LIMIT = 25;
export const REPORT_IMPORT_SESSION_CREATE_CLEANUP_LIMIT = 10;

export function getReportImportSessionCleanupPolicy() {
  return {
    ttlMinutes: REPORT_IMPORT_SESSION_TTL_MINUTES,
    opportunisticCleanupLimit: REPORT_IMPORT_SESSION_CREATE_CLEANUP_LIMIT,
    manualCleanupBatchLimit: REPORT_IMPORT_SESSION_CLEANUP_BATCH_LIMIT,
    recommendedManualFrequency: "1x por dia útil ou antes de uma rodada grande de importações.",
    recommendedManualActor: "admin",
  };
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

function sessionCollection() {
  return admin.firestore().collection(REPORT_IMPORT_SESSIONS_COLLECTION);
}

function normalizeSessionId(value) {
  return String(value || "").trim();
}

export function buildReportImportSessionExpiry(minutes = REPORT_IMPORT_SESSION_TTL_MINUTES) {
  const ttlMinutes = Number(minutes || REPORT_IMPORT_SESSION_TTL_MINUTES);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  return admin.firestore.Timestamp.fromDate(expiresAt);
}

function normalizeReportImportSessionPayload(payload = {}) {
  const selectedCategory = Number(payload.selectedCategory || 1);
  const readyRows = Array.isArray(payload.readyRows) ? payload.readyRows : [];
  const summary = payload.summary || { totalRows: 0 };

  return {
    sessionId: normalizeSessionId(payload.sessionId),
    adminUid: String(payload.adminUid || "").trim(),
    adminEmail: String(payload.adminEmail || "").trim() || null,
    fileName: String(payload.fileName || "").trim(),
    fileSize: Number(payload.fileSize || 0),
    selectedCategory,
    templateId: String(payload.templateId || "").trim() || null,
    selectedTemplate: payload.selectedTemplate || null,
    summary,
    matchSummary: payload.matchSummary || {},
    previewRows: Array.isArray(payload.previewRows) ? payload.previewRows : [],
    readyRows,
    assumptions: Array.isArray(payload.assumptions) ? payload.assumptions : [],
    snapshotVersion: 1,
    snapshotSource: "report-import-preview",
    snapshotSummary: {
      totalRows: Number(summary?.totalRows || 0),
      readyRows: readyRows.length,
      selectedCategory,
    },
    createdByRole: "admin",
    status: "ready",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: buildReportImportSessionExpiry(),
    pdfGeneratedAt: null,
    pdfGeneratedCount: 0,
    cleanupCheckedAt: null,
  };
}

export function serializeReportImportSession(snapshotOrData) {
  if (!snapshotOrData) return null;

  if (typeof snapshotOrData?.exists === "boolean" && typeof snapshotOrData?.data === "function") {
    if (!snapshotOrData.exists) return null;
    const data = serializeFirestoreValue(snapshotOrData.data() || {});
    return {
      id: snapshotOrData.id,
      sessionId: String(data.sessionId || snapshotOrData.id || "").trim(),
      ...data,
    };
  }

  const data = serializeFirestoreValue(snapshotOrData);
  return {
    id: String(data.id || data.sessionId || "").trim() || null,
    sessionId: String(data.sessionId || data.id || "").trim() || null,
    ...data,
  };
}

function buildExpiryQueryTimestamp(now = Date.now()) {
  const millis = Number(now || Date.now());
  return admin.firestore.Timestamp.fromMillis(millis);
}

export async function listExpiredReportImportSessions({
  limit = REPORT_IMPORT_SESSION_CLEANUP_BATCH_LIMIT,
  now = Date.now(),
} = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit || REPORT_IMPORT_SESSION_CLEANUP_BATCH_LIMIT), 100));
  const snap = await sessionCollection()
    .where("expiresAt", "<=", buildExpiryQueryTimestamp(now))
    .limit(safeLimit)
    .get();

  return snap.docs.map((doc) => serializeReportImportSession(doc)).filter(Boolean);
}

export async function purgeExpiredReportImportSessions({
  limit = REPORT_IMPORT_SESSION_CLEANUP_BATCH_LIMIT,
  now = Date.now(),
  actorUid = "",
  actorSource = "system",
} = {}) {
  const expiredSessions = await listExpiredReportImportSessions({ limit, now });
  if (!expiredSessions.length) {
    return {
      ok: true,
      scanned: 0,
      deleted: 0,
      actorUid: String(actorUid || "").trim() || null,
      actorSource: String(actorSource || "system").trim() || "system",
      sessionIds: [],
    };
  }

  const batch = admin.firestore().batch();
  expiredSessions.forEach((session) => {
    const sessionId = normalizeSessionId(session?.sessionId || session?.id);
    if (!sessionId) return;
    batch.delete(sessionCollection().doc(sessionId));
  });
  await batch.commit();

  return {
    ok: true,
    scanned: expiredSessions.length,
    deleted: expiredSessions.length,
    actorUid: String(actorUid || "").trim() || null,
    actorSource: String(actorSource || "system").trim() || "system",
    sessionIds: expiredSessions
      .map((session) => normalizeSessionId(session?.sessionId || session?.id))
      .filter(Boolean),
  };
}

export async function createReportImportSession(payload = {}) {
  const sessionId = randomUUID();
  const docRef = sessionCollection().doc(sessionId);
  const data = normalizeReportImportSessionPayload({ ...payload, sessionId });

  await docRef.set(data);

  let cleanup = null;
  try {
    cleanup = await purgeExpiredReportImportSessions({
      limit: REPORT_IMPORT_SESSION_CREATE_CLEANUP_LIMIT,
      actorUid: String(payload.adminUid || "").trim(),
      actorSource: "create-session",
    });
  } catch (_) {
    cleanup = null;
  }

  const saved = await docRef.get();
  const session = saved.exists ? serializeReportImportSession(saved) : { sessionId, ...serializeFirestoreValue(data) };

  return {
    id: session.id || sessionId,
    sessionId,
    cleanup,
    ...session,
  };
}

export async function getReportImportSession(sessionId) {
  const normalizedId = normalizeSessionId(sessionId);
  if (!normalizedId) return null;
  const snap = await sessionCollection().doc(normalizedId).get();
  if (!snap.exists) return null;
  return serializeReportImportSession(snap);
}

export function isReportImportSessionExpired(session) {
  const value = session?.expiresAt;
  if (!value) return true;

  const expiresAt =
    typeof value?.toMillis === "function"
      ? value.toMillis()
      : typeof value === "number"
        ? value
        : new Date(value).getTime();

  if (!Number.isFinite(expiresAt)) return true;
  return expiresAt <= Date.now();
}

export function assertReportImportSessionAccess(session, adminUid) {
  const normalizedAdminUid = String(adminUid || "").trim();

  if (!session) {
    const error = new Error("Sessão de importação não encontrada.");
    error.code = "report-import-session-not-found";
    throw error;
  }

  if (!normalizedAdminUid || String(session.adminUid || "").trim() !== normalizedAdminUid) {
    const error = new Error("A sessão de importação pertence a outro administrador.");
    error.code = "report-import-session-forbidden";
    throw error;
  }

  if (isReportImportSessionExpired(session)) {
    const error = new Error("A sessão de importação expirou. Importe a planilha novamente.");
    error.code = "report-import-session-expired";
    throw error;
  }

  return session;
}

export async function markReportImportSessionPdfGenerated(sessionId, meta = {}) {
  const normalizedId = normalizeSessionId(sessionId);
  if (!normalizedId) return null;

  await sessionCollection().doc(normalizedId).set(
    {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      pdfGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      pdfGeneratedCount: admin.firestore.FieldValue.increment(1),
      lastPdfGeneratedBy: String(meta.adminUid || "").trim() || null,
      lastPdfTemplateId: String(meta.templateId || "").trim() || null,
      lastPdfSnapshotVersion: Number(meta.snapshotVersion || 1),
    },
    { merge: true }
  );

  return getReportImportSession(normalizedId);
}

export function mapReportImportSessionToClient(session) {
  const normalized = serializeReportImportSession(session);
  if (!normalized) return null;

  return {
    importSessionId: normalized.sessionId || normalized.id || null,
    expiresAt: normalized.expiresAt || null,
    selectedCategory: normalized.selectedCategory ?? 1,
    selectedTemplate: normalized.selectedTemplate || null,
    summary: normalized.summary || { totalRows: 0 },
    matchSummary: normalized.matchSummary || {},
    previewRows: Array.isArray(normalized.previewRows) ? normalized.previewRows : [],
    assumptions: Array.isArray(normalized.assumptions) ? normalized.assumptions : [],
    file: {
      name: normalized.fileName || "",
      size: Number(normalized.fileSize || 0),
    },
  };
}
