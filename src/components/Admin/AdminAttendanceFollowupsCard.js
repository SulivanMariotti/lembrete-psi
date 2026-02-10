import React, { useMemo, useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { Button, Card } from '../DesignSystem';

/**
 * Card: Disparos por Constância (Presença/Falta)
 * - Dispara follow-ups server-side com base em attendance_logs
 * - Prévia (dryRun) -> habilita Disparar
 * - Não cria qualquer funcionalidade de cancelar/reagendar pelo paciente.
 */
export default function AdminAttendanceFollowupsCard({ showToast }) {
  const [followupDays, setFollowupDays] = useState(30);
  const [followupLimit, setFollowupLimit] = useState(200);

  const [followupPreviewLoading, setFollowupPreviewLoading] = useState(false);
  const [followupSendLoading, setFollowupSendLoading] = useState(false);

  const [previewResult, setPreviewResult] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  const [lastPreviewKey, setLastPreviewKey] = useState(null);
  const [lastPreviewAt, setLastPreviewAt] = useState(null);
  const [lastSendAt, setLastSendAt] = useState(null);

  const followupKey = useMemo(
    () => `${Number(followupDays) || 30}:${Number(followupLimit) || 200}`,
    [followupDays, followupLimit]
  );

  const followupBusy = followupPreviewLoading || followupSendLoading;

  const adminSecret = useMemo(() => {
    // rota exige x-admin-secret == NEXT_PUBLIC_ADMIN_PANEL_SECRET (se definido)
    // como o painel é restrito ao Admin, usar NEXT_PUBLIC_* aqui é ok.
    return process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || '';
  }, []);

  const previewStale = Boolean(previewResult?.ok) && lastPreviewKey !== followupKey;
  const isPreviewValid = Boolean(previewResult?.ok) && lastPreviewKey === followupKey;

  const callFollowups = async ({ dryRun }) => {
    if (followupBusy) return; // evita duplo clique / concorrência
    if (dryRun) setFollowupPreviewLoading(true);
    else setFollowupSendLoading(true);

    try {
      const days = Math.max(1, Number(followupDays) || 30);
      const limit = Math.max(1, Number(followupLimit) || 200);

      const res = await fetch('/api/admin/attendance/send-followups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminSecret ? { 'x-admin-secret': adminSecret } : {}),
        },
        body: JSON.stringify({ days, limit, dryRun }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Falha ao executar follow-ups de constância');
      }

      if (dryRun) {
        setPreviewResult(data);
        setLastPreviewKey(followupKey);
        setLastPreviewAt(Date.now());
        setSendResult(null);
        showToast?.('Prévia gerada. Se estiver tudo ok, clique em Disparar.', 'success');
      } else {
        setSendResult(data);
        setLastSendAt(Date.now());
        showToast?.('Disparos enviados e registrados em histórico.', 'success');
      }
    } catch (e) {
      const errObj = { ok: false, error: e?.message || 'Erro ao executar follow-ups' };
      if (dryRun) setPreviewResult(errObj);
      else setSendResult(errObj);
      showToast?.(e?.message || 'Erro ao executar follow-ups', 'error');
    } finally {
      if (dryRun) setFollowupPreviewLoading(false);
      else setFollowupSendLoading(false);
    }
  };

  return (
    <Card className="p-5 mt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Disparos por Constância (Presença/Falta)</h3>
          <p className="text-sm text-slate-600">
            Envia mensagens de reforço quando houve presença e psicoeducação quando houve falta. O objetivo é sustentar o vínculo e a
            consistência do processo terapêutico.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Regras do produto: o paciente não cancela/reagenda por aqui. O foco é cuidado ativo + responsabilização.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-violet-600" />
          <span className="text-xs text-slate-500">Follow-up server-side</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-600">Dias (padrão 30)</label>
          <input
            type="number"
            min={1}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200"
            value={followupDays}
            onChange={(e) => {
              setFollowupDays(e.target.value);
              setPreviewResult(null);
              setSendResult(null);
            }}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Limite (padrão 200)</label>
          <input
            type="number"
            min={1}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200"
            value={followupLimit}
            onChange={(e) => {
              setFollowupLimit(e.target.value);
              setPreviewResult(null);
              setSendResult(null);
            }}
          />
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={() => callFollowups({ dryRun: true })} disabled={followupBusy} className="w-full">
            {followupPreviewLoading ? 'Gerando...' : 'Prévia (dryRun)'}
          </Button>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Ao mudar <span className="font-medium">Dias</span> ou <span className="font-medium">Limite</span>, a prévia expira e precisa ser gerada novamente.
      </div>

      <div className="mt-3">
        <Button onClick={() => callFollowups({ dryRun: false })} disabled={followupBusy || !isPreviewValid} className="w-full">
          <span className="inline-flex items-center gap-2">
            <Send className="w-4 h-4" />
            {followupSendLoading ? 'Disparando...' : 'Disparar'}
          </span>
        </Button>

        {previewStale && (
          <div className="mt-2 text-xs text-amber-700">Você alterou dias/limite após a prévia. Gere uma nova prévia para habilitar o disparo.</div>
        )}
      </div>

      {/* Resumos: Prévia e Disparo */}
      {(previewResult || sendResult) && (
        <div className="mt-4 space-y-3">
          {/* Prévia */}
          {previewResult && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">
                  Prévia (dryRun)
                  {lastPreviewAt && (
                    <span className="ml-2 text-xs font-normal text-slate-500">• última prévia em {new Date(lastPreviewAt).toLocaleString()}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {previewResult?.fromIsoDate && previewResult?.toIsoDate
                    ? `${previewResult.fromIsoDate} → ${previewResult.toIsoDate}`
                    : `últimos ${Number(followupDays) || 30} dias`}
                </div>
              </div>

              <div className="px-4 py-3 text-sm text-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-slate-500">totalLogs</div>
                  <div className="font-semibold">{previewResult.totalLogs ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">candidates</div>
                  <div className="font-semibold">{previewResult.candidates ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">blocked</div>
                  <div className="font-semibold">{previewResult.blocked ?? '-'}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">sent</div>
                  <div className="font-semibold">0</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">presentes</div>
                  <div className="font-semibold">{previewResult.byStatus?.present ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">faltas</div>
                  <div className="font-semibold">{previewResult.byStatus?.absent ?? '-'}</div>
                </div>
              </div>

              {!previewResult.ok && <div className="px-4 pb-3 text-sm text-red-600">Erro: {previewResult.error}</div>}
            </div>
          )}

          {/* Disparo */}
          {sendResult && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">
                  Último disparo
                  {lastSendAt && (
                    <span className="ml-2 text-xs font-normal text-slate-500">• enviado em {new Date(lastSendAt).toLocaleString()}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {sendResult?.fromIsoDate && sendResult?.toIsoDate
                    ? `${sendResult.fromIsoDate} → ${sendResult.toIsoDate}`
                    : `últimos ${Number(followupDays) || 30} dias`}
                </div>
              </div>

              <div className="px-4 py-3 text-sm text-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-slate-500">totalLogs</div>
                  <div className="font-semibold">{sendResult.totalLogs ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">candidates</div>
                  <div className="font-semibold">{sendResult.candidates ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">blocked</div>
                  <div className="font-semibold">{sendResult.blocked ?? '-'}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">sent</div>
                  <div className="font-semibold">{sendResult.sent ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">presentes</div>
                  <div className="font-semibold">{sendResult.byStatus?.present ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">faltas</div>
                  <div className="font-semibold">{sendResult.byStatus?.absent ?? '-'}</div>
                </div>
              </div>

              {!sendResult.ok && <div className="px-4 pb-3 text-sm text-red-600">Erro: {sendResult.error}</div>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
