import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { rateLimit } from '@/lib/server/rateLimit';
import { adminError } from '@/lib/server/adminError';

function safeInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function contains(hay, needle) {
  if (!needle) return true;
  const h = String(hay || '').toLowerCase();
  const n = String(needle || '').toLowerCase();
  return h.includes(n);
}

export async function GET(req) {
  let gate = null;
  try {
    gate = await requireAdmin(req);
    if (!gate.ok) return gate.res;

    const rl = await rateLimit(req, {
      bucket: 'admin:audit:list',
      uid: gate.uid,
      limit: 120,
      windowMs: 60_000,
    });
    if (!rl.ok) return rl.res;

    const url = new URL(req.url);
    const days = Math.max(1, Math.min(90, safeInt(url.searchParams.get('days'), 7)));
    const limit = Math.max(10, Math.min(200, safeInt(url.searchParams.get('limit'), 50)));
    const action = String(url.searchParams.get('action') || '').trim();
    const q = String(url.searchParams.get('q') || '').trim();
    const before = safeInt(url.searchParams.get('before'), 0);

    const now = Date.now();
    const cutoffDate = new Date(now - days * 24 * 60 * 60 * 1000);
    const cutoffTs = admin.firestore.Timestamp.fromDate(cutoffDate);

    const db = admin.firestore();

    // Query base (createdAt range + order only, to avoid composite index requirements)
    let query = db
      .collection('audit_logs')
      .where('createdAt', '>=', cutoffTs)
      .orderBy('createdAt', 'desc');

    if (before && Number.isFinite(before) && before > 0) {
      query = query.where('createdAt', '<', admin.firestore.Timestamp.fromMillis(before));
    }

    // Fetch more than needed to allow in-memory filtering by action/q
    const fetchLimit = Math.min(400, Math.max(limit, limit * 4));
    query = query.limit(fetchLimit);

    const snap = await query.get();

    let items = snap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      const ts = data.createdAt;
      const createdAtMs = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null;

      return {
        id: docSnap.id,
        createdAtMs,
        actorUid: data.actorUid || null,
        actorEmail: data.actorEmail || null,
        action: data.action || null,
        status: data.status || null,
        target: data.target || null,
        ip: data.ip || null,
        ua: data.ua || null,
        method: data.method || null,
        path: data.path || null,
        meta: data.meta || null,
      };
    });

    if (action) {
      const a = action.toLowerCase();
      items = items.filter((it) => String(it.action || '').toLowerCase().includes(a));
    }

    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((it) => {
        if (contains(it.action, needle)) return true;
        if (contains(it.target, needle)) return true;
        if (contains(it.actorEmail, needle)) return true;
        if (contains(it.actorUid, needle)) return true;
        if (contains(it.path, needle)) return true;
        try {
          return contains(JSON.stringify(it.meta || {}), needle);
        } catch (_) {
          return false;
        }
      });
    }

    items = items.slice(0, limit);
    const last = items[items.length - 1];
    const nextBefore = last?.createdAtMs ? Number(last.createdAtMs) : null;

    return NextResponse.json({ ok: true, items, nextBefore, remaining: rl.remaining });
  } catch (e) {
    return adminError({ req, auth: gate?.ok ? gate : null, action: 'audit_list', err: e });
  }
}
