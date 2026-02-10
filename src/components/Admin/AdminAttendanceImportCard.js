import React from 'react';
import { CheckCircle, X } from 'lucide-react';
import { Button, Card } from '../DesignSystem';

/**
 * Card: Importar Presença/Faltas
 * - Alimenta attendance_logs via CSV
 * - Mantém o princípio clínico: constância e responsabilização
 * - Não expõe qualquer funcionalidade de cancelar/reagendar ao paciente
 */
export default function AdminAttendanceImportCard({
  attendanceImportSource,
  setAttendanceImportSource,
  attendanceImportDefaultStatus,
  setAttendanceImportDefaultStatus,
  attendanceImportText,
  setAttendanceImportText,
  attendanceImportLoading,
  attendanceImportResult,
  handleAttendanceImport,
}) {
  return (
    <Card className="p-5 mt-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Importar Presença/Faltas</h3>
          <p className="text-sm text-slate-600">
            Alimente <b>attendance_logs</b> via planilha (CSV). Isso sustenta o painel de constância e futuras mensagens de cuidado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <div>
          <label className="text-sm text-slate-600">Fonte</label>
          <input
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200"
            value={attendanceImportSource}
            onChange={(e) => setAttendanceImportSource(e.target.value)}
            placeholder="ex.: sistema_atual / recepção / manual"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Status padrão (se faltar coluna)</label>
          <select
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200"
            value={attendanceImportDefaultStatus}
            onChange={(e) => setAttendanceImportDefaultStatus(e.target.value)}
          >
            <option value="absent">Falta</option>
            <option value="present">Presença</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button onClick={handleAttendanceImport} disabled={attendanceImportLoading || !attendanceImportText.trim()} className="w-full">
            {attendanceImportLoading ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm text-slate-600">Cole o CSV aqui</label>
        <textarea
          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 min-h-[140px]"
          value={attendanceImportText}
          onChange={(e) => setAttendanceImportText(e.target.value)}
          placeholder={'ID,Nome,Data,Hora,Profissional,Serviço,Local,Status\n123,João,07/02/2026,14:00,Paulo,Psicoterapia,Online,present\n...'}
        />
      </div>

      {attendanceImportResult && (
        <div className="mt-3 text-sm">
          {attendanceImportResult.ok ? (
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle className="w-4 h-4" />
              <span>
                Importado: <b>{attendanceImportResult.imported}</b> • Ignorados: <b>{attendanceImportResult.skipped}</b>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <X className="w-4 h-4" />
              <span>Erro: {attendanceImportResult.error}</span>
            </div>
          )}

          {attendanceImportResult.ok && attendanceImportResult.errors?.length > 0 && (
            <div className="mt-2 text-slate-600">
              <div className="font-semibold">Amostra de erros:</div>
              <ul className="list-disc ml-5">
                {attendanceImportResult.errors.slice(0, 5).map((er, idx) => (
                  <li key={idx}>
                    Linha {er.line}: {er.error} ({er.value})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
