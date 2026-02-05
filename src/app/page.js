'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db, messaging } from './firebase'; 
import { collection, addDoc, deleteDoc, updateDoc, setDoc, doc, onSnapshot, query, orderBy, where, getDocs, limit } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { Smartphone, Bell, Send, Users, CheckCircle, AlertTriangle, X, LogOut, Loader2, Upload, FileSpreadsheet, Clock, Mail, Trash2, Search, UserMinus, Eye, Settings, History, Save, XCircle, Share, User, LayoutDashboard, Download, Activity, PlusCircle, Filter, Calendar, CloudUpload, Info, Lock, KeyRound, RotateCcw, StickyNote, FileText, MessageCircle, HeartPulse, LifeBuoy, Shield, CalendarCheck, BarChart3, ScrollText, FileSignature } from 'lucide-react';

// --- Componente TOAST ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  const styles = type === 'error' 
    ? 'bg-red-500 border-red-600' 
    : 'bg-emerald-600 border-emerald-700'; 
  
  const icon = type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />;

  return (
    <div className={`fixed top-4 right-4 z-50 ${styles} text-white px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-right duration-300`}>
      {icon}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={16}/></button>
    </div>
  );
};

// --- Componentes UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, as = 'button', ...props }) => {
  const variants = {
    primary: "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200",
    white: "bg-white text-violet-700 hover:bg-violet-50 shadow-md border-transparent"
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

const Card = ({ children, title, className = "" }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 h-full flex flex-col ${className}`}>
    {title && <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-4">{title}</h3>}
    <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
  </div>
);

const Badge = ({ status, text }) => {
  let style = "bg-slate-100 text-slate-600 border-slate-200";
  let icon = null;

  if (status === 'match' || status === 'confirmed') {
    style = "bg-violet-100 text-violet-700 border-violet-200";
    icon = <CheckCircle size={12} />;
  } else if (status === 'missing') {
    style = "bg-red-50 text-red-600 border-red-100";
    icon = <AlertTriangle size={12} />;
  } else if (status === 'time' || status === 'pending') {
    style = "bg-indigo-50 text-indigo-700 border-indigo-200";
    icon = <Clock size={12} />;
  } else if (status === 'signed') {
    style = "bg-emerald-100 text-emerald-700 border-emerald-200";
    icon = <FileSignature size={12} />;
  } else if (status === 'unsigned') {
    style = "bg-amber-100 text-amber-700 border-amber-200";
    icon = <ScrollText size={12} />;
  }


  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 w-fit whitespace-nowrap ${style}`}>
      {icon}
      {text}
    </span>
  );
};

// --- Componente de Estatística ---
const StatCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {subtext && <p className="text-[10px] text-slate-400">{subtext}</p>}
    </div>
  </div>
);

// --- Helper de Data para Recorrência ---
const getDayName = (dateString) => {
    try {
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        let parts = dateString.split('/');
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        return days[date.getDay()];
    } catch (e) {
        return 'Dia da semana';
    }
};

export default function App() {
  // Estados Gerais
  const [currentView, setCurrentView] = useState('landing');
  const [subscribers, setSubscribers] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dbAppointments, setDbAppointments] = useState([]); 
  
  const [csvInput, setCsvInput] = useState('');
  
  // LOGIN / AUTH
  const [patientPhone, setPatientPhone] = useState('');
  const [authStep, setAuthStep] = useState('phone'); 
  const [userPin, setUserPin] = useState('');
  const [tempUserDoc, setTempUserDoc] = useState(null); 
  const [currentUser, setCurrentUser] = useState(null); // Dados do usuário logado em tempo real

  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Estados do Paciente
  const [myAppointments, setMyAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  
  // NOVO: Estado para Notas do Paciente
  const [noteContent, setNoteContent] = useState('');
  const [myNotes, setMyNotes] = useState([]);

  // Admin & UI
  const [adminTab, setAdminTab] = useState('dashboard'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [isIOS, setIsIOS] = useState(false);
  
  // Modais
  const [selectedUserLogs, setSelectedUserLogs] = useState(null); 
  const [userLogs, setUserLogs] = useState([]);
  const [showSOS, setShowSOS] = useState(false); 
  const [showProfile, setShowProfile] = useState(false); 
  const [newPin, setNewPin] = useState(''); 
  const [showContract, setShowContract] = useState(false); // NOVO: Modal de Contrato

  // Filtro por Profissional
  const [filterProf, setFilterProf] = useState('Todos');

  // Estados para Adição Manual
  const [manualEntry, setManualEntry] = useState({ nome: '', telefone: '', data: '', hora: '', profissional: '' });
  const [showManualForm, setShowManualForm] = useState(false);

  const [msgConfig, setMsgConfig] = useState({
    msg48h: "Olá {nome}, lembrete antecipado: Sessão com {profissional} confirmada para {data} às {hora}.",
    msg24h: "Olá {nome}, lembrete: Sua sessão com {profissional} é amanhã às {hora}.",
    msg12h: "Olá {nome}! Sua sessão com {profissional} é hoje às {hora}. Até logo!",
    whatsapp: "551141163129",
    contractText: "1. O horário da sessão é de sua exclusiva responsabilidade.\n2. Faltas não avisadas com 24h de antecedência serão cobradas.\n3. O sigilo profissional é absoluto.\n4. Férias e reajustes serão comunicados previamente.",
    contractVersion: 1 // Versão inicial do contrato
  });

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // 1. Efeitos Iniciais
  useEffect(() => {
    const isDeviceIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isDeviceIOS);

    const savedConfig = localStorage.getItem('psi_msg_config');
    if (savedConfig) {
        setMsgConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
    }

    if (!db) return;

    try {
      // Listeners principais
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubscribers(usersList);
        
        // Atualiza currentUser se estiver logado
        const savedPhone = localStorage.getItem('psi_user_phone');
        if (savedPhone) {
            const found = usersList.find(u => u.phone === savedPhone);
            if (found) setCurrentUser(found);
        }
      }, (error) => console.error("Erro conexão:", error));
      
      const qHist = query(collection(db, "history"), orderBy("sentAt", "desc"), limit(50));
      const unsubscribeHist = onSnapshot(qHist, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistoryLogs(logs);
      });

      const todayIso = new Date().toISOString().split('T')[0];
      const qApps = query(collection(db, "appointments"), where("isoDate", ">=", todayIso));
      const unsubscribeApps = onSnapshot(qApps, (snapshot) => {
          const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDbAppointments(apps);
      });

      const savedPhone = localStorage.getItem('psi_user_phone');
      if (savedPhone) {
        setPatientPhone(formatPhone(savedPhone));
      }

      return () => { unsubscribe(); unsubscribeHist(); unsubscribeApps(); };
    } catch (e) { console.error(e); }
  }, []);

  // Verificar Contrato ao Entrar
  useEffect(() => {
    if (currentView === 'patient-success' && currentUser) {
        // Se a versão aceita for menor que a versão atual da clínica, força o modal
        if (!currentUser.acceptedTermsVersion || currentUser.acceptedTermsVersion < (msgConfig.contractVersion || 1)) {
            setShowContract(true);
        }
    }
  }, [currentView, currentUser, msgConfig]);


  // Máscara de Telefone
  const formatPhone = (val) => {
    val = val.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    if (val.length > 7) val = `${val.slice(0, 7)}-${val.slice(7)}`;
    return val;
  };

  const handlePhoneChange = (e) => {
    setPatientPhone(formatPhone(e.target.value));
  };

  const fetchPatientAppointments = async (phone) => {
    setIsLoadingAppointments(true);
    try {
        const q = query(collection(db, "appointments"), where("phone", "==", phone));
        const snapshot = await getDocs(q);
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const today = new Date().toISOString().split('T')[0];
        const futureApps = apps
            .filter(a => a.isoDate >= today)
            .sort((a, b) => {
                if (a.isoDate === b.isoDate) return a.time.localeCompare(b.time);
                return a.isoDate.localeCompare(b.isoDate);
            });
        
        setMyAppointments(futureApps);
    } catch (error) {
        console.error("Erro ao buscar agenda:", error);
    } finally {
        setIsLoadingAppointments(false);
    }
  };

  const fetchPatientNotes = (phone) => {
    const q = query(collection(db, "patient_notes"), where("phone", "==", phone));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        notes.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
        setMyNotes(notes);
    });
    return unsubscribe;
  };

  // --- NOVA LÓGICA DE LOGIN COM PIN ---
  const handleCheckPhone = async () => {
    const rawPhone = patientPhone.replace(/\D/g, '');
    if (rawPhone.length < 10) return showToast("Por favor, digite um celular válido.", "error");

    setIsSaving(true);
    try {
        const q = query(collection(db, "users"), where("phone", "==", rawPhone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
            setTempUserDoc(userData);
            
            if (userData.pin) {
                setAuthStep('pin-verify'); 
            } else {
                setAuthStep('pin-create'); 
            }
        } else {
            setAuthStep('pin-create');
        }
    } catch (error) {
        showToast("Erro ao verificar: " + error.message, "error");
    } finally {
        setIsSaving(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (userPin.length < 4) return showToast("A senha deve ter 4 dígitos.", "error");
    const rawPhone = patientPhone.replace(/\D/g, '');
    
    setIsSaving(true);

    try {
        if (authStep === 'pin-verify') {
            if (tempUserDoc && tempUserDoc.pin === userPin) {
                await finalizeLogin(rawPhone, tempUserDoc.id);
            } else {
                showToast("Senha incorreta.", "error");
                setIsSaving(false);
            }
        } else {
            let userId = tempUserDoc?.id;
            
            let currentToken = null;
            try {
                if (messaging) {
                    currentToken = await getToken(messaging, { 
                        vapidKey: 'BDYKoBDPNh4Q0SoSaY7oSXGz2fgVqGkJZWRgCMMeryqj-Jk7_csF0oJapZWhkSa9SEjgfYf6x3thWNZ4QttknZM' 
                    });
                }
            } catch (err) { console.log("Token falhou:", err); }

            if (userId) {
                await updateDoc(doc(db, "users", userId), {
                    pin: userPin,
                    pushToken: currentToken || tempUserDoc.pushToken,
                    lastSeen: new Date()
                });
            } else {
                const docRef = await addDoc(collection(db, "users"), {
                    phone: rawPhone,
                    pin: userPin,
                    pushToken: currentToken,
                    createdAt: new Date(),
                    lastSeen: new Date(),
                    deviceType: navigator.userAgent
                });
                userId = docRef.id;
            }
            await finalizeLogin(rawPhone, userId);
        }
    } catch (error) {
        showToast("Erro: " + error.message, "error");
        setIsSaving(false);
    }
  };

  const finalizeLogin = async (phone, uid) => {
      localStorage.setItem('psi_user_phone', phone);
      await updateDoc(doc(db, "users", uid), { lastSeen: new Date() });
      await fetchPatientAppointments(phone);
      setUserPin('');
      setAuthStep('phone');
      setIsSaving(false);
      setCurrentView('patient-success');
  };

  const handleLogout = () => {
      localStorage.removeItem('psi_user_phone');
      setPatientPhone('');
      setUserPin('');
      setAuthStep('phone');
      setCurrentUser(null);
      setCurrentView('landing');
  };

  // --- FUNÇÕES DO PACIENTE ---
  useEffect(() => {
    if (currentView === 'patient-success') {
        const phone = localStorage.getItem('psi_user_phone');
        if (phone) {
            const unsub = fetchPatientNotes(phone);
            return () => unsub(); 
        }
    }
  }, [currentView]);

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return showToast("Escreva algo para salvar.", "error");
    const phone = localStorage.getItem('psi_user_phone');
    if (!phone) return;

    try {
        await addDoc(collection(db, "patient_notes"), {
            phone,
            content: noteContent,
            createdAt: new Date()
        });
        showToast("Anotação salva!");
        setNoteContent('');
    } catch (error) {
        showToast("Erro ao salvar anotação.", "error");
    }
  };

  const handleDeleteNote = async (id) => {
      if(!confirm("Apagar esta anotação?")) return;
      try {
          await deleteDoc(doc(db, "patient_notes", id));
      } catch (error) {
          console.error(error);
      }
  };

  const handleChangePin = async () => {
    if (!newPin || newPin.length < 4) return showToast("O novo PIN deve ter 4 números.", "error");
    const phone = localStorage.getItem('psi_user_phone');
    if (!phone) return;

    try {
        const q = query(collection(db, "users"), where("phone", "==", phone));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const userId = snapshot.docs[0].id;
            await updateDoc(doc(db, "users", userId), { pin: newPin });
            showToast("Senha alterada com sucesso!");
            setNewPin('');
            setShowProfile(false);
        }
    } catch (error) {
        showToast("Erro ao alterar senha.", "error");
    }
  };

  // NOVO: Aceitar Contrato
  const handleAcceptContract = async () => {
      if (!currentUser) return;
      try {
          await updateDoc(doc(db, "users", currentUser.id), {
              acceptedTerms: true,
              acceptedTermsVersion: msgConfig.contractVersion || 1,
              acceptedTermsAt: new Date(),
              acceptedTermsContent: msgConfig.contractText
          });
          setShowContract(false);
          showToast("Termos aceites com sucesso!");
      } catch (error) {
          showToast("Erro ao aceitar termos: " + error.message, "error");
      }
  };

  // --- FUNÇÕES ADMIN ---
  const handleViewLogs = async (user) => {
    setSelectedUserLogs(user);
    try {
        const q = query(collection(db, "patient_notes"), where("phone", "==", user.phone)); 
        const snapshot = await getDocs(q);
        let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        logs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
        setUserLogs(logs);
    } catch (error) {
        showToast("Erro ao buscar anotações: " + error.message, "error");
    }
  };

  const handleDeleteUser = async (userId, phone) => {
    if(!confirm(`Remover paciente ${phone}?`)) return;
    try {
        await deleteDoc(doc(db, "users", userId));
        showToast("Paciente removido.");
    } catch (error) {
        showToast("Erro ao apagar: " + error.message, "error");
    }
  };

  const handleResetPin = async (userId, phone) => {
    if(!confirm(`Resetar a senha do paciente ${phone}? Ele poderá criar uma nova no próximo acesso.`)) return;
    try {
        await updateDoc(doc(db, "users", userId), { pin: null });
        showToast("Senha resetada com sucesso!");
    } catch (error) {
        showToast("Erro ao resetar: " + error.message, "error");
    }
  };

  const handleExportCSV = () => {
    const headers = "Nome,Telefone,Data Cadastro,Ultimo Acesso,Versao Contrato\n";
    const rows = subscribers.map(u => {
        const joined = u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '';
        const seen = u.lastSeen?.seconds ? new Date(u.lastSeen.seconds * 1000).toLocaleDateString() : '';
        const safeName = u.name ? `"${u.name}"` : 'Sem nome';
        const safePhone = u.phone || 'Sem telefone';
        const contractVer = u.acceptedTermsVersion ? `v${u.acceptedTermsVersion}` : 'Pendente';
        return `${safeName},${safePhone},${joined},${seen},${contractVer}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes_permitta_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // 3. Processar Planilha
  const processCsv = (inputText = csvInput) => {
    if (!inputText) return;
    const lines = inputText.split('\n');
    
    const processed = lines.map((line, id) => {
      let parts = line.split(',');
      if (parts.length < 2 && line.includes(';')) parts = line.split(';');

      const [nome, tel, dataStr, hora, profissional] = parts;
      if (!nome || !tel) return null;
      
      const cleanPhone = tel.trim().replace(/\D/g, '');
      const subscriber = subscribers.find(s => s.phone === cleanPhone);
      const nomeProfissional = profissional ? profissional.trim() : 'Psicólogo(a)';
      
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
                timeLabel = "Faltam < 12h";
                reminderType = "12h";
                messageBody = msgConfig.msg12h.replace('{nome}', nome.split(' ')[0]).replace('{data}', dataStr).replace('{hora}', hora.trim()).replace('{profissional}', nomeProfissional);
            } else if (diffHours <= 30) { 
                timeLabel = "Faltam ~24h";
                reminderType = "24h";
                messageBody = msgConfig.msg24h.replace('{nome}', nome.split(' ')[0]).replace('{data}', dataStr).replace('{hora}', hora.trim()).replace('{profissional}', nomeProfissional);
            } else if (diffHours <= 54) {
                timeLabel = "Faltam ~48h";
                reminderType = "48h";
                messageBody = msgConfig.msg48h.replace('{nome}', nome.split(' ')[0]).replace('{data}', dataStr).replace('{hora}', hora.trim()).replace('{profissional}', nomeProfissional);
            } else {
                timeLabel = `Faltam ${Math.round(diffHours / 24)} dias`;
            }
        } catch (e) {
            timeLabel = "Erro Data";
        }
      }

      return { 
        id, nome, cleanPhone, data: dataStr, isoDate, hora, profissional: nomeProfissional,
        isSubscribed: !!subscriber, pushToken: subscriber?.pushToken,
        timeLabel, reminderType, messageBody
      };
    }).filter(Boolean);
    
    setAppointments(processed);
  };

  const professionalsList = useMemo(() => {
    const profs = new Set(appointments.map(a => a.profissional));
    return ['Todos', ...Array.from(profs)];
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    if (filterProf === 'Todos') return appointments;
    return appointments.filter(a => a.profissional === filterProf);
  }, [appointments, filterProf]);

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

  const handleAddManual = () => {
    const { nome, telefone, data, hora, profissional } = manualEntry;
    if (!nome || !telefone || !data || !hora) return showToast("Preencha os campos obrigatórios.", "error");
    
    const newLine = `${nome},${telefone},${data},${hora},${profissional || ''}`;
    const newInput = csvInput ? csvInput + '\n' + newLine : newLine;
    
    setCsvInput(newInput);
    processCsv(newInput);
    setManualEntry({ nome: '', telefone: '', data: '', hora: '', profissional: '' });
    setShowManualForm(false);
    showToast("Agendamento adicionado!");
  };

  const clearData = () => { setCsvInput(''); setAppointments([]); setFilterProf('Todos'); };

  const handleSyncSchedule = async () => {
    if (appointments.length === 0) return showToast("Não há agendamentos para salvar.", "error");
    
    if(!confirm(`Deseja sincronizar ${appointments.length} agendamentos?`)) return;

    setIsSaving(true);

    try {
        const promises = appointments.map(async (app) => {
            if (!app.isoDate || !app.hora) return;
            const docId = `${app.cleanPhone}_${app.isoDate}_${app.hora.replace(':','')}`;
            await setDoc(doc(db, "appointments", docId), {
                phone: app.cleanPhone,
                patientName: app.nome,
                date: app.data, 
                isoDate: app.isoDate, 
                time: app.hora,
                professional: app.profissional,
                createdAt: new Date()
            });
            return 1;
        });

        await Promise.all(promises);
        showToast("Agenda sincronizada!");
    } catch (error) {
        showToast("Erro ao salvar agenda: " + error.message, "error");
    } finally {
        setIsSaving(false);
    }
  };

  const handleSendReminders = async () => {
    const targets = filteredAppointments.filter(a => a.isSubscribed && a.pushToken && a.reminderType);
    if (targets.length === 0) return showToast("Nenhum lembrete pendente para esta seleção.", "error");
    
    const summary = `Confirmar envio ${filterProf !== 'Todos' ? 'para '+filterProf : ''}?\n\n` + 
                    `Total: ${targets.length} lembretes`;

    if (!confirm(summary)) return;

    setIsSending(true);
    let successCount = 0;

    try {
        const promises = targets.map(async (target) => {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokens: [target.pushToken], 
                    title: 'Lembrete Psi 🧠',
                    body: target.messageBody
                })
            });
            const data = await response.json();
            
            if (data.success) {
                const subscriber = subscribers.find(s => s.phone === target.cleanPhone);
                if (subscriber && (!subscriber.name || subscriber.name !== target.nome)) {
                     updateDoc(doc(db, "users", subscriber.id), { name: target.nome }).catch(console.error);
                }
                return 1;
            }
            return 0;
        });

        const results = await Promise.all(promises);
        successCount = results.reduce((a, b) => a + b, 0);

        if (successCount > 0) {
            await addDoc(collection(db, "history"), {
                sentAt: new Date(),
                count: successCount,
                types: [...new Set(targets.map(t => t.reminderType))], 
                summary: `${successCount} mensagens (${filterProf}).`
            });
        }

        showToast(`Sucesso! ${successCount} mensagens enviadas.`);

    } catch (error) {
      showToast("Erro no envio: " + error.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleAdminAccess = () => {
    const password = prompt("Digite a senha de administrador:");
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) { 
      setCurrentView('admin-dashboard');
    } else if (password !== null) {
      showToast("Senha incorreta.", "error");
    }
  };

  // NOVO: Função para salvar e incrementar versão do contrato
  const saveConfig = (incrementVersion = false) => {
    const newConfig = { ...msgConfig };
    if (incrementVersion) {
        newConfig.contractVersion = (newConfig.contractVersion || 1) + 1;
    }
    setMsgConfig(newConfig);
    localStorage.setItem('psi_msg_config', JSON.stringify(newConfig));
    showToast(incrementVersion ? "Termos atualizados (novo aceite exigido)!" : "Configurações salvas!");
  };

  const activeUsersCount = subscribers.filter(u => {
    if (!u.lastSeen?.seconds) return false;
    const diffDays = (new Date() - new Date(u.lastSeen.seconds * 1000)) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).length;

  const totalMessagesSent = historyLogs.reduce((acc, curr) => acc + (curr.count || 0), 0);
  
  // Dashboard atualizado
  const totalFutureApps = dbAppointments.length;

  // --- Renderização ---

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg space-y-6 relative">
          {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({msg:'', type:''})} />}

          <div className="w-16 h-16 bg-violet-600 rounded-xl flex items-center justify-center mx-auto shadow-violet-200 shadow-lg">
             {authStep === 'phone' ? <Bell className="text-white w-8 h-8" /> : <Lock className="text-white w-8 h-8" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lembrete Psi</h1>
            <p className="text-slate-500 mt-2">Nunca mais esqueça o horário da sua terapia.</p>
          </div>
          
          <div className="bg-violet-50 p-3 rounded-lg border border-violet-100 text-xs text-violet-800 leading-relaxed">
            <p className="font-bold mb-1 flex items-center justify-center gap-1"><HeartPulse size={14}/> Importante</p>
            A constância é o segredo da evolução. Faltas frequentes podem prejudicar seu progresso terapêutico.
          </div>

          <div className="space-y-3">
            <Button onClick={() => setCurrentView('patient-form')} className="w-full py-4 text-lg" icon={Smartphone}>
              Acessar Meu Painel
            </Button>
            <p className="text-xs text-slate-400">Funciona direto no navegador.</p>
          </div>

          {isIOS && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left text-sm text-slate-600 animate-pulse">
                <p className="font-bold flex items-center gap-2 mb-1"><Share size={16}/> Usuários iPhone:</p>
                <p>Para receber notificações, toque no botão <strong>Compartilhar</strong> e escolha <strong>"Adicionar à Tela de Início"</strong>.</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <button onClick={handleAdminAccess} className="text-sm text-slate-400 hover:text-violet-600 underline">
              Acesso da Clínica (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE LOGIN/CADASTRO DO PACIENTE
  if (currentView === 'patient-form') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6">
        {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({msg:'', type:''})} />}
        <button onClick={() => { setCurrentView('landing'); setAuthStep('phone'); setPatientPhone(''); }} className="w-fit p-2 hover:bg-slate-50 rounded-full mb-6"><X className="text-slate-400" /></button>
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-6">
          
          {authStep === 'phone' && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Qual seu número?</h2>
                <p className="text-slate-500 mt-1">Digite o celular cadastrado na clínica.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Celular</label>
                <input 
                  type="tel" 
                  value={patientPhone} 
                  onChange={handlePhoneChange} 
                  placeholder="(11) 99999-9999" 
                  className="w-full text-2xl p-4 bg-slate-50 border border-slate-200 rounded-xl outline-violet-500 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-violet-100 transition-all" 
                />
              </div>
              <Button onClick={handleCheckPhone} disabled={isSaving} className="w-full py-4 text-lg" icon={isSaving ? Loader2 : CheckCircle}>
                {isSaving ? "Verificando..." : "Continuar"}
              </Button>
            </>
          )}

          {(authStep === 'pin-create' || authStep === 'pin-verify') && (
            <div className="animate-in fade-in slide-in-from-bottom duration-300">
               <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                    {authStep === 'pin-create' ? 'Crie sua Senha' : 'Digite sua Senha'}
                </h2>
                <p className="text-slate-500 mt-1">
                    {authStep === 'pin-create' 
                        ? 'Para sua segurança, crie um PIN de 4 números.' 
                        : 'Informe seu PIN para entrar.'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">PIN (4 Dígitos)</label>
                <input 
                  type="tel" 
                  maxLength={4}
                  value={userPin} 
                  onChange={(e) => setUserPin(e.target.value.replace(/\D/g, ''))} 
                  placeholder="****" 
                  className="w-full text-center text-3xl p-3 bg-slate-50 border border-slate-200 rounded-xl outline-violet-500 text-slate-900 tracking-[0.5em] mt-1" 
                />
              </div>
              <Button onClick={handleAuthSubmit} disabled={isSaving || userPin.length < 4} className="w-full py-4 text-lg mt-6" icon={isSaving ? Loader2 : KeyRound}>
                {isSaving ? "Acessando..." : (authStep === 'pin-create' ? "Criar e Entrar" : "Entrar")}
              </Button>
              <button onClick={() => setAuthStep('phone')} className="w-full text-center text-sm text-slate-400 mt-4 hover:text-slate-600">Voltar</button>
              {authStep === 'pin-verify' && (
                  <p className="text-xs text-center text-violet-400 mt-4">
                      Esqueceu a senha? Solicite o reset na clínica.
                  </p>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  // TELA DO PACIENTE - AGORA COM AGENDA
  if (currentView === 'patient-success') {
    const nextAppointment = myAppointments.length > 0 ? myAppointments[0] : null;
    let recurrenceText = "Aguardando agendamento";
    if (nextAppointment) {
        const dayName = getDayName(nextAppointment.date);
        recurrenceText = `Toda ${dayName} às ${nextAppointment.time}`;
    }

    return (
      <div className="min-h-screen bg-violet-50 flex flex-col p-6 overflow-hidden">
        {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({msg:'', type:''})} />}
        <a 
            href={`https://wa.me/${msgConfig.whatsapp ? msgConfig.whatsapp.replace(/\D/g, '') : '551141163129'}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center animate-bounce-slow"
            title="Falar com a Clínica"
        >
            <MessageCircle size={28} />
        </a>
        
        {/* MODAL SOS */}
        {showSOS && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
                    <div className="bg-rose-500 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><LifeBuoy size={20}/> Apoio Emocional</h3>
                        <button onClick={() => setShowSOS(false)}><X size={20} className="hover:text-rose-100"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-600 text-center mb-2">Se você está passando por um momento difícil, não hesite em pedir ajuda.</p>
                        
                        <a href="tel:188" className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors">
                            <div className="flex flex-col">
                                <span className="font-bold text-rose-700 text-lg">Ligar 188</span>
                                <span className="text-xs text-rose-500">CVV - Centro de Valorização da Vida</span>
                            </div>
                            <Smartphone size={24} className="text-rose-500" />
                        </a>
                        
                        <div className="border-t border-slate-100 pt-4 mt-2">
                             <p className="text-xs text-slate-500 text-center mb-3">Contato da Clínica</p>
                             <a 
                                href={`https://wa.me/${msgConfig.whatsapp ? msgConfig.whatsapp.replace(/\D/g, '') : '551141163129'}`}
                                target="_blank"
                                className="w-full bg-green-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors font-medium"
                             >
                                 <MessageCircle size={18} /> Chamar no WhatsApp
                             </a>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL PERFIL/SENHA */}
        {showProfile && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl w-full max-w-sm flex flex-col shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield size={20} className="text-violet-600"/> Alterar Senha</h3>
                        <button onClick={() => {setShowProfile(false); setNewPin('');}}><X size={20} className="text-slate-400"/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-400">Novo PIN (4 Dígitos)</label>
                            <input 
                                type="tel" 
                                maxLength={4}
                                value={newPin} 
                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} 
                                placeholder="****" 
                                className="w-full text-center text-3xl p-3 bg-slate-50 border border-slate-200 rounded-xl outline-violet-500 text-slate-900 tracking-[0.5em] mt-1" 
                            />
                        </div>
                        <Button onClick={handleChangePin} disabled={newPin.length < 4} className="w-full">
                            Confirmar Troca
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL CONTRATO (ATUALIZADO) */}
        {showContract && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[80vh]">
                    <div className="bg-violet-600 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><ScrollText size={20}/> Termos e Combinados</h3>
                        {/* Se o contrato já foi aceite e não mudou, pode fechar. Senão, é obrigatório */}
                        {(currentUser?.acceptedTermsVersion === msgConfig.contractVersion) && (
                           <button onClick={() => setShowContract(false)}><X size={20} className="hover:text-violet-200"/></button>
                        )}
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <p className="text-xs text-slate-400 mb-2 font-mono">Versão: {msgConfig.contractVersion || 1}</p>
                        <div className="prose prose-sm text-slate-700 whitespace-pre-wrap">
                            {msgConfig.contractText || "Nenhum termo cadastrado."}
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <Button onClick={handleAcceptContract} className="w-full" variant="success">
                            <FileSignature size={18} className="mr-2"/> Li e Aceito os Termos
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Header Paciente */}
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-full shadow-sm">
                    <User className="text-violet-600 w-6 h-6" />
                </div>
                <div>
                    <h2 className="font-bold text-slate-800">Olá, Paciente</h2>
                    <p className="text-xs text-slate-500 cursor-pointer hover:text-violet-600 underline" onClick={() => setShowProfile(true)}>Meus Dados / Senha</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                {/* BOTÃO COMBINADOS */}
                <button onClick={() => setShowContract(true)} className="bg-violet-100 p-2 rounded-full text-violet-600 hover:bg-violet-200 shadow-sm transition-colors" title="Meus Combinados">
                    <ScrollText size={18} />
                </button>
                <button onClick={() => setShowSOS(true)} className="bg-rose-500 p-2 rounded-full text-white shadow-md shadow-rose-200 hover:bg-rose-600 transition-all animate-pulse" title="Ajuda / SOS">
                    <LifeBuoy size={18} />
                </button>
                <button onClick={handleLogout} className="bg-white p-2 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors" title="Sair">
                    <LogOut size={18} />
                </button>
            </div>
        </div>

        {/* AVISO DE CONSTÂNCIA */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-violet-500 mb-6 flex gap-3 items-start">
             <div className="bg-violet-100 p-2 rounded-full flex-shrink-0">
                 <Activity size={20} className="text-violet-600" />
             </div>
             <div>
                 <h4 className="font-bold text-slate-800 text-sm">O segredo é a constância</h4>
                 <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                     Lembre-se: cada sessão é um passo importante. Faltas podem interromper seu progresso. Priorize seu horário!
                 </p>
             </div>
        </div>

        {/* Card Recorrência */}
        {nextAppointment ? (
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-violet-100 text-xs font-medium uppercase tracking-wider mb-1">Seu Horário Fixo</p>
                    <h3 className="text-2xl font-bold mb-2">{recurrenceText}</h3>
                    <div className="flex items-center gap-2 text-sm opacity-90">
                        <User size={16} /> 
                        <span>{nextAppointment.professional || 'Psicoterapia'}</span>
                    </div>
                </div>
                <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            </div>
        ) : (
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-slate-200 text-center">
                <p className="text-slate-500">Nenhum horário fixo identificado.</p>
            </div>
        )}

        {/* Disclaimer */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-6 flex gap-3">
            <Info className="text-amber-600 w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
                Este horário é válido como sessão semanal recorrente. Alterações devem ser combinadas previamente com a clínica.
            </p>
        </div>

        {/* ANOTAÇÕES PARA A SESSÃO */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <StickyNote size={18} className="text-violet-600"/> Anotações para a Terapia
            </h3>
            <p className="text-xs text-slate-500 mb-4">Lembrete de algo para falar ou para o responsável informar ao profissional.</p>
            
            <textarea 
                placeholder="Ex: Falar sobre a ansiedade na escola..."
                className="w-full p-3 border border-slate-200 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-violet-500 outline-none h-24 resize-none text-slate-900"
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
            />
            <Button onClick={handleSaveNote} className="w-full text-sm">Salvar Anotação</Button>

            {myNotes.length > 0 && (
                <div className="mt-6 space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase">Suas anotações recentes</p>
                    {myNotes.map(note => (
                        <div key={note.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 relative group">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-slate-400">
                                    {note.createdAt?.seconds ? new Date(note.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje'}
                                </span>
                                <button onClick={() => handleDeleteNote(note.id)} className="text-red-300 hover:text-red-500">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Lista de Sessões */}
        <div className="flex-1 overflow-y-auto pb-4">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase text-slate-500">
                <Calendar size={16}/> Datas Confirmadas
            </h3>
            
            {isLoadingAppointments ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-violet-400" /></div>
            ) : myAppointments.length > 0 ? (
                <div className="space-y-3">
                    {myAppointments.map(app => (
                        <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="bg-slate-100 text-slate-600 w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                                <span className="font-bold text-sm">{app.date.split('/')[0]}</span>
                                <span className="text-[9px] uppercase">{new Date(app.isoDate).toLocaleString('pt-BR', { month: 'short' }).replace('.','')}</span>
                            </div>
                            <div>
                                <p className="font-bold text-slate-700 text-sm">Sessão Agendada</p>
                                <p className="text-xs text-slate-500">{app.date} às {app.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 text-slate-400 text-xs">
                    Nenhuma data específica carregada.
                </div>
            )}
        </div>
      </div>
    );
  }

  // --- ADMIN ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({msg:'', type:''})} />}
      
      {/* Modal de Logs (Anotações) */}
      {selectedUserLogs && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800">Anotações: {selectedUserLogs.name || selectedUserLogs.phone}</h3>
                    <button onClick={() => setSelectedUserLogs(null)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
                    {userLogs.length === 0 ? <p className="text-center text-slate-400 py-10">Nenhuma anotação encontrada.</p> : (
                        <div className="space-y-3">
                            {userLogs.map(log => (
                                <div key={log.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{log.content}</p>
                                    <span className="text-xs text-slate-400 block text-right border-t border-slate-50 pt-2">
                                        {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><LayoutDashboard className="text-violet-600"/> Painel Permittá</h1>
          
          <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            <button onClick={() => setAdminTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${adminTab === 'dashboard' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-violet-600'}`}>
                <LayoutDashboard size={16} /> Visão Geral
            </button>
            <button onClick={() => setAdminTab('uploads')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${adminTab === 'uploads' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-violet-600'}`}>
                <Send size={16} /> Disparos
            </button>
            <button onClick={() => setAdminTab('users')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${adminTab === 'users' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-violet-600'}`}>
                <Users size={16} /> Pacientes
            </button>
            <button onClick={() => setAdminTab('history')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${adminTab === 'history' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-violet-600'}`}>
                <History size={16} /> Histórico
            </button>
            <button onClick={() => setAdminTab('config')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${adminTab === 'config' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-violet-600'}`}>
                <Settings size={16} /> Config
            </button>
          </div>

          <button onClick={() => setCurrentView('landing')} className="text-slate-500 flex gap-2 items-center hover:text-red-600 transition-colors bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm"><LogOut size={16}/> Sair</button>
        </div>

        {/* DASHBOARD */}
        {adminTab === 'dashboard' && (
            <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                    <StatCard title="Total Pacientes" value={subscribers.length} icon={Users} colorClass="bg-blue-100 text-blue-600" />
                    <StatCard title="Pacientes Ativos (30d)" value={activeUsersCount} icon={Activity} colorClass="bg-emerald-100 text-emerald-600" />
                    <StatCard title="Mensagens Enviadas" value={totalMessagesSent} icon={Send} colorClass="bg-purple-100 text-purple-600" />
                </div>
                
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Pronto para os envios de hoje?</h2>
                        <p className="opacity-90">Carregue a planilha MENSAL ou SEMANAL para disparar os lembretes de 48h, 24h e 12h.</p>
                    </div>
                    <Button onClick={() => setAdminTab('uploads')} variant="white" className="px-8 py-4 text-lg">
                        Começar Disparos
                    </Button>
                </div>
            </div>
        )}

        {/* ABA DISPAROS */}
        {adminTab === 'uploads' && (
            <div className="grid md:grid-cols-2 gap-6 h-[600px]">
                <Card title="1. Carregar Agenda">
                    <div className="flex flex-col h-full gap-4">
                        
                        {/* Formulário de Adição Rápida */}
                        {showManualForm ? (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2 text-sm animate-in fade-in zoom-in">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input placeholder="Nome" className="p-2 rounded border text-slate-900" value={manualEntry.nome} onChange={e=>setManualEntry({...manualEntry, nome: e.target.value})} />
                                    <input placeholder="Tel (com DDD)" className="p-2 rounded border text-slate-900" value={manualEntry.telefone} onChange={e=>setManualEntry({...manualEntry, telefone: e.target.value})} />
                                    <input type="date" className="p-2 rounded border text-slate-900" value={manualEntry.data} onChange={e=>setManualEntry({...manualEntry, data: e.target.value})} />
                                    <input type="time" className="p-2 rounded border text-slate-900" value={manualEntry.hora} onChange={e=>setManualEntry({...manualEntry, hora: e.target.value})} />
                                </div>
                                <input placeholder="Profissional (opcional)" className="p-2 rounded border w-full mb-2 text-slate-900" value={manualEntry.profissional} onChange={e=>setManualEntry({...manualEntry, profissional: e.target.value})} />
                                <div className="flex gap-2">
                                    <Button onClick={handleAddManual} variant="success" className="flex-1 text-xs py-1">Adicionar</Button>
                                    <Button onClick={()=>setShowManualForm(false)} variant="secondary" className="text-xs py-1">Cancelar</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button onClick={()=>setShowManualForm(true)} variant="secondary" icon={PlusCircle} className="mb-2 flex-1">Adicionar Manual</Button>
                                <Button onClick={handleSyncSchedule} variant="primary" icon={CloudUpload} className="mb-2 flex-1" disabled={isSaving || appointments.length === 0}>
                                    Sincronizar Agenda
                                </Button>
                            </div>
                        )}

                        <textarea 
                            value={csvInput} 
                            onChange={(e) => setCsvInput(e.target.value)} 
                            placeholder="Cole aqui a planilha CSV:&#10;Nome, Telefone, Data, Hora, Profissional" 
                            className="w-full h-full p-3 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-violet-500 outline-none resize-none flex-1 text-slate-900" 
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
                    {/* Filtro por Profissional */}
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2 border-b border-slate-100">
                        <Filter size={14} className="text-slate-400 mt-1.5"/>
                        {professionalsList.map(prof => (
                            <button
                                key={prof}
                                onClick={() => setFilterProf(prof)}
                                className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${filterProf === prof ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {prof}
                            </button>
                        ))}
                    </div>

                    {filteredAppointments.length === 0 ? (
                        <div className="text-slate-400 text-center py-12 flex flex-col items-center justify-center h-full">
                            <FileSpreadsheet className="w-12 h-12 opacity-20 mb-2"/>
                            <p>Nenhum dado importado.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="space-y-2 flex-1 overflow-y-auto pr-1 mb-4">
                                {filteredAppointments.map((app) => (
                                    <div key={app.id} className={`flex flex-col p-3 border rounded-lg ${app.reminderType ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-100 opacity-60'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{app.nome}</span>
                                                {app.profissional && <span className="text-xs text-slate-400 flex items-center gap-1"><User size={10}/> {app.profissional}</span>}
                                            </div>
                                            <Badge status={app.isSubscribed ? 'match' : 'missing'} text={app.isSubscribed ? "App Instalado" : "Sem App"} />
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                                            <span>{app.data} às {app.hora}</span>
                                            {app.reminderType ? (
                                                <span className="font-bold text-violet-600 flex items-center gap-1">
                                                    <Mail size={10} /> Enviar Aviso {app.reminderType}
                                                </span>
                                            ) : (
                                                <span>{app.timeLabel}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {filteredAppointments.filter(a => a.isSubscribed && a.reminderType).length > 0 ? (
                                <Button onClick={handleSendReminders} variant="success" disabled={isSending} icon={isSending ? Loader2 : Bell}>
                                    {isSending ? "Enviando..." : `Disparar ${filteredAppointments.filter(a => a.isSubscribed && a.reminderType).length} Lembretes`}
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
        )}

        {/* ABA PACIENTES */}
        {adminTab === 'users' && (
            <Card title="Base de Pacientes Cadastrados" className="h-[600px]">
                <div className="flex flex-col h-full">
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                            <input type="text" placeholder="Pesquisar por telefone..." className="w-full pl-10 p-2 border border-slate-300 rounded-lg text-sm outline-violet-500 text-slate-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                        </div>
                        <Button onClick={handleExportCSV} variant="secondary" icon={Download}>Exportar CSV</Button>
                    </div>
                    <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Paciente</th>
                                    <th className="px-4 py-3">Telefone</th>
                                    <th className="px-4 py-3">Contrato</th>
                                    <th className="px-4 py-3">Último Acesso</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subscribers.filter(u => (u.phone || '').includes(searchTerm)).map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {user.name || 'Sem nome'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-600">{user.phone}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                           {user.acceptedTermsVersion === msgConfig.contractVersion ? 
                                              <Badge status="signed" text={`v${user.acceptedTermsVersion}`}/> : 
                                              <Badge status="unsigned" text="Pendente"/>
                                           }
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {user.lastSeen?.seconds ? (
                                                <span className="flex items-center gap-1 text-violet-600 font-medium">
                                                    <Eye size={12} />
                                                    {new Date(user.lastSeen.seconds * 1000).toLocaleDateString()}
                                                </span>
                                            ) : <span className="text-xs text-slate-300">Nunca</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            {/* Botão de Resetar PIN */}
                                            <button onClick={() => handleResetPin(user.id, user.phone)} className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 p-2 rounded transition-colors" title="Resetar PIN">
                                                <RotateCcw size={16} />
                                            </button>
                                            
                                            {/* BOTÃO PARA VER ANOTAÇÕES */}
                                            <button onClick={() => handleViewLogs(user)} className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded transition-colors" title="Ver Anotações">
                                                <FileText size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.id, user.phone)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors" title="Remover"><UserMinus size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {subscribers.filter(u => (u.phone || '').includes(searchTerm)).length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-8 text-slate-400">Nenhum paciente encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        )}

        {/* ABA HISTÓRICO */}
        {adminTab === 'history' && (
            <Card title="Histórico de Envios" className="h-[600px]">
                <div className="flex-1 overflow-y-auto">
                    {historyLogs.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">Nenhum envio registado ainda.</div>
                    ) : (
                        <div className="space-y-3">
                            {historyLogs.map(log => (
                                <div key={log.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center bg-slate-50">
                                    <div>
                                        <div className="text-sm font-bold text-slate-700">
                                            {log.sentAt?.seconds ? new Date(log.sentAt.seconds * 1000).toLocaleString() : 'Data desconhecida'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {log.summary}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {log.types?.map(t => (
                                            <span key={t} className="bg-violet-100 text-violet-700 px-2 py-1 rounded text-xs font-bold">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        )}

        {/* ABA CONFIGURAÇÃO */}
        {adminTab === 'config' && (
            <Card title="Personalizar Mensagens">
                <div className="space-y-6 max-w-2xl mx-auto py-4">
                    <div className="bg-violet-50 p-4 rounded-lg border border-violet-100 text-sm text-violet-800">
                        <strong>Dica:</strong> Use as variáveis <code>{'{nome}'}</code>, <code>{'{data}'}</code>, <code>{'{hora}'}</code> e <code>{'{profissional}'}</code> para personalizar automaticamente.
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp da Clínica (Para botão de contato)</label>
                        <input 
                            type="tel"
                            value={msgConfig.whatsapp}
                            onChange={(e) => setMsgConfig({...msgConfig, whatsapp: e.target.value})}
                            placeholder="Ex: 5511999999999"
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none text-slate-900"
                        />
                    </div>
                    
                    {/* CAMPO DE CONTRATO */}
                    <div className="border-t border-slate-100 pt-6 mt-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-slate-700">Termos e Combinados (Contrato Terapêutico)</label>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Versão Atual: {msgConfig.contractVersion || 1}</span>
                        </div>
                        <textarea 
                            value={msgConfig.contractText}
                            onChange={(e) => setMsgConfig({...msgConfig, contractText: e.target.value})}
                            placeholder="Escreva aqui as regras de faltas, férias, pagamentos..."
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none h-32 text-slate-900"
                        />
                        <div className="flex gap-2 mt-2">
                            <Button onClick={() => saveConfig(false)} variant="secondary" className="flex-1 text-xs">Salvar Apenas Texto</Button>
                            <Button onClick={() => saveConfig(true)} className="flex-1 text-xs" icon={Upload}>Salvar e Publicar Nova Versão</Button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">* "Salvar e Publicar Nova Versão" obrigará todos os pacientes a aceitarem novamente os termos ao entrar.</p>
                    </div>

                    <div className="border-t border-slate-100 pt-6 mt-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem de 48h (Antecipado)</label>
                        <textarea 
                            value={msgConfig.msg48h}
                            onChange={(e) => setMsgConfig({...msgConfig, msg48h: e.target.value})}
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none h-24 text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem de 24h (Véspera)</label>
                        <textarea 
                            value={msgConfig.msg24h}
                            onChange={(e) => setMsgConfig({...msgConfig, msg24h: e.target.value})}
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none h-24 text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem de 12h (Dia da Sessão)</label>
                        <textarea 
                            value={msgConfig.msg12h}
                            onChange={(e) => setMsgConfig({...msgConfig, msg12h: e.target.value})}
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none h-24 text-slate-900"
                        />
                    </div>
                    <Button onClick={() => saveConfig(false)} icon={Save} className="w-full">Salvar Configurações</Button>
                </div>
            </Card>
        )}

      </div>
    </div>
  );
}