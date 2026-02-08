"use client";

import React, { useState } from "react";
import { patientLoginByEmail } from "../../services/authService";
import { Button, Card } from "../DesignSystem";
import { Mail, Lock } from "lucide-react";

export default function PatientLogin({ onAdminAccess }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePatientLogin = async () => {
    const clean = (email || "").trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      alert("Digite um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      await patientLoginByEmail(clean);
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
        <Card title="Entrar no Lembrete Psi">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              E-mail do paciente
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700"
                placeholder="paciente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button onClick={handlePatientLogin} disabled={loading} className="w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>

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

        <div className="text-center text-xs text-slate-400">
          Se seu e-mail não estiver autorizado, solicite cadastro à clínica.
        </div>
      </div>
    </div>
  );
}
