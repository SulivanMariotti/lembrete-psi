import React from 'react';
import { CalendarCheck, UserMinus, Activity } from 'lucide-react';
import { Card, StatCard } from '../DesignSystem';
import AdminAttendanceImportCard from './AdminAttendanceImportCard';
import AdminAttendanceFollowupsCard from './AdminAttendanceFollowupsCard';

/**
 * Aba Presença/Faltas (Constância Terapêutica)
 * - Não permite cancelamento/reagendamento pelo paciente.
 * - Serve como ferramenta clínica de sustentação do vínculo (constância).
 */
export default function AdminAttendanceTab({
  attendancePeriodDays,
  setAttendancePeriodDays,
  attendanceError,
  attendanceLoading,
  attendanceStats,
  attendanceImportSource,
  setAttendanceImportSource,
  attendanceImportDefaultStatus,
  setAttendanceImportDefaultStatus,
  attendanceImportText,
  setAttendanceImportText,
  attendanceImportLoading,
  attendanceImportResult,
  handleAttendanceImport,
  showToast,
}) {
  return (
    <>
      {/* STEP43: Constância Terapêutica (Presença/Faltas) */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Constância Terapêutica</h3>
            <p className="text-sm text-slate-500">
              A cura acontece na continuidade. Este painel ajuda a monitorar presença e faltas para apoiar o vínculo.
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
            value={attendanceLoading ? '...' : attendanceStats.present}
            icon={CalendarCheck}
          />
          <StatCard
            title={`Faltas (${attendancePeriodDays} dias)`}
            value={attendanceLoading ? '...' : attendanceStats.absent}
            icon={UserMinus}
          />
          <StatCard
            title="Taxa de Comparecimento"
            value={attendanceLoading ? '...' : `${attendanceStats.rate}%`}
            icon={Activity}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Faltas mais frequentes</h4>
            <span className="text-xs text-slate-500">Top 8 por paciente</span>
          </div>

          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-semibold text-slate-600">Paciente (phoneCanonical)</th>
                  <th className="px-4 py-2 font-semibold text-slate-600">Faltas</th>
                </tr>
              </thead>
              <tbody>
                {!attendanceLoading && attendanceStats.topAbsent.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-slate-500" colSpan={2}>
                      Sem dados de faltas no período.
                    </td>
                  </tr>
                ) : (
                  attendanceStats.topAbsent.map((row) => (
                    <tr key={row.phoneCanonical} className="border-t border-slate-200">
                      <td className="px-4 py-2 text-slate-700">{row.phoneCanonical}</td>
                      <td className="px-4 py-2 text-slate-700">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Importante: este painel não oferece cancelamento/reagendamento. A ausência deve ser tratada com contato ativo com a clínica,
            criando uma barreira saudável contra resistências momentâneas.
          </p>
        </div>
      </Card>

      {/* STEP44: Importar Presença/Faltas */}
      <AdminAttendanceImportCard
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

      {/* STEP45: Disparos por constância */}
      <AdminAttendanceFollowupsCard showToast={showToast} />
    </>
  );
}
