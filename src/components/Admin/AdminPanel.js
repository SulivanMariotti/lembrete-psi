import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../app/firebase'; 
import { collection, addDoc, deleteDoc, updateDoc, setDoc, doc } from 'firebase/firestore';
// CORREÇÃO: Adicionado 'Smartphone' nas importações
import { Send, Users, Upload, FileSpreadsheet, Mail, Trash2, Search, UserMinus, Eye, Settings, History, Save, LayoutDashboard, Download, Activity, PlusCircle, Filter, CalendarCheck, LogOut, RotateCcw, FileText, Bell, Loader2, CloudUpload, Smartphone } from 'lucide-react';
import { Button, Card, Badge, StatCard } from '../DesignSystem';
import { parseCSV } from '../../services/dataService';

export default function AdminPanel({ onLogout, subscribers, historyLogs, dbAppointments, showToast, globalConfig }) {
  const [adminTab, setAdminTab] = useState('dashboard');
  const [csvInput, setCsvInput] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEntry, setManualEntry] = useState({ nome: '', telefone: '', data: '', hora: '', profissional: '' });
  const [showManualForm, setShowManualForm] = useState(false);
  const [filterProf, setFilterProf] = useState('Todos');
  
  // Estado local para config
  const [localConfig, setLocalConfig] = useState({
      msg48h: '', msg24h: '', msg12h: '', whatsapp: '', contractText: '', contractVersion: 1
  });

  // Atualiza config local quando a global carrega
  useEffect(() => {
    if (globalConfig) setLocalConfig(prev => ({ ...prev, ...globalConfig }));
  }, [globalConfig]);

  // --- LÓGICA DE DADOS ---
  const activeUsersCount = subscribers.filter(u => {
    if (!u.lastSeen?.seconds) return false;
    const diffDays = (new Date() - new Date(u.lastSeen.seconds * 1000)) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).length;

  const totalMessagesSent = historyLogs.reduce((acc, curr) => acc + (curr.count || 0), 0);

  // CSV
  const processCsv = (inputText = csvInput) => {
     const processed = parseCSV(inputText, subscribers, localConfig);
     setAppointments(processed);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvInput(e.target.result);
      processCsv(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleAddManual = () => {
    const { nome, telefone, data, hora, profissional } = manualEntry;
    if (!nome || !telefone || !data || !hora) return showToast("Preencha os campos obrigatórios.", "error");
    const newLine = `${nome},${telefone},${data},${hora},${profissional || ''}`;
    const newInput = csvInput ? (csvInput + '\n' + newLine) : newLine;
    setCsvInput(newInput);
    processCsv(newInput);
    setManualEntry({ nome: '', telefone: '', data: '', hora: '', profissional: '' });
    setShowManualForm(false);
    showToast("Agendamento adicionado!");
  };

  const handleClearData = () => {
    setCsvInput('');
    setAppointments([]);
    setFilterProf('Todos');
  };

  // ENVIO
  const handleSendReminders = async () => {
    const targets = filteredAppointments.filter(a => a.isSubscribed && a.pushToken && a.reminderType);
    if (targets.length === 0) return showToast("Nenhum lembrete pendente.", "error");
    if (!confirm(`Confirmar envio de ${targets.length} lembretes?`)) return;

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
                    body: target.messageBody,
                    link: 'https://agenda.msgflow.app.br'
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
                sentAt: new Date(), count: successCount, types: [...new Set(targets.map(t => t.reminderType))], summary: `${successCount} mensagens enviadas.`
            });
        }
        showToast(`Sucesso! ${successCount} mensagens enviadas.`);
    } catch (error) {
      showToast("Erro no envio: " + error.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  // SYNC
  const handleSyncSchedule = async () => {
    if (appointments.length === 0) return showToast("Lista vazia.", "error");
    if(!confirm("Deseja sincronizar esta agenda com o banco de dados?")) return;
    setIsSaving(true);
    try {
        const promises = appointments.map(async (app) => {
            if (!app.isoDate || !app.hora) return;
            const docId = `${app.cleanPhone}_${app.isoDate}_${app.hora.replace(':','')}`;
            await setDoc(doc(db, "appointments", docId), {
                phone: app.cleanPhone, patientName: app.nome, date: app.data, isoDate: app.isoDate, time: app.hora, professional: app.profissional, createdAt: new Date()
            });
        });
        await Promise.all(promises);
        showToast("Agenda sincronizada com sucesso!");
    } catch (error) { showToast("Erro ao salvar: " + error.message, "error"); } 
    finally { setIsSaving(false); }
  };

  // CONFIG
  const saveConfig = async (incrementVersion = false) => {
    const newConfig = { ...localConfig };
    if (incrementVersion) newConfig.contractVersion = (Number(newConfig.contractVersion) || 1) + 1;
    
    try {
        await setDoc(doc(db, "settings", "global"), newConfig);
        showToast(incrementVersion ? "Termos atualizados (novo aceite exigido)!" : "Configurações salvas!");
    } catch (error) { showToast("Erro ao salvar: " + error.message, "error"); }
  };

  const handleExportCSV = () => {
    const headers = "Nome,Telefone,Data Cadastro,Ultimo Acesso\n";
    const rows = subscribers.map(u => {
        const joined = u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '';
        const seen = u.lastSeen?.seconds ? new Date(u.lastSeen.seconds * 1000).toLocaleDateString() : '';
        return `${u.name || ''},${u.phone},${joined},${seen}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes.csv`;
    a.click();
  };

  const handleDeleteUser = async (uid, phone) => { 
      if(confirm(`Tem certeza que deseja apagar o paciente ${phone}?`)) {
        try {
            await deleteDoc(doc(db, "users", uid));
            showToast("Paciente removido.");
        } catch (e) { showToast("Erro ao remover.", "error"); }
      }
  };

  const handleResetPin = async (uid) => {
    if(confirm("Resetar PIN deste paciente?")) {
        await updateDoc(doc(db, "users", uid), { pin: null });
        showToast("PIN resetado.");
    }
  };
  
  // Filtros
  const professionalsList = useMemo(() => ['Todos', ...new Set(appointments.map(a => a.profissional))], [appointments]);
  const filteredAppointments = useMemo(() => filterProf === 'Todos' ? appointments : appointments.filter(a => a.profissional === filterProf), [appointments, filterProf]);

  // Definição das Abas com Ícones
  const tabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'uploads', label: 'Disparos', icon: Send },
    { id: 'users', label: 'Pacientes', icon: Users },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'config', label: 'Configuração', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
        {/* HEADER & NAV */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <LayoutDashboard className="text-violet-600"/> 
            <span>Painel Permittá</span>
          </h1>
          
          <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl overflow-x-auto shadow-inner">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = adminTab === tab.id;
                return (
                    <button 
                        key={tab.id} 
                        onClick={() => setAdminTab(tab.id)} 
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                            isActive 
                            ? 'bg-white text-violet-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                        {tab.label}
                    </button>
                );
            })}
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2.5 rounded-full" title="Sair"><LogOut size={20}/></button>
        </div>

        {/* 1. DASHBOARD */}
        {adminTab === 'dashboard' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid md:grid-cols-4 gap-6">
                    <StatCard title="Total Pacientes" value={subscribers.length} icon={Users} colorClass="bg-blue-100 text-blue-600" />
                    <StatCard title="Pacientes Ativos (30d)" value={activeUsersCount} icon={Activity} colorClass="bg-emerald-100 text-emerald-600" />
                    <StatCard title="Total Envios" value={totalMessagesSent} icon={Send} colorClass="bg-purple-100 text-purple-600" />
                    <StatCard title="Agendamentos Futuros" value={dbAppointments.length} icon={CalendarCheck} colorClass="bg-orange-100 text-orange-600" />
                </div>
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-violet-200 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Gestão Diária</h2>
                        <p className="text-violet-100 opacity-90">Carregue a planilha e dispare os lembretes para os pacientes.</p>
                    </div>
                    <Button onClick={() => setAdminTab('uploads')} variant="white" className="px-8 py-3 shadow-lg">Começar Disparos</Button>
                </div>
                <Card title="Próximas Sessões Sincronizadas">
                     {dbAppointments.length === 0 ? (
                        <p className="text-center text-slate-400 py-12 flex flex-col items-center gap-2">
                             <CalendarCheck size={32} className="opacity-20"/>
                             Nenhuma sessão sincronizada no banco de dados.
                        </p>
                     ) : (
                         <div className="space-y-2 max-h-[300px] overflow-y-auto">
                             {dbAppointments.sort((a,b) => a.isoDate.localeCompare(b.isoDate)).slice(0, 10).map(app => (
                                 <div key={app.id} className="flex justify-between items-center p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                     <div className="flex flex-col">
                                         <span className="font-bold text-slate-700 text-sm">{app.patientName}</span>
                                         <span className="text-xs text-slate-400">{app.date} às {app.time}</span>
                                     </div>
                                     <Badge status={'pending'} text={'Agendado'} />
                                 </div>
                             ))}
                         </div>
                     )}
                </Card>
            </div>
        )}

        {/* 2. DISPAROS (UPLOADS) */}
        {adminTab === 'uploads' && (
            <div className="grid md:grid-cols-2 gap-6 h-[650px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card title="1. Carregar Agenda">
                    <div className="flex flex-col h-full gap-4">
                        {showManualForm ? (
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm shadow-inner">
                                 <h4 className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wider">Novo Agendamento</h4>
                                 <div className="space-y-3">
                                     <input placeholder="Nome" className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200" value={manualEntry.nome} onChange={e=>setManualEntry({...manualEntry, nome: e.target.value})} />
                                     <input placeholder="Tel (com DDD)" className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200" value={manualEntry.telefone} onChange={e=>setManualEntry({...manualEntry, telefone: e.target.value})} />
                                     <div className="flex gap-2">
                                         <input type="date" className="w-1/2 p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200" value={manualEntry.data} onChange={e=>setManualEntry({...manualEntry, data: e.target.value})} />
                                         <input type="time" className="w-1/2 p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200" value={manualEntry.hora} onChange={e=>setManualEntry({...manualEntry, hora: e.target.value})} />
                                     </div>
                                     <input placeholder="Profissional (opcional)" className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200" value={manualEntry.profissional} onChange={e=>setManualEntry({...manualEntry, profissional: e.target.value})} />
                                 </div>
                                 <div className="flex gap-2 mt-4">
                                     <Button onClick={handleAddManual} variant="success" className="flex-1 text-xs">Adicionar</Button>
                                     <Button onClick={()=>setShowManualForm(false)} variant="secondary" className="flex-1 text-xs">Cancelar</Button>
                                 </div>
                             </div>
                        ) : (
                             <div className="flex gap-3">
                                <Button onClick={()=>setShowManualForm(true)} variant="secondary" icon={PlusCircle} className="flex-1">Manual</Button>
                                <Button onClick={handleSyncSchedule} variant="primary" icon={CloudUpload} className="flex-1" disabled={isSaving || appointments.length === 0}>Sincronizar</Button>
                             </div>
                        )}
                        <textarea 
                            value={csvInput} 
                            onChange={(e) => setCsvInput(e.target.value)} 
                            placeholder="Cole aqui a planilha CSV:&#10;Nome, Telefone, Data, Hora, Profissional" 
                            className="w-full h-full p-4 border border-slate-100 bg-slate-50 rounded-xl text-slate-800 resize-none text-xs font-mono focus:bg-white focus:border-violet-200 focus:ring-2 focus:ring-violet-100 outline-none transition-all" 
                        />
                        <div className="flex gap-3">
                            <label className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 shadow-sm transition-all text-sm h-full">
                                    <Upload size={18}/> Carregar Planilha
                                </div>
                                <input type="file" onChange={handleFileUpload} className="hidden" />
                            </label>
                            <Button onClick={handleClearData} variant="danger" icon={Trash2} />
                            <Button onClick={() => processCsv()} className="flex-1" icon={Send}>Verificar</Button>
                        </div>
                    </div>
                </Card>
                <Card title="2. Envios Pendentes">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 border-b border-slate-50">
                        <Filter size={14} className="text-slate-400 mt-1.5 ml-2"/> 
                        {professionalsList.map(prof => (
                            <button key={prof} onClick={()=>setFilterProf(prof)} className={`text-xs px-3 py-1.5 rounded-full transition-all ${filterProf===prof ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {prof}
                            </button>
                        ))}
                    </div>

                    {filteredAppointments.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                            <div className="bg-slate-50 p-4 rounded-full mb-3"><FileSpreadsheet size={32}/></div>
                            <p className="text-sm">Nenhum dado importado.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                            {filteredAppointments.map(app => (
                                <div key={app.id} className={`p-4 border rounded-xl flex justify-between items-center transition-all hover:shadow-sm ${app.reminderType ? 'bg-violet-50 border-violet-100' : 'bg-white border-slate-100 opacity-70'}`}>
                                    <div>
                                        <span className="font-bold text-slate-700 block text-sm mb-0.5">{app.nome}</span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1"><CalendarCheck size={10}/> {app.data} - {app.hora}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <Badge status={app.isSubscribed ? 'match' : 'missing'} text={app.isSubscribed ? 'App' : 'Sem App'} /> 
                                        {app.reminderType && <span className="text-xs text-violet-600 font-bold flex gap-1 bg-white px-2 py-0.5 rounded-full border border-violet-100 shadow-sm"><Mail size={10} className="mt-0.5"/> {app.reminderType}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-slate-50">
                        {filteredAppointments.filter(a => a.isSubscribed && a.reminderType).length > 0 ? (
                            <Button onClick={handleSendReminders} variant="success" disabled={isSending} className="w-full" icon={isSending ? Loader2 : Bell}>
                                {isSending ? "Enviando..." : "Disparar Lembretes"}
                            </Button>
                        ) : (
                             <p className="text-center text-xs text-slate-400">Nenhum disparo disponível para a seleção.</p>
                        )}
                    </div>
                </Card>
            </div>
        )}

        {/* 3. USUÁRIOS */}
        {adminTab === 'users' && (
            <Card title="Base de Pacientes Cadastrados" className="h-[650px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col h-full">
                    <div className="flex gap-3 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Pesquisar por nome ou telefone..." 
                                className="w-full pl-10 p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all text-slate-700" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleExportCSV} variant="secondary" icon={Download}>CSV</Button>
                    </div>
                    <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 border-b border-slate-100">Paciente</th>
                                    <th className="px-4 py-3 border-b border-slate-100">Telefone</th>
                                    <th className="px-4 py-3 border-b border-slate-100">Contrato</th>
                                    <th className="px-4 py-3 border-b border-slate-100">Último Acesso</th>
                                    <th className="px-4 py-3 border-b border-slate-100 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {subscribers.filter(u => (u.phone || '').includes(searchTerm) || (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                                    <tr key={user.id} className="hover:bg-violet-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-800">{user.name || <span className="text-slate-400 italic">Sem nome</span>}</td>
                                        <td className="px-4 py-3 font-mono text-slate-500">{user.phone}</td>
                                        <td className="px-4 py-3">
                                            {Number(user.acceptedTermsVersion) === Number(localConfig.contractVersion) 
                                                ? <Badge status="confirmed" text={`v${user.acceptedTermsVersion}`} />
                                                : <Badge status="unsigned" text="Pendente" />
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{user.lastSeen?.seconds ? new Date(user.lastSeen.seconds * 1000).toLocaleDateString() : '-'}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => handleResetPin(user.id)} className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-colors" title="Resetar PIN"><RotateCcw size={16}/></button>
                                            <button onClick={() => handleDeleteUser(user.id, user.phone)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Remover"><UserMinus size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        )}

        {/* 4. HISTÓRICO */}
        {adminTab === 'history' && (
            <Card title="Histórico de Envios" className="h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex-1 overflow-y-auto pr-2">
                    {historyLogs.length === 0 ? <div className="text-center py-20 text-slate-300">Nenhum envio registado ainda.</div> : (
                        <div className="space-y-4">
                            {historyLogs.map(log => (
                                <div key={log.id} className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div>
                                        <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <CalendarCheck size={16} className="text-violet-400"/>
                                            {log.sentAt?.seconds ? new Date(log.sentAt.seconds * 1000).toLocaleString() : '-'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 ml-6">{log.summary}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        {log.types?.map(t => (
                                            <span key={t} className="bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 rounded-full text-xs font-semibold">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        )}

        {/* 5. CONFIGURAÇÃO */}
        {adminTab === 'config' && (
             <Card title="Configurações do Sistema" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="space-y-8 max-w-2xl mx-auto py-4 overflow-y-auto h-full pr-4">
                     
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Smartphone size={16}/> WhatsApp da Clínica</label>
                        <input value={localConfig.whatsapp} onChange={e => setLocalConfig({...localConfig, whatsapp: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-200 transition-all" placeholder="5511..." />
                        <p className="text-xs text-slate-400 mt-2">Usado para o botão de contacto no painel do paciente.</p>
                     </div>
                     
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex justify-between mb-3 items-center">
                             <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><FileText size={16}/> Contrato Terapêutico</label>
                             <span className="text-xs bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500 font-mono">v{localConfig.contractVersion}</span>
                        </div>
                        <textarea value={localConfig.contractText} onChange={e => setLocalConfig({...localConfig, contractText: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl h-40 text-slate-700 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Escreva os termos aqui..." />
                        <div className="flex gap-3 mt-4">
                             <Button onClick={() => saveConfig(false)} variant="secondary" className="flex-1 text-xs">Salvar Rascunho</Button>
                             <Button onClick={() => saveConfig(true)} className="flex-1 text-xs shadow-none" icon={CloudUpload}>Publicar Nova Versão</Button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 text-center">* Publicar uma nova versão exigirá novo aceite de todos os pacientes.</p>
                     </div>

                     <div className="space-y-6 pt-4 border-t border-slate-100">
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-center">Modelos de Mensagem</h4>
                        
                        {['msg48h', 'msg24h', 'msg12h'].map((key) => (
                            <div key={key}>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{key.replace('msg', '')} Antes</label>
                                <textarea 
                                    value={localConfig[key]} 
                                    onChange={e => setLocalConfig({...localConfig, [key]: e.target.value})} 
                                    className="w-full p-3 border border-slate-200 rounded-xl h-24 text-slate-700 text-sm resize-none focus:ring-2 focus:ring-violet-200 outline-none" 
                                />
                            </div>
                        ))}
                     </div>
                     <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100">
                        <Button onClick={() => saveConfig(false)} icon={Save} className="w-full py-4 text-lg shadow-xl">Salvar Todas as Configurações</Button>
                     </div>
                 </div>
             </Card>
        )}
    </div>
  );
}