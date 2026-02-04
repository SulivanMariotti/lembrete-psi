'use client';

import React, { useState, useEffect } from 'react';

// --- IMPORTAÇÃO ---
// Importa db e messaging do arquivo que está na MESMA pasta
import { db, messaging } from './firebase'; 
// ------------------

import { collection, addDoc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { Smartphone, Bell, Send, Users, CheckCircle, AlertTriangle, X, LogOut, Loader2 } from 'lucide-react';

// --- Componentes Visuais (Botões e Cards) ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }) => {
  const base = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Card = ({ children, title }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
    {title && <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-4">{title}</h3>}
    {children}
  </div>
);

const Badge = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 w-fit ${status === 'match' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
    {status === 'match' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
    {status === 'match' ? "Conectado" : "Não Cadastrado"}
  </span>
);

// --- Lógica Principal do App ---
export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [subscribers, setSubscribers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [csvInput, setCsvInput] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Carrega os dados do banco (Bastidores)
  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubscribers(usersList);
      }, (error) => console.error("Erro de conexão silencioso:", error));
      return () => unsubscribe();
    } catch (e) { console.error(e); }
  }, []);

  // 2. Cadastro do Paciente (Com Token e Verificação de Duplicidade)
  const handlePatientRegister = async () => {
    if (patientPhone.length < 8) return alert("Celular inválido.");
    setIsSaving(true);
    const cleanPhone = patientPhone.replace(/\D/g, '');

    try {
      // A. Verificar se já existe
      const q = query(collection(db, "users"), where("phone", "==", cleanPhone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Se já existe, pula para o sucesso sem duplicar
        setCurrentView('patient-success');
        setIsSaving(false);
        return; 
      }

      // B. Tentar pegar Token de Push
      let currentToken = "";
      try {
        if (messaging) {
            // OBS: Substitua 'SUA_VAPID_KEY_AQUI' pela chave gerada no Firebase Console > Cloud Messaging > Web Push
            currentToken = await getToken(messaging, { 
                vapidKey: 'BDYKoBDPNh4Q0SoSaY7oSXGz2fgVqGkJZWRgCMMeryqj-Jk7_csF0oJapZWhkSa9SEjgfYf6x3thWNZ4QttknZM' 
            });
            console.log("Token gerado:", currentToken);
        }
      } catch (err) {
        console.log("Aviso: Token não gerado (provavelmente localhost ou falta VAPID key).");
      }

      // C. Salvar no Banco
      await addDoc(collection(db, "users"), {
        phone: cleanPhone,
        pushToken: currentToken || null,
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

  // 3. Processar Planilha (Admin)
  const processCsv = () => {
    if (!csvInput) return;
    const lines = csvInput.split('\n');
    const processed = lines.map((line, id) => {
      const [nome, tel, data, hora] = line.split(',');
      if (!nome || !tel) return null;
      const cleanPhone = tel.trim().replace(/\D/g, '');
      const isSubscribed = subscribers.some(s => s.phone === cleanPhone);
      return { id, nome, cleanPhone, data, hora, isSubscribed };
    }).filter(Boolean);
    setAppointments(processed);
  };

  // --- Renderização das Telas ---

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
        
        {/* MENSAGEM ESPECÍFICA QUE VOCÊ PEDIU */}
        <p className="text-emerald-700 mt-2 mb-6 text-lg">
          Seu celular foi registrado com sucesso. <br/>
          <strong>Você receberá lembretes 48h, 24h e 12h antes da sua sessão.</strong>
        </p>

        <div className="text-sm text-emerald-800 bg-white/60 p-4 rounded-lg border border-emerald-200 mb-8 max-w-xs mx-auto">
          <strong>Dica:</strong> Não feche esta aba ou adicione à tela inicial para garantir o recebimento.
        </div>
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
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Importar Agenda do Dia">
            <textarea value={csvInput} onChange={(e) => setCsvInput(e.target.value)} placeholder="Cole aqui: Nome, Celular, Data, Hora" className="w-full h-40 p-3 border border-slate-300 rounded-lg text-xs font-mono mb-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
            <Button onClick={processCsv} className="w-full" icon={Send}>Verificar Lista</Button>
          </Card>
          <Card title="Status dos Pacientes">
            {appointments.length === 0 ? (
              <div className="text-slate-400 text-center py-12 flex flex-col items-center">
                <Users className="w-8 h-8 opacity-20 mb-2"/>
                <p>Nenhum dado importado.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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
            )}
             {appointments.length > 0 && (
                 <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
                    Total: {appointments.length} | Conectados: {appointments.filter(a => a.isSubscribed).length}
                 </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}