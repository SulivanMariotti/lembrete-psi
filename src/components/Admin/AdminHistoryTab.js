import React from 'react';
import { CalendarCheck } from 'lucide-react';
import { Card } from '../DesignSystem';

const TYPE_LABELS = {
  // Agenda
  appointments_sync_summary: 'Sincronização da agenda (resumo)',

  // Lembretes
  appointment_reminder: 'Lembrete de sessão',
  push_reminder_send_summary: 'Disparo de lembretes (resumo)',
  push_reminder_sent: 'Lembrete enviado',
  push_reminder_failed: 'Falha no envio do lembrete',

  // Presença / Faltas
  attendance_import_summary: 'Importação de presença/faltas (resumo)',
  attendance_followups_send_summary: 'Disparos por constância (resumo)',
  attendance_followup_sent: 'Mensagem por constância enviada',

  // Push / Notificações
  push_enabled: 'Notificações ativas',

  // Pacientes / Admin
  patient_register: 'Cadastro de paciente',
  patient_deactivate: 'Desativação de paciente',
  patient_deactivate_not_found: 'Desativação (paciente não encontrado)',
};

function typeToLabel(type) {
  if (!type) return 'Evento';
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];

  // Fallback: humaniza o type caso apareça algo novo ainda não mapeado
  const human = String(type)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Title Case simples
  return human.replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function AdminHistoryTab({ historyLogs = [] }) {
  const tsToLabel = (ts) => {
    if (!ts) return '-';
    let ms = 0;
    if (typeof ts?.toMillis === 'function') ms = ts.toMillis();
    else if (typeof ts?.seconds === 'number') ms = ts.seconds * 1000;
    else if (ts instanceof Date) ms = ts.getTime();
    else {
      const parsed = Date.parse(String(ts));
      ms = Number.isNaN(parsed) ? 0 : parsed;
    }
    return ms ? new Date(ms).toLocaleString() : '-';
  };

  return (
    <Card title="Histórico de Envios" className="h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 overflow-y-auto pr-2">
        {historyLogs.length === 0 ? (
          <div className="text-center py-20 text-slate-300">Nenhum envio registado ainda.</div>
        ) : (
          <div className="space-y-4">
            {historyLogs.map((log) => (
              <div
                key={log.id}
                className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <CalendarCheck size={16} className="text-violet-400" />
                    {tsToLabel(log.sentAt || log.createdAt)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 ml-6">{log.summary}</div>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  {log.types?.map((t) => (
                    <span
                      key={t}
                      title={t} // mantém o type técnico acessível no hover
                      className="bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 rounded-full text-xs font-semibold"
                    >
                      {typeToLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
