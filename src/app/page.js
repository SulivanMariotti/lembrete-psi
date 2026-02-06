'use client';

import React, { useState } from 'react';
// Importação dos componentes refatorados
import { Toast } from '../components/DesignSystem';
import { useData } from '../hooks/useData';
import AdminPanel from '../components/Admin/AdminPanel';
import PatientFlow from '../components/Patient/PatientFlow';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });

  // Hook personalizado que busca todos os dados do Firebase (separado da visualização)
  const { subscribers, historyLogs, dbAppointments, globalConfig } = useData();

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // Função de Login do Admin (Chama a API segura)
  const handleAdminAccess = async () => {
    const password = prompt("Senha de Administrador:");
    if (!password) return;

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsAdmin(true);
        showToast("Bem-vindo, Admin!");
      } else {
        showToast("Senha incorreta", "error");
      }
    } catch (e) { 
      showToast("Erro de servidor", "error"); 
    }
  };

  return (
    <>
      {/* Toast Global */}
      {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({})} />}
      
      {isAdmin ? (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <AdminPanel 
                onLogout={() => setIsAdmin(false)}
                subscribers={subscribers}
                historyLogs={historyLogs}
                dbAppointments={dbAppointments}
                globalConfig={globalConfig}
                showToast={showToast}
            />
        </div>
      ) : (
        <PatientFlow 
            onAdminAccess={handleAdminAccess}
            globalConfig={globalConfig}
        />
      )}
    </>
  );
}