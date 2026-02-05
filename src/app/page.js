'use client';

import React, { useState, useEffect } from 'react';
import { db, messaging } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { Smartphone, Bell, Send, Users, CheckCircle, AlertTriangle, X, LogOut, Loader2, Upload, FileSpreadsheet, Clock, Mail, Trash2 } from 'lucide-react';

// --- Componentes UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, as = 'button', ...props }) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200"
  };
  const finalVariant = disabled && variant !== 'danger' ? 'secondary' : variant;
  
  const Component = as;
  return (
    <Component onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[finalVariant]} ${className}`} {...props}>
      {Icon && <Icon size={18} />}
      <span translate="no">{children}</span> 
    </Component>
  );
};

const Card = ({ children, title }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 h-full flex flex-col">
    {title && <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-4">{title}</h3>}
    <div className="flex-1">{children}</div>
  </div>
);

const Badge = ({ status, text }) => {
  let style = "bg-slate-100 text-slate-600 border-slate-200";
  let icon = null;

  if (status === 'match') {
    style = "bg-emerald-100 text-emerald-700 border-emerald-200";
    icon = <CheckCircle size={12} />;
  } else if (status === 'missing') {
    style = "bg-red-50 text-red-600 border-red-100";
    icon = <AlertTriangle size={12} />;
  } else if (status === 'time') {
    style = "bg-blue-50 text-blue-700 border-blue-200";
    icon = <Clock size={12} />;
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 w-fit whitespace-nowrap ${style}`}>
      {icon}
      {text}
    </span>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [subscribers, setSubscribers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [csvInput, setCsvInput] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 1. Carregar dados do banco
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

  // 2. Cadastro de Paciente
  const handlePatientRegister = async () => {
    if (patientPhone.length < 8) return alert("Celular inválido.");
    setIsSaving(true);
    const cleanPhone = patientPhone.replace(/\D/g, '');

    try {
      const q = query(collection(db, "users"), where("phone", "==", cleanPhone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setCurrentView('patient-success');
        setIsSaving(false);
        return; 
      }

      let currentToken = null;
      try {
        if (messaging) {
            currentToken = await getToken(messaging, { 
                vapidKey: 'BDYKoBDPNh4Q0SoSaY7oSXGz2fgVqGkJZWRgCMMeryqj-Jk7_csF0oJapZWhkSa9SEjgfYf6x3thWNZ4QttknZM' 
            });
        }
      } catch (err) { console.log("Token não gerado:", err); }

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

  // 3. Processar Planilha
  const processCsv = (inputText = csvInput) => {
    if (!inputText) return;
    const lines = inputText.split('\n');
    
    const processed = lines.map((line, id) => {
      let parts = line.split(',');
      if (parts.length < 2 && line.includes(';')) {
         parts = line.split(';');
      }

      const [nome, tel, dataStr, hora] = parts;
      if (!nome || !tel) return null;
      
      const cleanPhone = tel.trim().replace(/\D/g, '');
      const subscriber = subscribers.find(s => s.phone === cleanPhone);
      
      let timeLabel = "Data Inválida";
      let reminderType = null;
      let messageBody = "";

      if (dataStr && hora) {
        try {
            let isoDate = dataStr.trim();
            if (isoDate.includes('/')) {
                const [d, m, y] = isoDate.split('/');
                isoDate = `${y}-${m}-${d}`;
            }
            
            const sessionDate = new Date(`${isoDate}T${hora.trim()}:00`);
            const now = new Date();
            const diffHours = (sessionDate - now) / (1000 * 60 * 60);

            if (diffHours < 0) {
                timeLabel = "Já passou";
            } else if (diffHours <= 12) {
                timeLabel = "Faltam < 12h (Hoje)";
                reminderType = "12h";
                messageBody = `Olá ${nome.split(' ')[0]}! Sua sessão é hoje às ${hora.trim()}. Até logo!`;
            } else if (diffHours <= 30) { 
                timeLabel = "Faltam ~24h (Amanhã)";
                reminderType = "24h";
                messageBody = `Olá ${nome.split(' ')[0]}, lembrete: Sua sessão é amanhã às ${hora.trim()}.`;
            } else if (diffHours <= 54) {
                timeLabel = "Faltam ~48h";
                reminderType = "48h";
                messageBody = `Olá ${nome.split(' ')[0]}, lembrete: Sessão em ${dataStr} às ${hora.trim()}.`;
            } else {
                timeLabel = `Faltam ${Math.round(diffHours / 24)} dias`;
            }
        } catch (e) {
            timeLabel = "Erro Data";
        }
      }

      return { 
        id, nome, cleanPhone, data: dataStr, hora, 
        isSubscribed: !!subscriber,
        pushToken: subscriber?.pushToken,
        timeLabel,
        reminderType, 
        messageBody
      };
    }).filter(Boolean);
    
    setAppointments(processed);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvInput(text);
      processCsv(text);
    };
    reader.readAsText(file);
  };

  const clearData = () => {
    setCsvInput('');
    setAppointments([]);
  };

  // 4. Enviar
  const handleSendReminders = async () => {
    const targets = appointments.filter(a => a.isSubscribed && a.pushToken && a.reminderType);
    
    if (targets.length === 0) return alert("Nenhum lembrete pendente para agora.");
    
    const summary = `Confirmar envio?\n\n` + 
                    `- 48h antes: ${targets.filter(t => t.reminderType === '48h').length}\n` + 
                    `- 24h antes: ${targets.filter(t => t.reminderType === '24h').length}\n` + 
                    `- 12h antes: ${targets.filter(t => t.reminderType === '12h').length}\n\n` + 
                    `Total: ${targets.length} lembretes`;

    if (!confirm(summary)) return;

    setIsSending(true);
    let successCount = 0;

    try {
        const promises = targets.map(target => {
            return fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokens: [target.pushToken], 
                    title: 'Lembrete Psi 🧠',
                    body: target.messageBody
                })
            }).then(res => res.json().then(data => data.success ? 1 : 0));
        });

        const results = await Promise.all(promises);
        successCount = results.reduce((a, b) => a + b, 0);

        alert(`Concluído! ${successCount} mensagens enviadas.`);

    } catch (error) {
      alert("Erro no envio: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // --- Função de Segurança para Admin ---
  const handleAdminAccess = () => {
    const password = prompt("Digite a senha de administrador:");
    // Agora compara com a variável de ambiente, não com texto fixo
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) { 
      setCurrentView('admin-dashboard');
    } else if (password !== null) {
      alert("Senha incorreta.");
    }
  };

  // --- Renderização ---

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
            <button onClick={handleAdminAccess} className="text-sm text-slate-400 hover:text-indigo-600 underline">
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel da Clínica</h1>
            <p className="text-sm text-slate-500">{subscribers.length} pacientes conectados</p>
          </div>
          <button onClick={() => setCurrentView('landing')} className="text-slate-500 flex gap-2 items-center hover:text-red-600 transition-colors bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm"><LogOut size={16}/> Sair</button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 h-[600px]">
          
          <Card title="1. Carregar Agenda da Semana">
            <div className="flex flex-col h-full gap-4">
              
              <textarea 
                value={csvInput} 
                onChange={(e) => setCsvInput(e.target.value)} 
                placeholder="Cole aqui ou digite manualmente:&#10;Nome, Telefone, Data(DD/MM/YYYY), Hora" 
                className="w-full h-full p-3 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none flex-1" 
              />
              
              <div className="flex gap-2">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csvUpload" />
                <label htmlFor="csvUpload" className="flex-1">
                  <Button as="div" variant="secondary" icon={Upload} className="w-full">Carregar Planilha</Button>
                </label>
                
                {csvInput && (
                  <Button onClick={clearData} variant="danger" className="px-3" title="Limpar lista">
                    <Trash2 size={18} />
                  </Button>
                )}

                <Button onClick={() => processCsv()} className="flex-1" icon={Send}>Verificar</Button>
              </div>
            </div>
          </Card>
          
          <Card title="2. Envios Pendentes">
            {appointments.length === 0 ? (
              <div className="text-slate-400 text-center py-12 flex flex-col items-center justify-center h-full">
                <FileSpreadsheet className="w-12 h-12 opacity-20 mb-2"/>
                <p>Nenhum dado importado.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="space-y-2 flex-1 overflow-y-auto pr-1 mb-4">
                  {appointments.map((app) => (
                    <div key={app.id} className={`flex flex-col p-3 border rounded-lg ${app.reminderType ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 opacity-60'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-700">{app.nome}</span>
                        <Badge status={app.isSubscribed ? 'match' : 'missing'} text={app.isSubscribed ? "App Instalado" : "Sem App"} />
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>{app.data} às {app.hora}</span>
                        {app.reminderType ? (
                            <span className="font-bold text-indigo-600 flex items-center gap-1">
                                <Mail size={10} /> Enviar Aviso {app.reminderType}
                            </span>
                        ) : (
                            <span>{app.timeLabel}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {appointments.filter(a => a.isSubscribed && a.reminderType).length > 0 ? (
                  <Button 
                    onClick={handleSendReminders} 
                    variant="success" 
                    disabled={isSending}
                    icon={isSending ? Loader2 : Bell}
                  >
                    {isSending ? "Enviando..." : `Disparar ${appointments.filter(a => a.isSubscribed && a.reminderType).length} Lembretes`}
                  </Button>
                ) : (
                  <p className="text-center text-xs text-slate-400 mt-auto bg-slate-50 p-2 rounded">
                    Nenhum lembrete pendente para o horário atual.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}