import React, { useEffect, useState } from 'react';
import { db } from '../../app/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Settings,
  History,
  LogOut,
} from 'lucide-react';

import AdminDashboardTab from './AdminDashboardTab';
import AdminHistoryTab from './AdminHistoryTab';
import AdminPatientsTab from './AdminPatientsTab';
import AdminAttendanceTab from './AdminAttendanceTab';
import AdminScheduleTab from './AdminScheduleTab';
import AdminConfigTab from './AdminConfigTab';

export default function AdminPanelView({
  onLogout,
  subscribers,
  historyLogs,
  dbAppointments,
  showToast,
  globalConfig,
}) {
  const [adminTab, setAdminTab] = useState('dashboard');

  // STEP43: Painel de Constância (attendance_logs)
  const [attendancePeriodDays, setAttendancePeriodDays] = useState(30);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    total: 0,
    rate: 0,
    topAbsent: [],
  });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);

  // STEP44: Importar Presença/Faltas (CSV) para attendance_logs via API server-side
  const [attendanceImportText, setAttendanceImportText] = useState('');
  const [attendanceImportSource, setAttendanceImportSource] = useState('planilha');
  const [attendanceImportDefaultStatus, setAttendanceImportDefaultStatus] = useState('absent'); // absent|present
  const [attendanceImportResult, setAttendanceImportResult] = useState(null);
  const [attendanceImportLoading, setAttendanceImportLoading] = useState(false);

  // Configuração Local (usada pelo Schedule e pela aba Configurações)
  const [localConfig, setLocalConfig] = useState({
    reminderOffsetsHours: [48, 24, 12],
    msg1: '',
    msg2: '',
    msg3: '',
    msg48h: '',
    msg24h: '',
    msg12h: '',
    whatsapp: '',
    contractText: '',
    contractVersion: 1,
    attendanceFollowupPresentTitle: 'Presença é constância',
    attendanceFollowupPresentBody: 'Parabéns por ter comparecido. A continuidade é o que sustenta o processo e fortalece o cuidado consigo.',
    attendanceFollowupAbsentTitle: 'Retomar a constância é cuidado',
    attendanceFollowupAbsentBody: 'Hoje você faltou. Faltar não é apenas perder uma hora; é interromper um processo de evolução. Se precisar, fale com a clínica para apoiar seu retorno.',
});

  const [isSaving, setIsSaving] = useState(false);

  // Carrega configuração global
  useEffect(() => {
    if (!globalConfig) return;
    setLocalConfig((prev) => ({
      ...prev,
      ...globalConfig,
      // Compatibilidade: se ainda estiver salvo como msg48h/msg24h/msg12h, preenche msg1/msg2/msg3
      msg1: globalConfig?.msg1 ?? globalConfig?.msg48h ?? prev.msg1 ?? '',
      msg2: globalConfig?.msg2 ?? globalConfig?.msg24h ?? prev.msg2 ?? '',
      msg3: globalConfig?.msg3 ?? globalConfig?.msg12h ?? prev.msg3 ?? '',
    }));
  }, [globalConfig]);

  // STEP43-FIX: carregar estatísticas de constância via API (Admin SDK), evitando rules no client
  useEffect(() => {
    const run = async () => {
      if (adminTab !== 'attendance') return;
      try {
        setAttendanceLoading(true);
        setAttendanceError(null);
        const res = await fetch(
          `/api/admin/attendance/summary?days=${attendancePeriodDays}`,
          { method: 'GET' }
        );
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || 'Falha ao carregar constância');
        setAttendanceStats({
          present: Number(data.present || 0),
          absent: Number(data.absent || 0),
          total: Number(data.total || 0),
          rate: Number(data.attendanceRate || 0),
          topAbsent: Array.isArray(data.topMisses)
            ? data.topMisses.map((x) => ({ phoneCanonical: x.phoneCanonical, count: x.misses }))
            : [],
        });
      } catch (e) {
        setAttendanceStats({ present: 0, absent: 0, total: 0, rate: 0, topAbsent: [] });
        setAttendanceError(e?.message || 'Erro ao carregar constância');
      } finally {
        setAttendanceLoading(false);
      }
    };
    run();
  }, [adminTab, attendancePeriodDays]);

  const handleAttendanceImport = async () => {
    try {
      setAttendanceImportLoading(true);
      setAttendanceImportResult(null);
      const res = await fetch('/api/admin/attendance/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || '',
        },
        body: JSON.stringify({
          csvText: attendanceImportText,
          source: attendanceImportSource,
          defaultStatus: attendanceImportDefaultStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setAttendanceImportResult({ ok: false, error: data?.error || 'Falha ao importar' });
        showToast(data?.error || 'Falha ao importar', 'error');
        return;
      }
      setAttendanceImportResult({
        ok: true,
        imported: data.imported,
        skipped: data.skipped,
        errors: data.errors || [],
      });
      showToast(`Importado: ${data.imported} • Ignorados: ${data.skipped}`);
      // Recarrega estatística para refletir imediatamente
      setAttendancePeriodDays((d) => d); // trigger effect
    } catch (e) {
      setAttendanceImportResult({ ok: false, error: e?.message || 'Erro' });
      showToast('Erro ao importar presença/faltas', 'error');
    } finally {
      setAttendanceImportLoading(false);
    }
  };

  // Salvar configurações globais
  const saveConfig = async (publishNewVersion = false) => {
    setIsSaving(true);
    try {
      const ref = doc(db, 'config', 'global');
      const payload = {
        reminderOffsetsHours: Array.isArray(localConfig.reminderOffsetsHours)
          ? localConfig.reminderOffsetsHours.map((n) => Number(n || 0))
          : [48, 24, 12],
        msg48h: localConfig.msg48h || '',
        msg24h: localConfig.msg24h || '',
        msg12h: localConfig.msg12h || '',
        msg1: localConfig.msg1 || localConfig.msg48h || '',
        msg2: localConfig.msg2 || localConfig.msg24h || '',
        msg3: localConfig.msg3 || localConfig.msg12h || '',
        whatsapp: localConfig.whatsapp || '',
        contractText: localConfig.contractText || '',
        contractVersion: publishNewVersion
          ? Number(localConfig.contractVersion || 1) + 1
          : Number(localConfig.contractVersion || 1),        attendanceFollowupPresentTitle: localConfig.attendanceFollowupPresentTitle || '',
        attendanceFollowupPresentBody: localConfig.attendanceFollowupPresentBody || '',
        attendanceFollowupAbsentTitle: localConfig.attendanceFollowupAbsentTitle || '',
        attendanceFollowupAbsentBody: localConfig.attendanceFollowupAbsentBody || '',

        updatedAt: new Date(),
      };

      await setDoc(ref, payload, { merge: true });

      setLocalConfig((prev) => ({
        ...prev,
        contractVersion: payload.contractVersion,
      }));

      showToast(publishNewVersion ? 'Nova versão publicada!' : 'Configurações salvas!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar configurações.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeUsersCount = (subscribers || []).filter((u) => {
    if (!u.lastSeen?.seconds) return false;
    const diffDays = (new Date() - new Date(u.lastSeen.seconds * 1000)) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).length;

  const totalMessagesSent = (historyLogs || []).reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-3">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 sticky top-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Painel</div>
              <div className="text-lg font-black text-slate-900">Admin</div>
            </div>
            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setAdminTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'dashboard'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>

            <button
              onClick={() => setAdminTab('schedule')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'schedule'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck size={18} /> Agenda
            </button>

            <button
              onClick={() => setAdminTab('attendance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'attendance'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck size={18} /> Presença/Faltas
            </button>

            <button
              onClick={() => setAdminTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'users'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users size={18} /> Pacientes
            </button>

            <button
              onClick={() => setAdminTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'history'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History size={18} /> Histórico
            </button>

            <button
              onClick={() => setAdminTab('config')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'config'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings size={18} /> Configurações
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="lg:col-span-9 space-y-6">
        {adminTab === 'dashboard' && (
          <AdminDashboardTab
            activeUsersCount={activeUsersCount}
            subscribersCount={(subscribers || []).length}
            totalMessagesSent={totalMessagesSent}
          />
        )}

        {adminTab === 'schedule' && (
          <AdminScheduleTab
            subscribers={subscribers}
            dbAppointments={dbAppointments}
            globalConfig={globalConfig}
            localConfig={localConfig}
            showToast={showToast}
          />
        )}

        {adminTab === 'attendance' && (
          <AdminAttendanceTab
            attendancePeriodDays={attendancePeriodDays}
            setAttendancePeriodDays={setAttendancePeriodDays}
            attendanceError={attendanceError}
            attendanceLoading={attendanceLoading}
            attendanceStats={attendanceStats}
            attendanceImportSource={attendanceImportSource}
            setAttendanceImportSource={setAttendanceImportSource}
            attendanceImportDefaultStatus={attendanceImportDefaultStatus}
            setAttendanceImportDefaultStatus={setAttendanceImportDefaultStatus}
            attendanceImportText={attendanceImportText}
            setAttendanceImportText={setAttendanceImportText}
            attendanceImportLoading={attendanceImportLoading}
            attendanceImportResult={attendanceImportResult}
            handleAttendanceImport={handleAttendanceImport}
          />
        )}

        {adminTab === 'users' && <AdminPatientsTab subscribers={subscribers} showToast={showToast} />}

        {adminTab === 'history' && <AdminHistoryTab historyLogs={historyLogs} />}

        {adminTab === 'config' && (
          <AdminConfigTab
            localConfig={localConfig}
            setLocalConfig={setLocalConfig}
            saveConfig={saveConfig}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}
