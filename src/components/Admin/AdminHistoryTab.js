import React from 'react';
import { CalendarCheck } from 'lucide-react';
import { Card } from '../DesignSystem';

export default function AdminHistoryTab({ historyLogs = [] }) {
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
                    {log.sentAt?.seconds ? new Date(log.sentAt.seconds * 1000).toLocaleString() : '-'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 ml-6">{log.summary}</div>
                </div>
                <div className="flex gap-2">
                  {log.types?.map((t) => (
                    <span
                      key={t}
                      className="bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 rounded-full text-xs font-semibold"
                    >
                      {t}
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
