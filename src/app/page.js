'use client';

import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from './firebase'; // Certifique-se que o firebase.js exporta { app }
import { Toast } from '../components/DesignSystem';
import { useData } from '../hooks/useData';
import AdminPanel from '../components/Admin/AdminPanel';
import PatientFlow from '../components/Patient/PatientFlow';
import PatientLogin from '../components/Patient/PatientLogin';
import { logoutUser } from '../services/authService';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: '' });

  // Hook de dados (Só busca dados sensíveis se for Admin)
  // Isso evita o erro de "insufficient permissions" quando o paciente tenta carregar dados de admin
  const { subscribers, historyLogs, dbAppointments, globalConfig } = useData(isAdminMode);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // Observa o estado de autenticação do Firebase (se o paciente clicou no link de e-mail)
  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Lógica de Login do Admin (Chamada pelo botão discreto na tela de Login)
  const handleAdminAccess = async () => {
    const password = prompt("Senha de Administrador:");
    if (!password) return;

    try {
      // Chama a API segura para validar a senha do servidor
      // Isso protege a senha de ser vista no código do navegador
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsAdminMode(true);
        showToast("Bem-vindo, Admin!");
      } else {
        showToast("Senha incorreta", "error");
      }
    } catch (e) { 
      showToast("Erro de servidor", "error"); 
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando...</div>;

  // 1. MODO ADMIN (Prioridade se a senha for digitada)
  if (isAdminMode) {
      return (
        <>
            {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({})} />}
            <div className="min-h-screen bg-slate-50 p-4 md:p-8">
                <AdminPanel 
                    onLogout={() => setIsAdminMode(false)} 
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

  // 2. MODO PACIENTE LOGADO (Autenticado via E-mail)
  if (user) {
      return (
        <>
            {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({})} />}
            <PatientFlow 
                user={user} 
                onLogout={logoutUser} 
                globalConfig={globalConfig} 
            />
        </>
      );
  }

  // 3. TELA DE LOGIN (Padrão para visitantes)
  return (
    <>
        {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({})} />}
        <PatientLogin 
            onLoginSuccess={setUser} 
            onAdminAccess={handleAdminAccess} 
        />
    </>
  );
}