import { NextResponse } from 'next/server';
import admin from "@/lib/firebaseAdmin";
export const runtime = "nodejs";
// POST /api/admin/users/repair-roles
// Corrige docs legados em users/{uid} que ficaram com role ausente (null/undefined),
// definindo role:"patient" quando o registro aparenta ser um paciente válido.
// Segurança: exige x-admin-secret == NEXT_PUBLIC_ADMIN_PANEL_SECRET (se definido).

function getAdminApp() {
  if (admin.apps?.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error('Missing Firebase Admin envs (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

function getDb() {
  return getAdminApp().firestore();
}

function isTruthy(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

export async function POST(req) {
  try {
    const expected = process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || '';
    const secretHeader = req.headers.get('x-admin-secret') || '';
    if (expected && secretHeader !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit || 500), 1), 2000);
    const dryRun = Boolean(body?.dryRun);

    const db = getDb();

    const snap = await db.collection('users').limit(limit).get();
    const docs = snap.docs;

    let scanned = 0;
    let updated = 0;
    let skipped = 0;

    const updates = [];
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const d of docs) {
      scanned += 1;
      const data = d.data() || {};

      const role = data?.role;
      const hasRole = typeof role === 'string' && role.trim().length > 0;
      if (hasRole) {
        skipped += 1;
        continue;
      }

      const status = String(data?.status || 'active').toLowerCase();
      if (status === 'inactive') {
        skipped += 1;
        continue;
      }

      const name = String(data?.name || '').trim();
      const phoneCanonical = String(data?.phoneCanonical || data?.phone || '').trim();
      const patientExternalId = String(data?.patientExternalId || '').trim();

      // Considera "paciente válido" quando tem os identificadores essenciais.
      if (!isTruthy(name) || !isTruthy(phoneCanonical) || !isTruthy(patientExternalId)) {
        skipped += 1;
        continue;
      }

      updated += 1;

      if (!dryRun) {
        updates.push(
          d.ref.set(
            {
              role: 'patient',
              // manter compatibilidade
              phoneCanonical,
              phone: phoneCanonical,
              updatedAt: now,
            },
            { merge: true }
          )
        );
      }
    }

    if (!dryRun && updates.length) {
      // Executa updates com concorrência simples (Promise.all ok para até ~2k)
      await Promise.all(updates);
    }

    // Log em history
    try {
      if (!dryRun) {
        await db.collection('history').add({
          action: 'repair_roles',
          scope: 'users',
          scanned,
          updated,
          skipped,
          createdAt: now,
        });
      }
    } catch (e) {
      console.warn('[repair-roles] failed to write history log', e);
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      scanned,
      updated,
      skipped,
    });
  } catch (e) {
    console.error('[admin/users/repair-roles] error', e);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}