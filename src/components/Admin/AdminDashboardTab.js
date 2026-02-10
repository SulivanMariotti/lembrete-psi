import React from 'react';
import { Activity, Users, Mail, CheckCircle } from 'lucide-react';
import { Card, StatCard } from '../DesignSystem';

export default function AdminDashboardTab({ activeUsersCount = 0, subscribersCount = 0, totalMessagesSent = 0 }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Pacientes Ativos (30 dias)" value={activeUsersCount} icon={Activity} />
        <StatCard title="Pacientes Cadastrados" value={subscribersCount} icon={Users} />
        <StatCard title="Mensagens Enviadas" value={totalMessagesSent} icon={Mail} />
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
