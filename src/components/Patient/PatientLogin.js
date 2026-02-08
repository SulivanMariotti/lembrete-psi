"use client";

import React, { useMemo, useState } from "react";
import { patientLoginByEmail } from "../../services/authService";
import { Button, Card } from "../DesignSystem";
import { Mail, Lock, Sparkles, CheckCircle, Bell, CalendarCheck, NotebookPen, Info } from "lucide-react";

export default function PatientLogin({ onAdminAccess }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanEmail = useMemo(() => (email || "").trim().toLowerCase(), [email]);

  const handlePatientLogin = async () => {
    if (!cleanEmail || !cleanEmail.includes("@")) {
      alert("Digite um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      await patientLoginByEmail(cleanEmail);
      // ✅ onAuthStateChanged no page.js vai redirecionar automaticamente
    } catch (e) {
      console.error(e);
      alert(e?.message || "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Cabeçalho leve (psicoeducação / propósito) */}
        <div className="text-center px-2">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-violet-100 bg-violet-50 text-violet-900 text-xs font-semibold">
            <Sparkles size={14} /> Lembrete Psi
          </div>

          <div className="mt-3 text-2xl font-extrabold text-slate-900 leading-tight">
            Seu espaço de constância terapêutica
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Lembretes, organização do cuidado e reforços de psicoeducação — para você se manter presente no seu processo.
          </div>
        </div>

        <Card title="Entrar">
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              Digite seu <b>e-mail cadastrado</b> para acessar seu painel.
              <div className="text-xs text-slate-400 mt-1">
                Se você não tiver cadastro, solicite à clínica.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700"
                  placeholder="paciente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  autoComplete="email"
                />
              </div>
            </div>

            <Button onClick={handlePatientLogin} disabled={loading} className="w-full">
              {loading ? "Entrando..." : "Entrar no meu painel"}
            </Button>

            {/* O que o paciente vai encontrar (sem poluir) */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Info size={14} className="text-slate-400" />
                O que você encontra aqui
              </div>

              <div className="mt-2 space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CalendarCheck size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <b className="text-slate-700">Próximo atendimento</b> e agenda organizada (sem reagendar/cancelar).
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Bell size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <b className="text-slate-700">Notificações</b> para lembretes no seu celular.
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <NotebookPen size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <b className="text-slate-700">Diário rápido</b> para registrar pontos importantes entre sessões.
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[12px] text-slate-500 leading-snug">
                <b>Importante:</b> este sistema existe para fortalecer a <b>constância</b>. Quando você falta, você interrompe o
                ritmo do seu processo — e isso costuma custar mais do que “parece” no dia.
              </div>
            </div>

            {/* Acesso Admin */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={onAdminAccess}
                className="w-full text-sm text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2"
                type="button"
              >
                <Lock size={16} /> Acesso Admin
              </button>
            </div>
          </div>
        </Card>

        {/* Rodapé mínimo */}
        <div className="text-center text-xs text-slate-400">
          Ao entrar, você confirma que entende que este painel é para <b>lembretes e constância</b>.
          <div className="mt-1 inline-flex items-center gap-2 justify-center">
            <CheckCircle size={14} className="text-slate-300" />
            Dados usados apenas para apoiar seu acompanhamento (agenda, lembretes e registro pessoal).
          </div>
        </div>
      </div>
    </div>
  );
}
