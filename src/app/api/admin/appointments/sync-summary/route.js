import { NextResponse } from 'next/server';
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
export const runtime = "nodejs";
/**
 * PASSO 27/45 — Server-side log do resumo de sincronização
 *
 * Endpoint: POST /api/admin/appointments/sync-summary
 * Proteção: Authorization Bearer (idToken) + role admin
 *
 * Body esperado:
 * {
 *   uploadId: string,
 *   totalAppointments: number,
 *   uniquePatients: number,
 *   dateRange?: { firstISO?: string|null, lastISO?: string|null },
 *   fallbackServiceCount?: number
 * }
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

export async function POST(req) {
  try {
    initAdmin();

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const body = await req.json().catch(() => ({}));

    const uploadId = String(body?.uploadId || '').trim();
    const totalAppointments = Number(body?.totalAppointments || 0);
    const uniquePatients = Number(body?.uniquePatients || 0);
    const fallbackServiceCount = Number(body?.fallbackServiceCount || 0);

    const firstISO = body?.dateRange?.firstISO ? String(body.dateRange.firstISO) : null;
    const lastISO = body?.dateRange?.lastISO ? String(body.dateRange.lastISO) : null;

    if (!uploadId) {
      return NextResponse.json({ ok: false, error: 'Missing uploadId' }, { status: 400 });
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('history').add({
      type: 'appointments_sync_summary',
      uploadId,
      totalAppointments,
      uniquePatients,
      dateRange: { firstISO, lastISO },
      fallbackServiceCount,
      createdAt: now,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || 'Erro' }, { status: 500 });
  }
}