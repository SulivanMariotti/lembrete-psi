import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

/**
 * PASSO 25/45 — Admin server-side: desativar (soft-delete) paciente
 *
 * Endpoint: POST /api/admin/patient/delete
 * Proteção: header x-admin-secret == env ADMIN_PANEL_SECRET
 *
 * Ações:
 * - subscribers/{phoneCanonical}: marca status='inactive' + deletedAt
 * - users/{uid do email}: marca status='inactive' + deletedAt
 * - history: log type='patient_deactivate'
 *
 * Observação:
 * - Não deleta documentos para preservar histórico (appointments, attendance_logs, patient_notes).
 */

function getServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = Buffer.from(b64, 'base64').toString('utf-8');
    return JSON.parse(json);
  }
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_ADMIN_SERVICE_ACCOUNT(_B64) env var');
  return JSON.parse(raw);
}

function initAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = getServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhoneCanonical(input) {
  let d = onlyDigits(input).replace(/^0+/, '');
  if (!d) return '';
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
}

function makeUidFromEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return '';
  const b64 = Buffer.from(clean, 'utf-8').toString('base64').replace(/=+$/g, '');
  return (`p_${b64}`).slice(0, 28);
}

export async function POST(req) {
  try {
    initAdmin();

    const secret = req.headers.get('x-admin-secret') || '';
    const expected = process.env.ADMIN_PANEL_SECRET || '';
    if (!expected || secret !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const phoneCanonical = normalizePhoneCanonical(body?.phoneCanonical || body?.phone || '');
    const email = String(body?.email || '').trim().toLowerCase();
    const reason = String(body?.reason || 'admin_deactivate').trim();

    if (!phoneCanonical && !email) {
      return NextResponse.json({ ok: false, error: 'Missing phoneCanonical or email' }, { status: 400 });
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Soft-delete subscriber
    if (phoneCanonical) {
      await db.collection('subscribers').doc(phoneCanonical).set(
        {
          status: 'inactive',
          inactiveReason: reason,
          deletedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    // Soft-delete user (uid determinístico)
    let uid = null;
    if (email) {
      uid = makeUidFromEmail(email);
      if (uid) {
        await db.collection('users').doc(uid).set(
          {
            status: 'inactive',
            inactiveReason: reason,
            deletedAt: now,
            updatedAt: now,
          },
          { merge: true }
        );
      }
    }

    await db.collection('history').add({
      type: 'patient_deactivate',
      uid: uid || null,
      email: email || null,
      phoneCanonical: phoneCanonical || null,
      reason,
      createdAt: now,
    });

    return NextResponse.json({ ok: true, uid, phoneCanonical, email });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || 'Erro' }, { status: 500 });
  }
}
