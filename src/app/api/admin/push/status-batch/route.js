import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

/**
 * PASSO 28/45 — Batch status de push (server-side)
 *
 * Endpoint: POST /api/admin/push/status-batch
 * Proteção: header x-admin-secret == env ADMIN_PANEL_SECRET
 *
 * Body:
 * { phones: string[] } // phoneCanonical (DDD+número, sem 55)
 *
 * Response:
 * { ok: true, results: { [phoneCanonical]: { hasToken: boolean } } }
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

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizePhoneCanonical(input) {
  let d = onlyDigits(input).replace(/^0+/, '');
  if (!d) return '';
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
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
    const phonesRaw = Array.isArray(body?.phones) ? body.phones : [];
    const phones = phonesRaw
      .map((p) => normalizePhoneCanonical(p))
      .filter((p) => p && (p.length === 10 || p.length === 11));

    // Limite leve para não abusar em dev
    const limited = phones.slice(0, 500);

    const db = admin.firestore();
    const results = {};

    // Busca docs em paralelo com chunk (Firestore getAll não aceita refs vazios)
    const chunkSize = 50;
    for (let i = 0; i < limited.length; i += chunkSize) {
      const chunk = limited.slice(i, i + chunkSize);
      const refs = chunk.map((p) => db.collection('subscribers').doc(p));
      const snaps = await db.getAll(...refs);

      snaps.forEach((snap, idx) => {
        const phone = chunk[idx];
        const data = snap.exists ? snap.data() : null;
        const token = data?.pushToken || data?.fcmToken || data?.token || null;
        results[phone] = { hasToken: Boolean(token) };
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || 'Erro' }, { status: 500 });
  }
}
