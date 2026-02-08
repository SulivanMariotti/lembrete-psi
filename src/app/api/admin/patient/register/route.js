import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

/**
 * PASSO 25/45 — Admin server-side: cadastrar/editar paciente com service account
 *
 * Endpoint: POST /api/admin/patient/register
 * Proteção: header x-admin-secret == env ADMIN_PANEL_SECRET
 *
 * Grava/atualiza:
 * - subscribers/{phoneCanonical} (docId canônico: DDD+número, sem 55)
 * - users/{uid determinístico do email} (uid derivado do email)
 *
 * Suporta edição segura (evitar duplicidade) com:
 * - previousPhoneCanonical (opcional): se telefone mudou, marca o doc antigo como merged
 * - previousEmail (opcional): se email mudou, marca o doc antigo em users como merged
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

// phoneCanonical: DDD + número (10/11), SEM 55
function normalizePhoneCanonical(input) {
  let d = onlyDigits(input).replace(/^0+/, '');
  if (!d) return '';
  // remove 55 se vier (12/13 dígitos)
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
}

// phoneE164: 55 + canônico
function phoneToE164(phoneCanonical) {
  const c = normalizePhoneCanonical(phoneCanonical);
  if (!c) return '';
  if (c.length === 10 || c.length === 11) return `55${c}`;
  return c;
}

// Compatível com /api/patient-auth (UID determinístico por email)
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

    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const phoneInput = String(body?.phone || '');

    // opcionais para edição
    const previousPhoneCanonical = normalizePhoneCanonical(body?.previousPhoneCanonical || '');
    const previousEmail = String(body?.previousEmail || '').trim().toLowerCase();

    if (!name || !email || !phoneInput) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const phoneCanonical = normalizePhoneCanonical(phoneInput);
    const phoneE164 = phoneToE164(phoneCanonical);

    if (!phoneCanonical || !(phoneCanonical.length === 10 || phoneCanonical.length === 11)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid phone. Use DDD+número (10/11 dígitos), sem 55.' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // === upsert atual ===
    await db.collection('subscribers').doc(phoneCanonical).set(
      {
        name,
        email,
        phone: phoneCanonical, // compatibilidade: mantém phone == canônico
        phoneCanonical,
        phoneE164,
        role: 'patient',
        updatedAt: now,
      },
      { merge: true }
    );

    const uid = makeUidFromEmail(email);
    if (uid) {
      await db.collection('users').doc(uid).set(
        {
          uid,
          email,
          name,
          phone: phoneCanonical,
          phoneCanonical,
          phoneE164,
          role: 'patient',
          updatedAt: now,
        },
        { merge: true }
      );
    }

    // === reconciliação leve em edição (evita duplicidade) ===
    // Se mudou o telefone, não deletamos o antigo (pode ter histórico), mas marcamos como "merged".
    if (previousPhoneCanonical && previousPhoneCanonical !== phoneCanonical) {
      await db.collection('subscribers').doc(previousPhoneCanonical).set(
        {
          mergedTo: phoneCanonical,
          mergedAt: now,
          mergedReason: 'admin_edit_phone',
          updatedAt: now,
        },
        { merge: true }
      );
    }

    // Se mudou o email, marcamos o user antigo como "merged" (uid diferente).
    if (previousEmail && previousEmail !== email) {
      const prevUid = makeUidFromEmail(previousEmail);
      if (prevUid && prevUid !== uid) {
        await db.collection('users').doc(prevUid).set(
          {
            mergedToUid: uid || null,
            mergedToEmail: email,
            mergedAt: now,
            mergedReason: 'admin_edit_email',
            updatedAt: now,
          },
          { merge: true }
        );
      }
    }

    await db.collection('history').add({
      type: 'patient_upsert',
      uid: uid || null,
      phoneCanonical,
      previousPhoneCanonical: previousPhoneCanonical || null,
      previousEmail: previousEmail || null,
      createdAt: now,
    });

    return NextResponse.json({
      ok: true,
      uid,
      phoneCanonical,
      phoneE164,
      previousPhoneCanonical: previousPhoneCanonical || null,
      previousEmail: previousEmail || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || 'Erro' }, { status: 500 });
  }
}
