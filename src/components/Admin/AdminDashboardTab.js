import React, { useMemo } from 'react';
import {
  Activity,
  Users,
  Mail,
  CheckCircle,
  CalendarCheck,
  UserMinus,
  AlertTriangle,
  Upload,
  Send,
  ArrowRight,
  Copy,
} from 'lucide-react';
import { Card, StatCard, Button } from '../DesignSystem';

export default function AdminDashboardTab({
  activeUsersCount = 0,
  subscribersCount = 0,
  totalMessagesSent = 0,

  // Constância Terapêutica
  attendancePeriodDays = 30,
  setAttendancePeriodDays = () => {},
  attendanceLoading = false,
  attendanceError = null,
  attendanceStats = { present: 0, absent: 0, total: 0, rate: 0, topAbsent: [] },
  patientNameByPhone = {},

  // Ações rápidas
  onGoToAttendance = () => {},
  onGoToAttendanceImport = () => {},
  onGoToAttendanceFollowups = () => {},
}) {
  const atRisk = useMemo(() => {
    const rows = Array.isArray(attendanceStats?.topAbsent) ? attendanceStats.topAbsent : [];
    return rows.filter((r) => Number(r?.count || 0) >= 2);
  }, [attendanceStats]);

  const resolvePatientName = (phoneCanonical) => {
    const key = String(phoneCanonical || '').replace(/\D/g, '');
    return patientNameByPhone?.[key] || null;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
    } catch (e) {
      // ignore
    }
  };

  return (
    <>
      {/* Constância Terapêutica (centro do dashboard) */}
      <Card title="Constância Terapêutica" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">
              A evolução acontece na continuidade. Este painel te dá visão rápida de presença e faltas no período.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-2">Período:</span>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setAttendancePeriodDays(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  attendancePeriodDays === d
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {attendanceError && <div className="mt-4 text-sm text-red-600">{attendanceError}</div>}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title={`Presenças (${attendancePeriodDays} dias)`}
            value={attendanceLoading ? '...' : Number(attendanceStats?.present || 0)}
            icon={CalendarCheck}
          />
          <StatCard
            title={`Faltas (${attendancePeriodDays} dias)`}
            value={attendanceLoading ? '...' : Number(attendanceStats?.absent || 0)}
            icon={UserMinus}
          />
          <StatCard
            title="Taxa de Comparecimento"
            value={attendanceLoading ? '...' : `${Number(attendanceStats?.rate || 0)}%`}
            icon={Activity}
          />
        </div>

        {/* Mini alerta: risco de ruptura (>=2 faltas) */}
        {!attendanceLoading && atRisk.length > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <AlertTriangle className="text-amber-600 mt-0.5" size={18} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-800">
                Atenção: {atRisk.length} paciente(s) com 2+ faltas no período
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {atRisk
                  .slice(0, 3)
                  .map((r) => {
                    const nm = resolvePatientName(r.phoneCanonical);
                    return nm ? `${nm} • ${r.phoneCanonical} (${r.count})` : `${r.phoneCanonical} (${r.count})`;
                  })
                  .join(' • ')}
                {atRisk.length > 3 ? ' • ...' : ''}
              </div>
            </div>
            <button
              onClick={onGoToAttendance}
              className="text-xs font-semibold text-violet-700 hover:text-violet-900 flex items-center gap-1"
            >
              Ver <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Top faltas */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Faltas mais frequentes</h4>
            <span className="text-xs text-slate-500">Top 5</span>
          </div>

          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-semibold text-slate-600">Paciente</th>
                  <th className="px-4 py-2 font-semibold text-slate-600">Faltas</th>
                </tr>
              </thead>
              <tbody>
                {!attendanceLoading && (!attendanceStats?.topAbsent || attendanceStats.topAbsent.length === 0) ? (
                  <tr>
                    <td className="px-4 py-3 text-slate-500" colSpan={2}>
                      Sem dados de faltas no período.
                    </td>
                  </tr>
                ) : (
                  (attendanceStats?.topAbsent || []).slice(0, 5).map((row) => (
                    <tr key={row.phoneCanonical} className="border-t border-slate-200">
                      <td className="px-4 py-2 text-slate-700">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 truncate">
                              {resolvePatientName(row.phoneCanonical) || '—'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{row.phoneCanonical}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(row.phoneCanonical)}
                            className="shrink-0 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600"
                            title="Copiar telefone"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-slate-700">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-slate-500">
              Leitura clínica: faltas repetidas podem sinalizar resistência, sobrecarga ou risco de ruptura do vínculo.
            </p>
            <Button variant="secondary" onClick={onGoToAttendance} icon={ArrowRight} className="sm:w-auto w-full">
              Ver detalhes
            </Button>
          </div>
        </div>
      </Card>

      {/* Ações rápidas + métricas operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card title="Ações rápidas" className="lg:col-span-4">
          <div className="space-y-3">
            <Button variant="secondary" onClick={onGoToAttendance} icon={CalendarCheck} className="w-full">
              Presença/Faltas
            </Button>
            <Button variant="secondary" onClick={onGoToAttendanceImport} icon={Upload} className="w-full">
              Importar presença/faltas
            </Button>
            <Button variant="secondary" onClick={onGoToAttendanceFollowups} icon={Send} className="w-full">
              Disparar follow-ups
            </Button>

            <div className="pt-2 text-xs text-slate-500">
              Dica: use o Histórico para auditar envios e o painel de Constância para orientar intervenções.
            </div>
          </div>
        </Card>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Pacientes Ativos (30 dias)" value={activeUsersCount} icon={Activity} />
          <StatCard title="Pacientes Cadastrados" value={subscribersCount} icon={Users} />
          <StatCard title="Mensagens Enviadas" value={totalMessagesSent} icon={Mail} />
        </div>
      </div>

      <Card title="Resumo" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-sm text-slate-600 space-y-2">
          <p className="flex items-center gap-2">
            <CheckCircle size={16} className="text-violet-500" />
            Carregue a planilha, clique em <b>Verificar</b> e dispare os lembretes.
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle size={16} className="text-violet-500" />
            Cadastre pacientes na aba <b>Pacientes</b> para autorizá-los no app.
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle size={16} className="text-violet-500" />
            Ajuste modelos de mensagem e contrato em <b>Configurações</b>.
          </p>
        </div>
      </Card>
    </>
  );
}
