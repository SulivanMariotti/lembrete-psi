// src/app/api/admin/patients/list/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
/**
 * Admin API: List Patients (server-side via Firebase Admin SDK)
 *
 * Fix (urgent): remove deactivated patients from the list.
 * A patient is considered INACTIVE if ANY of these are true:
 *  - status in ["inactive","disabled","archived","deleted"]
 *  - isActive === false
 *  - disabled === true
 *  - disabledAt exists
 *  - deletedAt exists
 *  - mergedTo exists (duplicate merged away)
 *
 * Also restores hasPushToken compatibility:
 *  - subscribers/{phoneCanonical}.token OR .pushToken
 *  - and subscribers doc isActive !== false
 *
 * Security: Authorization Bearer (idToken) + role admin
 */

function getServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    return JSON.parse(json);
  }
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_SERVICE_ACCOUNT(_B64) env var");
  return JSON.parse(raw);
}

function initAdmin() {
  if (admin.apps?.length) return admin;
  const serviceAccount = getServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

function toIso(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string") return ts;
  return null;
}

function clampLimit(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return 500;
  return Math.max(1, Math.min(2000, Math.floor(x)));
}

function parseBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = (v ?? "").toString().toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function isInactivePatient(d) {
  const status = (d?.status ?? "active").toString().toLowerCase().trim();
  if (["inactive", "disabled", "archived", "deleted"].includes(status)) return true;

  if (d?.isActive === false) return true;
  if (d?.disabled === true) return true;

  if (d?.disabledAt) return true;
  if (d?.deletedAt) return true;

  if (d?.mergedTo) return true;

  return false;
}

async function addHasPushToken(db, patients) {
  const phones = patients.map((p) => p.phoneCanonical).filter(Boolean);
  const chunkSize = 25; // small to avoid any per-request constraints
  const chunks = [];
  for (let i = 0; i < phones.length; i += chunkSize) chunks.push(phones.slice(i, i + chunkSize));

  const hasMap = new Map();

  for (const chunk of chunks) {
    const snaps = await Promise.all(chunk.map((ph) => db.collection("subscribers").doc(ph).get()));
    snaps.forEach((snap, idx) => {
      const ph = chunk[idx];
      const data = snap.exists ? (snap.data() || {}) : {};
      const token = data?.token || data?.pushToken || null;
      const active = data?.isActive !== false;
      hasMap.set(ph, Boolean(token) && active);
    });
  }

  return patients.map((p) => ({ ...p, hasPushToken: hasMap.get(p.phoneCanonical) || false }));
}

async function listPatientsStrict({ limit, includePush }) {
  const { firestore } = initAdmin();
  const db = firestore();

  // Strict role filter (after repair-roles)
  const snap = await db
    .collection("users")
    .where("role", "==", "patient")
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();

  const raw = [];
  snap.forEach((doc) => {
    const d = doc.data() || {};
    raw.push({
      uid: doc.id,
      patientExternalId: d.patientExternalId ?? null,
      name: (d.name ?? "").toString().trim(),
      phoneCanonical: (d.phoneCanonical ?? "").toString().trim(),
      phone: (d.phone ?? "").toString().trim(),
      email: (d.email ?? "").toString().trim(),
      status: (d.status ?? "active").toString(),
      contractAcceptedVersion: Number(d?.contractAcceptedVersion ?? 0),
      contractAcceptedAt: toIso(d?.contractAcceptedAt),
      pairCodeStatus: (d.pairCodeStatus ?? '').toString(),
      pairCodeLast4: (d.pairCodeLast4 ?? '').toString(),
      pairCodeCreatedAt: toIso(d?.pairCodeCreatedAt),
      pairCodeUsedAt: toIso(d?.pairCodeUsedAt),
      isActive: d?.isActive ?? null,
      disabled: d?.disabled ?? null,
      disabledAt: toIso(d?.disabledAt),
      deletedAt: toIso(d?.deletedAt),
      mergedTo: d?.mergedTo ?? null,
      createdAt: toIso(d?.createdAt),
      updatedAt: toIso(d?.updatedAt),
      _inactive: isInactivePatient(d),
    });
  });

  // Remove ghosts / incomplete / inactive
  const filtered = raw.filter((p) => {
    if (!p.name) return false;
    if (!p.phoneCanonical && !p.phone) return false;
    if (p._inactive) return false;
    return true;
  });

  // De-duplicate by patientExternalId (keep most recently updated; fallback uid)
  const map = new Map();
  for (const p of filtered) {
    const key = (p.patientExternalId || p.uid || "").toString();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, p);
      continue;
    }
    const prevUpdated = Date.parse(prev.updatedAt || prev.createdAt || "") || 0;
    const curUpdated = Date.parse(p.updatedAt || p.createdAt || "") || 0;
    if (curUpdated >= prevUpdated) map.set(key, p);
  }

  let patients = Array.from(map.values()).sort((a, b) => {
    const aT = Date.parse(a.updatedAt || a.createdAt || "") || 0;
    const bT = Date.parse(b.updatedAt || b.createdAt || "") || 0;
    return bT - aT;
  });

  // Remove internal field
  patients = patients.map(({ _inactive, ...rest }) => rest);

  if (includePush) {
    patients = await addHasPushToken(db, patients);
  }

  return { rawCount: raw.length, count: patients.length, patients };
}

function jsonError(err) {
  const status = err?.statusCode || 500;
  return NextResponse.json(
    { ok: false, error: err?.message || "Unknown error", status },
    { status }
  );
}

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const limit = clampLimit(body?.limit);
    const includePush = parseBool(body?.includePush ?? false);

    const out = await listPatientsStrict({ limit, includePush });
    return NextResponse.json({ ok: true, ...out }, { status: 200 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const url = new URL(req.url);
    const limit = clampLimit(url.searchParams.get("limit"));
    const includePush = parseBool(url.searchParams.get("includePush"));

    const out = await listPatientsStrict({ limit, includePush });
    return NextResponse.json({ ok: true, ...out }, { status: 200 });
  } catch (err) {
    return jsonError(err);
  }
}
