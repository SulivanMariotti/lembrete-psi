import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCcw, ChevronDown, FileText } from 'lucide-react';
import { Card, Button } from '../DesignSystem';
import { adminFetch } from '../../services/adminApi';

// Admin → Auditoria
// Fonte: coleção Firestore `audit_logs`

const ACTION_PRESETS = [
  '',
  'PATIENT_REGISTER',
  'PATIENT_DEACTIVATE',
  'ATTENDANCE_IMPORT',
  'ATTENDANCE_FOLLOWUP_SEND',
  'PUSH_SEND',
  'CONFIG_SAVE',
  'PAIR_CODE_CREATE',
];

function formatDt(ms) {
  if (!ms) return '—';
  try {
    const d = new Date(Number(ms));
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch (_) {
    return '—';
  }
}

function pillClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success' || s === 'ok') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (s === 'error' || s === 'failed' || s === 'fail') return 'bg-red-50 text-red-700 border-red-100';
  if (s === 'warning') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-slate-50 text-slate-700 border-slate-100';
}

function contains(hay, needle) {
  if (!needle) return true;
  const h = String(hay || '').toLowerCase();
  const n = String(needle || '').toLowerCase();
  return h.includes(n);
}

export default function AdminAuditTab({ showToast }) {
  const [days, setDays] = useState(7); // 1=24h
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [selected, setSelected] = useState(null);

  const effectiveQuery = useMemo(() => {
    return {
      days,
      action: String(action || '').trim(),
      q: String(q || '').trim(),
    };
  }, [days, action, q]);

  async function load({ append = false } = {}) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('days', String(effectiveQuery.days));
      params.set('limit', '60');
      if (effectiveQuery.action) params.set('action', effectiveQuery.action);
      if (effectiveQuery.q) params.set('q', effectiveQuery.q);
      if (append && nextBefore) params.set('before', String(nextBefore));

      const res = await adminFetch(`/api/admin/audit/list?${params.toString()}`, { method: 'GET' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const msg = data?.error || 'Falha ao carregar auditoria.';
        setError(msg);
        showToast?.(msg, 'error');
        if (!append) {
          setItems([]);
          setNextBefore(null);
        }
        return;
      }

      const newItems = Array.isArray(data?.items) ? data.items : [];
      const nb = data?.nextBefore ?? null;

      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setNextBefore(nb);
    } catch (e) {
      const msg = 'Falha ao carregar auditoria.';
      setError(msg);
      showToast?.(msg, 'error');
      if (!append) {
        setItems([]);
        setNextBefore(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // reset paginação em mudanças de filtro
    setNextBefore(null);
    load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveQuery.days, effectiveQuery.action, effectiveQuery.q]);

  const isEmpty = !loading && !error && (items?.length || 0) === 0;
  const qLower = String(q || '').trim().toLowerCase();

  const clientFiltered = useMemo(() => {
    // A API já filtra, mas o client também filtra para responsividade do input.
    let out = Array.isArray(items) ? items : [];
    if (!qLower) return out;
    out = out.filter((it) => {
      if (contains(it.action, qLower)) return true;
      if (contains(it.target, qLower)) return true;
      if (contains(it.actorEmail, qLower)) return true;
      if (contains(it.actorUid, qLower)) return true;
      if (contains(it.path, qLower)) return true;
      try {
        return contains(JSON.stringify(it.meta || {}), qLower);
      } catch (_) {
        return false;
      }
    });
    return out;
  }, [items, qLower]);

  return (
    <>
      <Card title="Auditoria" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">Visão de responsabilidade.</span> Este painel registra ações críticas do Admin.
              Útil para rastrear importações, cadastros e disparos — sem perder a trilha.
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 flex items-center gap-2">
              {[{ d: 1, label: '24h' }, { d: 7, label: '7 dias' }, { d: 30, label: '30 dias' }].map((opt) => (
                <button
                  key={opt.d}
                  onClick={() => setDays(opt.d)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    days === opt.d
                      ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  <option value="">Todas as ações</option>
                  {ACTION_PRESETS.filter(Boolean).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por paciente, telefone, ação, admin…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
            </div>

            <div className="md:col-span-1 flex">
              <Button
                variant="secondary"
                onClick={() => load({ append: false })}
                icon={RefreshCcw}
                className="w-full"
                disabled={loading}
                title="Atualizar"
              >
                {''}
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Quando</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Ação</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Alvo</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Admin</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Rota</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Detalhes</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (clientFiltered?.length || 0) === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={7}>
                        Carregando…
                      </td>
                    </tr>
                  )}

                  {error && (clientFiltered?.length || 0) === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-red-600" colSpan={7}>
                        {error}
                      </td>
                    </tr>
                  )}

                  {isEmpty && (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={7}>
                        Nenhum registro no período.
                      </td>
                    </tr>
                  )}

                  {(clientFiltered || []).map((it) => (
                    <tr key={it.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDt(it.createdAtMs)}</td>
                      <td className="px-4 py-3 text-slate-900 font-semibold">{it.action || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${pillClass(it.status)}`}>
                          {String(it.status || '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[240px] truncate" title={it.target || ''}>
                        {it.target || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate" title={it.actorEmail || it.actorUid || ''}>
                        {it.actorEmail || it.actorUid || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[260px] truncate" title={it.path || ''}>
                        {it.method ? `${it.method} ` : ''}
                        {it.path || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelected(it)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                        >
                          <FileText size={14} /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {clientFiltered?.length ? `Mostrando ${clientFiltered.length} registro(s).` : '—'}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => load({ append: true })} disabled={loading || !nextBefore}>
                  Carregar mais
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal de detalhes */}
      {selected && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-500 uppercase">Detalhes</div>
                <div className="mt-1 text-sm font-semibold text-slate-900 truncate">{selected.action || '—'}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDt(selected.createdAtMs)}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
              >
                Fechar
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase">Admin</div>
                  <div className="mt-1 text-sm text-slate-900">{selected.actorEmail || '—'}</div>
                  <div className="mt-1 text-xs text-slate-500">UID: {selected.actorUid || '—'}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase">Rota</div>
                  <div className="mt-1 text-sm text-slate-900">
                    {selected.method ? `${selected.method} ` : ''}
                    {selected.path || '—'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">IP: {selected.ip || '—'}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase">Meta</div>
                </div>
                <pre className="p-4 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selected.meta || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
