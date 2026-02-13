"use client";

import React, { useState } from "react";
import { Button } from "../../../components/DesignSystem";
import { Users, Shield, LogOut } from "lucide-react";
import { formatPhoneBR } from "../lib/phone";

export default function PatientHeader({
  patientName,
  devSwitchEnabled,
  impersonatePhone,
  setDevPanelOpen,
  onAdminAccess,
  onLogout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-slate-400 uppercase tracking-wider">Área do Paciente</div>
        <div className="text-lg font-extrabold text-slate-900 truncate">Olá, {patientName}</div>
        <div className="text-sm text-slate-500 mt-1">Lembretes e organização do seu cuidado — constância terapêutica.</div>

        {devSwitchEnabled && impersonatePhone ? (
          <div className="mt-2 inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded-full border border-amber-100 bg-amber-50 text-amber-900">
            <Users size={14} />
            Visualizando agenda de: <b>{formatPhoneBR(impersonatePhone)}</b>
          </div>
        ) : null}
      </div>

      <div className="hidden sm:flex gap-2">
        {devSwitchEnabled ? (
          <Button onClick={() => setDevPanelOpen((v) => !v)} variant="secondary" icon={Users}>
            Trocar paciente
          </Button>
        ) : null}

        <Button onClick={onAdminAccess} variant="secondary" icon={Shield}>
          Admin
        </Button>
        <Button onClick={onLogout} variant="secondary" icon={LogOut}>
          Sair
        </Button>
      </div>

      <div className="sm:hidden relative">
        <Button variant="secondary" onClick={() => setMobileMenuOpen((v) => !v)}>
          Menu
        </Button>
        {mobileMenuOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-30">
            {devSwitchEnabled ? (
              <button
                className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDevPanelOpen(true);
                }}
              >
                <Users size={16} className="text-slate-500" /> Trocar paciente
              </button>
            ) : null}

            <button
              className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2"
              onClick={() => {
                setMobileMenuOpen(false);
                onAdminAccess();
              }}
            >
              <Shield size={16} className="text-slate-500" /> Admin
            </button>
            <button
              className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
            >
              <LogOut size={16} className="text-slate-500" /> Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
