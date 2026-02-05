'use client';

import React, { useState, useEffect } from 'react';
import { db, messaging } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { Smartphone, Bell, Send, Users, CheckCircle, AlertTriangle, X, LogOut, Loader2 } from 'lucide-react';

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200"
  };
  const finalVariant = disabled && variant !== 'danger' ? 'secondary' : variant;
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[finalVariant]} ${className}`}>
      {Icon && <Icon size={18} />}
      <span translate="no">{children}</span> 
    </button>
  );
};

const Card = ({ children, title }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 h-full flex flex-col">
    {title && <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-4">{title}</h3>}
    <div className="flex-1">{children}</div>
  </div>
);

const Badge = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 w-fit ${status === 'match' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
    {status === 'match' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
    {status === 'match' ? "Conectado" : "Não Cadastrado"}
  </span>
);

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [subscribers, setSubscribers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [csvInput, setCsvInput] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubscribers(usersList);
      }, (error) => console.error("Erro conexão:", error));
      return () => unsubscribe();
    } catch (e) { console.error(e); }
  }, []);

  // 2. Cadastro de Paciente (Versão Produção)
  const handlePatientRegister = async () => {
    if (patientPhone.length < 8) return alert("Celular inválido.");
    setIsSaving(true);
    const cleanPhone = patientPhone.replace(/\D/g, '');

    try {
      // A. Verificar se já existe
      const q = query(collection(db, "users"), where("phone", "==", cleanPhone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setCurrentView('patient-success');
        setIsSaving(false);
        return; 
      }

      // B. Obter Token (Silencioso - Sem alertas técnicos)
      let currentToken = null;
      try {
        if (messaging) {
            currentToken = await getToken(messaging, { 
                vapidKey: 'BDYKoBDPNh4Q0SoSaY7oSXGz2fgVqGkJZWRgCMMeryqj-Jk7_csF0oJapZWhkSa9SEjgfYf6x3thWNZ4QttknZM' 
            });
        }
      } catch (err) { 
        console.log("Token não gerado (permissão ou ambiente):", err);
      }

      // C. Salvar no Banco
      await addDoc(collection(db, "users"), {
        phone: cleanPhone,
        pushToken: currentToken,
        createdAt: new Date(),
        deviceType: navigator.userAgent
      });

      setCurrentView('patient-success');
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const processCsv = () => {
    if (!csvInput) return;
    const lines = csvInput.split('\n');
    const processed = lines.map((line, id) => {
      const [nome, tel, data, hora] = line.split(',');
      if (!nome || !tel) return null;
      const cleanPhone = tel.trim().replace(/\D/g, '');
      const subscriber = subscribers.find(s => s.phone === cleanPhone);
      return { 
        id, nome, cleanPhone, data, hora, 
        isSubscribed: !!subscriber,
        pushToken: subscriber?.pushToken 
      };
    }).filter(Boolean);
    setAppointments(processed);
  };

  const handleSendReminders = async () => {
    const targets = appointments.filter(a => a.isSubscribed && a.pushToken);
    
    if (targets.length === 0) return alert("Nenhum paciente conectado nesta lista.");
    
    if (!confirm(`Confirmar envio para ${targets.length} pacientes?`)) return;

    setIsSending(true);
    try {
      const tokens = targets.map(t => t.pushToken);
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens,
          title: 'Lembrete Psi 🧠',
          body: 'Olá! Não se esqueça da sua sessão amanhã. Confirme sua presença.'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Sucesso! ${result.enviados} mensagens enviadas.`);
      } else {
        alert("Erro no envio: " + JSON.stringify(result));
      }
    } catch (error) {
      alert("Erro de conexão com o servidor: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg space-y-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-indigo-200 shadow-lg">
            <Bell className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lembrete Psi</h1>
            <p className="text-slate-500 mt-2">Nunca mais esqueça o horário da sua terapia.</p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => setCurrentView('patient-form')} className="w-full py-4 text-lg" icon={Smartphone}>
              Ativar no meu Celular
            </Button>
            <p className="text-xs text-slate-400">Funciona direto no navegador.</p>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <button onClick={() => setCurrentView('admin-dashboard')} className="text-sm text-slate-400 hover:text-indigo-600 underline">
              Acesso da Clínica (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'patient-form') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6">
        <button onClick={() => setCurrentView('landing')} className="w-fit p-2 hover:bg-slate-50 rounded-full mb-6"><X className="text-slate-400" /></button>
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Qual seu número?</h2>
            <p className="text-slate-500 mt-1">Digite o celular cadastrado na clínica.</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Celular (DDD + Número)</label>
            <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full text-2xl p-4 bg-slate-50 border border-slate-200 rounded-xl outline-indigo-500" />
          </div>
          <Button onClick={handlePatientRegister} disabled={isSaving} className="w-full py-4 text-lg" icon={isSaving ? Loader2 : CheckCircle}>
            {isSaving ? "Conectar e Permitir" : "Conectar e Permitir"}
          </Button>
          <p className="text-xs text-center text-slate-400 mt-2">Clique em "Permitir" quando o navegador perguntar.</p>
        </div>
      </div>
    );
  }

  if (currentView === 'patient-success') {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-900">Tudo Pronto!</h2>
        <p className="text-emerald-700 mt-2 mb-6 text-lg">
          Seu celular foi registrado com sucesso. <br/>
          <strong>Você receberá lembretes 48h, 24h e 12h antes da sua sessão.</strong>
        </p>
        <Button onClick={() => setCurrentView('landing')} variant="secondary">Voltar ao Início</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel da Clínica</h1>
            <p className="text-sm text-slate-500">{subscribers.length} pacientes conectados</p>
          </div>
          <button onClick={() => setCurrentView('landing')} className="text-slate-500 flex gap-2 items-center hover:text-red-600 transition-colors bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm"><LogOut size={16}/> Sair</button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 h-[500px]">
          <Card title="Importar Agenda do Dia">
            <textarea value={csvInput} onChange={(e) => setCsvInput(e.target.value)} placeholder="Cole aqui: Nome, Celular, Data, Hora" className="w-full h-full p-3 border border-slate-300 rounded-lg text-xs font-mono mb-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none flex-1" />
            <Button onClick={processCsv} className="w-full mt-auto" icon={Send}>Verificar Lista</Button>
          </Card>
          
          <Card title="Disparo de Lembretes">
            {appointments.length === 0 ? (
              <div className="text-slate-400 text-center py-12 flex flex-col items-center justify-center h-full">
                <Users className="w-8 h-8 opacity-20 mb-2"/>
                <p>Nenhum dado importado.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="space-y-2 flex-1 overflow-y-auto pr-1 mb-4">
                  {appointments.map((app) => (
                    <div key={app.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                      <div>
                        <span className="text-sm font-bold text-slate-700 block">{app.nome}</span>
                        <span className="text-xs text-slate-400">{app.cleanPhone}</span>
                      </div>
                      <Badge status={app.isSubscribed ? 'match' : 'missing'} />
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={handleSendReminders} 
                  variant="success" 
                  disabled={isSending || appointments.filter(a => a.isSubscribed).length === 0}
                  icon={isSending ? Loader2 : Bell}
                >
                  {isSending ? "Enviando..." : 
                   appointments.filter(a => a.isSubscribed).length > 0 
                     ? `Enviar Lembrete para ${appointments.filter(a => a.isSubscribed).length} Pessoas`
                     : "Nenhum paciente conectado na lista"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}