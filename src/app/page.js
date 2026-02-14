"use client";

import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";

import { app } from "./firebase";
import { Toast } from "../components/DesignSystem";

import { useData } from "../hooks/useData";
import AdminPanel from "../components/Admin/AdminPanel";
import PatientFlow from "../components/Patient/PatientFlow";
import PatientLogin from "../components/Patient/PatientLogin";

import { logoutUser } from "../services/authService";

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "" });

  // ✅ Hook de dados: carrega coleções sensíveis apenas quando isAdminMode === true
  // (seu hook retorna "appointments", aqui renomeamos para "dbAppointments")
  const { subscribers, historyLogs, appointments: dbAppointments, globalConfig } =
    useData(isAdminMode);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  // Observa autenticação
  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (u) => {
      // ✅ Se estiver no modo admin, não “pisa” no user (para não misturar modos)
      if (!isAdminMode) setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [isAdminMode]);

  // ✅ Logout do admin/paciente (encerra sessão Firebase também)
  const handleLogoutAll = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // ok, segue fluxo
    } finally {
      setIsAdminMode(false);
      setUser(null);
    }
  };

  // ✅ Login Admin (senha via API) + login invisível no Firebase com token
  const handleAdminAccess = async () => {
    const password = prompt("Senha de Administrador:");
    if (!password) return;

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));

      // ✅ Esperado do seu route.js: { ok: true, token: "..." }
      if (!response.ok || !data?.ok || !data?.token) {
        showToast(data?.error || "Senha incorreta", "error");
        return;
      }

      // ✅ Faz login invisível para request.auth existir e Rules liberarem
      const auth = getAuth(app);
      await signInWithCustomToken(auth, data.token);

      // ✅ Só entra no modo admin depois do signIn (evita permission-denied)
      setIsAdminMode(true);
      setUser(null); // garante que não fica no modo paciente junto
      showToast("Bem-vindo, Admin!");
    } catch (e) {
      console.error(e);
      showToast("Erro de servidor", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Carregando...
      </div>
    );
  }

  // 1) MODO ADMIN
  if (isAdminMode) {
    return (
      <>
        {toast?.msg && (
          <Toast
            message={toast.msg}
            type={toast.type}
            onClose={() => setToast({})}
          />
        )}

        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
          <AdminPanel
            onLogout={handleLogoutAll}
            subscribers={subscribers}
            historyLogs={historyLogs}
            dbAppointments={dbAppointments}
            globalConfig={globalConfig}
            showToast={showToast}
          />
        </div>
      </>
    );
  }

  // 2) MODO PACIENTE LOGADO
  if (user) {
    return (
      <>
        {toast?.msg && (
          <Toast
            message={toast.msg}
            type={toast.type}
            onClose={() => setToast({})}
          />
        )}

        <div className="skin-patient">

        <PatientFlow
          user={user}
          onLogout={handleLogoutAll}
          onAdminAccess={handleAdminAccess}
          globalConfig={globalConfig}
          showToast={showToast}
        />

      </div>
      </>
    );
  }

  // 3) TELA DE LOGIN
  return (
    <>
      {toast?.msg && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast({})}
        />
      )}

      <div className="skin-patient">

      <PatientLogin
        onAdminAccess={handleAdminAccess}
        onLoginSuccess={setUser}
        onLogin={setUser}
      />

    </div>
    </>
  );
}
