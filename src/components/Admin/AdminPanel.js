import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../app/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Send,
  Users,
  Upload,
  FileSpreadsheet,
  Mail,
  Trash2,
  Search,
  UserMinus,
  Eye,
  Settings,
  History,
  Save,
  LayoutDashboard,
  Download,
  Activity,
  PlusCircle,
  Filter,
  CalendarCheck,
  LogOut,
  RotateCcw,
  FileText,
  Bell,
  Loader2,
  CloudUpload,
  Smartphone,
  User,
  UserPlus,
  Info,
  X,
  CheckCircle,
} from 'lucide-react';
import { Button, Card, Badge, StatCard } from '../DesignSystem';
import { parseCSV } from '../../services/dataService';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

// aceita: "2026-02-07" | "07/02/2026" | "07-02-2026"
function normalizeToISODate(dateStr) {
  const s = String(dateStr || '').trim();
  if (!s) return '';

  // YYYY-MM-DD (ou YYYY/MM/DD)
  const isoLike = s.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  if (isoLike) return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`;

  // DD/MM/YYYY (ou DD-MM-YYYY)
  const brLike = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (brLike) return `${brLike[3]}-${brLike[2]}-${brLike[1]}`;

  return '';
}

function safeSlug(str, max = 18) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, max);
}

// ID determinístico para não duplicar agenda a cada sync
function makeAppointmentId({ phone, isoDate, time, profissional }) {
  const p = onlyDigits(phone);
  const d = String(isoDate || '').replace(/[^0-9-]/g, '');
  const t = String(time || '').replace(':', '');
  const prof = safeSlug(profissional, 12);
  return `${p}_${d}_${t}_${prof || 'prof'}`.slice(0, 140);
}

export default function AdminPanel({
  onLogout,
  subscribers,
  historyLogs,
  dbAppointments,
  showToast,
  globalConfig,
}) {
  const [adminTab, setAdminTab] = useState('dashboard');
  const [csvInput, setCsvInput] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para cadastro manual na agenda
  const [manualEntry, setManualEntry] = useState({
    nome: '',
    telefone: '',
    data: '',
    hora: '',
    profissional: '',
  });
  const [showManualForm, setShowManualForm] = useState(false);

  // Estado para cadastro de Novo Paciente (Whitelist)
  const [newPatient, setNewPatient] = useState({ name: '', email: '', phone: '' });
  const [showUserModal, setShowUserModal] = useState(false);

  const [filterProf, setFilterProf] = useState('Todos');

  // Configuração Local
  const [localConfig, setLocalConfig] = useState({
    msg48h: '',
    msg24h: '',
    msg12h: '',
    whatsapp: '',
    contractText: '',
    contractVersion: 1,
  });

  // Mapa rápido de subscribers por telefone
  const subscribersByPhone = useMemo(() => {
    const m = new Map();
    (subscribers || []).forEach((s) => {
      const p = onlyDigits(s?.phone);
      if (p) m.set(p, s);
    });
    return m;
  }, [subscribers]);

  // Carrega configuração global
  useEffect(() => {
    if (globalConfig) setLocalConfig((prev) => ({ ...prev, ...globalConfig }));
  }, [globalConfig]);

  // Carrega agenda do Firestore (cache do app)
  useEffect(() => {
    if (Array.isArray(dbAppointments) && dbAppointments.length > 0) {
      setAppointments(dbAppointments);
    }
  }, [dbAppointments]);

  // --- CÁLCULOS ---
  const activeUsersCount = subscribers.filter((u) => {
    if (!u.lastSeen?.seconds) return false;
    const diffDays =
      (new Date() - new Date(u.lastSeen.seconds * 1000)) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).length;

  const totalMessagesSent = historyLogs.reduce((acc, curr) => acc + (curr.count || 0), 0);

  // Lista de profissionais (para filtro)
  const professionalsList = useMemo(() => {
    const set = new Set(['Todos']);
    appointments.forEach((a) => {
      if (a.profissional) set.add(a.profissional);
    });
    return Array.from(set);
  }, [appointments]);

  // CSV parseado e enriquecido
  const processedAppointments = useMemo(() => {
    const msgConfig = {
      msg48h: localConfig.msg48h || '',
      msg24h: localConfig.msg24h || '',
      msg12h: localConfig.msg12h || '',
    };
    return parseCSV(csvInput, subscribers, msgConfig);
  }, [csvInput, subscribers, localConfig.msg48h, localConfig.msg24h, localConfig.msg12h]);

  // Filtragem por profissional + busca
  const filteredAppointments = useMemo(() => {
    let arr = processedAppointments;

    if (filterProf !== 'Todos') {
      arr = arr.filter((a) => (a.profissional || '').toLowerCase() === filterProf.toLowerCase());
    }

    if (searchTerm?.trim()) {
      const q = searchTerm.trim().toLowerCase();
      arr = arr.filter((a) => {
        const nome = (a.nome || '').toLowerCase();
        const tel = (a.cleanPhone || a.phone || '').toLowerCase();
        return nome.includes(q) || tel.includes(q);
      });
    }

    return arr;
  }, [processedAppointments, filterProf, searchTerm]);

  // --- FUNÇÕES DE AÇÃO ---

  // 1. Cadastrar Paciente
  const handleRegisterPatient = async () => {
    if (!newPatient.email || !newPatient.name || !newPatient.phone) {
      return showToast('Preencha todos os campos.', 'error');
    }

    try {
      const cleanPhone = onlyDigits(newPatient.phone);
      const userRef = doc(db, 'subscribers', cleanPhone);

      await setDoc(
        userRef,
        {
          name: newPatient.name.trim(),
          email: newPatient.email.trim().toLowerCase(),
          phone: cleanPhone,
          role: 'patient',
          createdAt: new Date(),
          lastSeen: null,
          pushToken: null,
        },
        { merge: true }
      );

      showToast('Paciente cadastrado e autorizado com sucesso!');
      setNewPatient({ name: '', email: '', phone: '' });
      setShowUserModal(false);
    } catch (e) {
      console.error(e);
      showToast('Erro ao cadastrar paciente.', 'error');
    }
  };

  // 2. Remover Paciente
  const handleRemovePatient = async (phone) => {
    try {
      await deleteDoc(doc(db, 'subscribers', phone));
      showToast('Paciente removido.');
    } catch (e) {
      console.error(e);
      showToast('Erro ao remover paciente.', 'error');
    }
  };

  // 3. Export CSV da base
  const handleExportCSV = () => {
    try {
      const header = 'Nome,Email,Telefone,Último Acesso\n';
      const rows = subscribers
        .map((u) => {
          const last = u.lastSeen?.seconds ? new Date(u.lastSeen.seconds * 1000).toLocaleString() : '';
          return `"${u.name || ''}","${u.email || ''}","${u.phone || ''}","${last}"`;
        })
        .join('\n');

      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pacientes_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar CSV.', 'error');
    }
  };

  // 4. Carregar arquivo CSV
  const handleFileUpload = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      setCsvInput(text);
      showToast('Planilha carregada.');
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar planilha.', 'error');
    }
  };

  // 5. Limpar dados
  const handleClearData = () => {
    setCsvInput('');
    setAppointments([]);
    showToast('Dados limpos.');
  };

  // 6. Processar CSV
  const processCsv = () => {
    const parsed = parseCSV(csvInput, subscribers, {
      msg48h: localConfig.msg48h || '',
      msg24h: localConfig.msg24h || '',
      msg12h: localConfig.msg12h || '',
    });

    setAppointments(parsed);
    showToast(`Planilha verificada: ${parsed.length} registros.`);
  };

  // 7. Sincronizar agenda no Firestore (✅ upsert + reconciliação: cancela futuros que sumirem do upload)
  const handleSyncSchedule = async () => {
    if (!appointments.length) return showToast('Nenhuma agenda para sincronizar.', 'error');

    setIsSaving(true);

    // uploadId ajuda auditoria e reconciliação (snapshot do estado atual)
    const uploadId = `upload_${new Date().toISOString().replace(/[:.]/g, '-')}`;

    try {
      const todayIso = new Date().toISOString().slice(0, 10);

      // 1) UPSERT do estado atual (tudo que veio no upload)
      const syncedIds = [];
      const phonesInUpload = new Set();

      const BATCH_LIMIT = 450;
      let batch = writeBatch(db);
      let batchCount = 0;

      const flush = async () => {
        if (batchCount === 0) return;
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      };

      for (const a of appointments) {
        const phone = onlyDigits(a.cleanPhone || a.phone || '');
        const date = a.data || a.date || '';
        const time = a.hora || a.time || '';
        const profissional = a.profissional || '';
        const isoDate = a.isoDate || normalizeToISODate(date);

        // novos campos (CSV novo; no antigo podem vir vazios)
        const externalId = (a.externalId || '').trim();
        const serviceType = (a.serviceType || '').trim(); // psicologia | fonoaudiologia | ...
        const location = (a.location || '').trim();

        // tenta anexar email (quando existir no subscriber)
        const sub = subscribersByPhone.get(phone);
        const email = (a.email || sub?.email || '').toLowerCase();

        if (!phone || !isoDate) continue;

        phonesInUpload.add(phone);

        const id = makeAppointmentId({ phone, isoDate, time, profissional });
        syncedIds.push(id);

        const ref = doc(db, 'appointments', id);

        const payload = {
          nome: a.nome || '',
          email: email || '',
          phone,
          date: date || '',
          isoDate,
          time: time || '',
          profissional: profissional || '',
          externalId: externalId || '',
          serviceType: serviceType || '',
          location: location || '',
          status: 'scheduled',
          source: 'admin_sync',
          sourceUploadId: uploadId,
          updatedAt: new Date(),
        };

        // set + merge evita duplicar e mantém campos antigos que não enviamos
        batch.set(ref, payload, { merge: true });

        batchCount += 1;
        if (batchCount >= BATCH_LIMIT) await flush();
      }

      await flush();

      // 2) RECONCILIAÇÃO: cancela futuros que NÃO vieram no upload
      const syncedIdSet = new Set(syncedIds);

      const phoneList = Array.from(phonesInUpload);
      const chunkSize = 30; // limite do Firestore para "in"
      const CANCEL_BATCH_LIMIT = 450;

      let cancelBatch = writeBatch(db);
      let cancelCount = 0;

      const flushCancel = async () => {
        if (cancelCount === 0) return;
        await cancelBatch.commit();
        cancelBatch = writeBatch(db);
        cancelCount = 0;
      };

      for (let i = 0; i < phoneList.length; i += chunkSize) {
        const chunk = phoneList.slice(i, i + chunkSize);

        // ⚠️ Pode pedir índice composto (phone IN + isoDate >=). Se pedir, crie pelo link do Firebase.
        const q = query(
          collection(db, 'appointments'),
          where('phone', 'in', chunk),
          where('isoDate', '>=', todayIso)
        );

        const snap = await getDocs(q);

        for (const d of snap.docs) {
          const data = d.data() || {};
          const id = d.id;

          // Se NÃO veio no upload atual -> cancelar (somente se ainda estiver scheduled)
          if (!syncedIdSet.has(id) && data.status !== 'cancelled') {
            cancelBatch.set(
              doc(db, 'appointments', id),
              {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: 'removed_from_upload',
                cancelledBy: 'admin_sync',
                updatedAt: new Date(),
              },
              { merge: true }
            );
            cancelCount += 1;

            if (cancelCount >= CANCEL_BATCH_LIMIT) {
              await flushCancel();
            }
          }
        }
      }

      await flushCancel();

      showToast(
        `Agenda sincronizada! (${syncedIds.length} registros) • Reconciliação aplicada (futuros removidos foram cancelados).`
      );
    } catch (e) {
      console.error(e);
      showToast('Erro ao sincronizar agenda.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 8. Adicionar manual (apenas no estado local)
  const handleAddManual = () => {
    if (!manualEntry.nome || !manualEntry.telefone || !manualEntry.data || !manualEntry.hora) {
      return showToast('Preencha Nome, Telefone, Data e Hora.', 'error');
    }

    const cleanPhone = onlyDigits(manualEntry.telefone);
    const nomeProfissional = manualEntry.profissional?.trim() || 'Psicólogo(a)';

    // Novo formato (com campos vazios de ID/serviço/local), mas continua compatível com o parser antigo
    const newLine = `,${manualEntry.nome},${cleanPhone},${manualEntry.data},${manualEntry.hora},${nomeProfissional},,`;

    setCsvInput((prev) => (prev ? `${prev}\n${newLine}` : newLine));
    setManualEntry({ nome: '', telefone: '', data: '', hora: '', profissional: '' });
    setShowManualForm(false);
    showToast('Registro manual adicionado. Clique em Verificar.');
  };

  // 9. Enviar lembretes (push)
  const handleSendReminders = async () => {
    const toSend = filteredAppointments.filter((a) => a.isSubscribed && a.reminderType);
    if (!toSend.length) return showToast('Nenhum disparo disponível para a seleção.', 'info');

    setIsSending(true);
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: toSend }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Falha no disparo.');
      }

      showToast(`Lembretes enviados: ${data?.sent || toSend.length}`);
    } catch (e) {
      console.error(e);
      showToast('Erro ao enviar lembretes.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // 10. Salvar configurações globais
  const saveConfig = async (publishNewVersion = false) => {
    setIsSaving(true);
    try {
      const ref = doc(db, 'config', 'global');
      const payload = {
        msg48h: localConfig.msg48h || '',
        msg24h: localConfig.msg24h || '',
        msg12h: localConfig.msg12h || '',
        whatsapp: localConfig.whatsapp || '',
        contractText: localConfig.contractText || '',
        contractVersion: publishNewVersion
          ? Number(localConfig.contractVersion || 1) + 1
          : Number(localConfig.contractVersion || 1),
        updatedAt: new Date(),
      };

      await setDoc(ref, payload, { merge: true });

      setLocalConfig((prev) => ({
        ...prev,
        contractVersion: payload.contractVersion,
      }));

      showToast(publishNewVersion ? 'Nova versão publicada!' : 'Configurações salvas!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar configurações.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-3">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 sticky top-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Painel</div>
              <div className="text-lg font-black text-slate-900">Admin</div>
            </div>
            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setAdminTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'dashboard'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>

            <button
              onClick={() => setAdminTab('schedule')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'schedule'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck size={18} /> Agenda
            </button>

            <button
              onClick={() => setAdminTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'users'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users size={18} /> Pacientes
            </button>

            <button
              onClick={() => setAdminTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'history'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History size={18} /> Histórico
            </button>

            <button
              onClick={() => setAdminTab('config')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                adminTab === 'config'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings size={18} /> Configurações
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="lg:col-span-9 space-y-6">
        {/* DASHBOARD */}
        {adminTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Pacientes Ativos (30 dias)" value={activeUsersCount} icon={Activity} />
              <StatCard title="Pacientes Cadastrados" value={subscribers.length} icon={Users} />
              <StatCard title="Mensagens Enviadas" value={totalMessagesSent} icon={Mail} />
            </div>

            <Card title="Resumo" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-sm text-slate-600 space-y-2">
                <p className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-violet-500" />
                  Carregue a planilha, clique em <b>Verificar</b> e dispare os lembretes.
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-violet-500" />
                  Cadastre pacientes na aba <b>Pacientes</b> para autorizá-los no app.
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-violet-500" />
                  Ajuste modelos de mensagem e contrato em <b>Configurações</b>.
                </p>
              </div>
            </Card>
          </>
        )}

        {/* AGENDA */}
        {adminTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="1. Importar Agenda" className="h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col h-full gap-4">
                {showManualForm ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <PlusCircle size={16} className="text-violet-500" />
                        Adicionar manual
                      </div>
                      <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-700">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      <input
                        placeholder="Nome"
                        className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200"
                        value={manualEntry.nome}
                        onChange={(e) => setManualEntry({ ...manualEntry, nome: e.target.value })}
                      />
                      <input
                        placeholder="Telefone (DDD + Número)"
                        className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200"
                        value={manualEntry.telefone}
                        onChange={(e) => setManualEntry({ ...manualEntry, telefone: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="w-1/2 p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200"
                          value={manualEntry.data}
                          onChange={(e) => setManualEntry({ ...manualEntry, data: e.target.value })}
                        />
                        <input
                          type="time"
                          className="w-1/2 p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200"
                          value={manualEntry.hora}
                          onChange={(e) => setManualEntry({ ...manualEntry, hora: e.target.value })}
                        />
                      </div>
                      <input
                        placeholder="Profissional (opcional)"
                        className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200"
                        value={manualEntry.profissional}
                        onChange={(e) => setManualEntry({ ...manualEntry, profissional: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleAddManual} variant="success" className="flex-1 text-xs">
                        Adicionar
                      </Button>
                      <Button onClick={() => setShowManualForm(false)} variant="secondary" className="flex-1 text-xs">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowManualForm(true)}
                      variant="secondary"
                      icon={PlusCircle}
                      className="flex-1"
                    >
                      Manual
                    </Button>
                    <Button
                      onClick={handleSyncSchedule}
                      variant="primary"
                      icon={CloudUpload}
                      className="flex-1"
                      disabled={isSaving || appointments.length === 0}
                    >
                      {isSaving ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                  </div>
                )}

                <textarea
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder={'Cole aqui a planilha CSV:\nID, Nome, Telefone, Data, Hora, Profissional, Serviço, Local\n(ou no formato antigo: Nome, Telefone, Data, Hora, Profissional)'}
                  className="w-full h-full p-4 border border-slate-100 bg-slate-50 rounded-xl text-slate-800 resize-none text-xs font-mono focus:bg-white focus:border-violet-200 focus:ring-2 focus:ring-violet-100 outline-none transition-all"
                />

                <div className="flex gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 shadow-sm transition-all text-sm h-full">
                      <Upload size={18} /> Carregar Planilha
                    </div>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <Button onClick={handleClearData} variant="danger" icon={Trash2} />
                  <Button onClick={() => processCsv()} className="flex-1" icon={Send}>
                    Verificar
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="2. Envios Pendentes" className="h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-4">
                {filteredAppointments.filter((a) => a.isSubscribed && a.reminderType).length > 0 ? (
                  <Button
                    onClick={handleSendReminders}
                    variant="success"
                    disabled={isSending}
                    className="w-full shadow-none ring-0 focus:ring-0 focus:ring-offset-0"
                    icon={isSending ? Loader2 : Bell}
                  >
                    {isSending ? 'Enviando...' : 'Disparar Lembretes'}
                  </Button>
                ) : (
                  <p className="text-center text-xs text-slate-400">
                    Nenhum disparo disponível para a seleção.
                  </p>
                )}
              </div>

              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 border-b border-slate-50">
                <Filter size={14} className="text-slate-400 mt-1.5 ml-2" />
                {professionalsList.map((prof) => (
                  <button
                    key={prof}
                    onClick={() => setFilterProf(prof)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      filterProf === prof
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {prof}
                  </button>
                ))}
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                  <div className="bg-slate-50 p-4 rounded-full mb-3">
                    <FileSpreadsheet size={32} />
                  </div>
                  <p className="text-sm">Nenhum dado importado.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {filteredAppointments.map((app) => (
                    <div
                      key={app.id}
                      className={`p-4 border rounded-xl flex justify-between items-center transition-all hover:shadow-sm ${
                        app.reminderType ? 'bg-violet-50 border-violet-100' : 'bg-white border-slate-100 opacity-70'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-slate-700 block text-sm mb-0.5">{app.nome}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <User size={12} /> {app.cleanPhone}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <CalendarCheck size={12} /> {app.data} • {app.hora}
                        </span>
                        {app.profissional ? (
                          <span className="text-[11px] text-slate-400 mt-1 block">Prof.: {app.profissional}</span>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-600">{app.timeLabel}</div>
                        <Badge
                          status={app.isSubscribed ? 'confirmed' : 'missing'}
                          text={app.isSubscribed ? 'Autorizado' : 'Sem cadastro'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* PACIENTES */}
        {adminTab === 'users' && (
          <Card title="Pacientes" className="h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col h-full gap-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                    className="w-full pl-10 p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200 text-slate-700"
                  />
                </div>

                <Button onClick={handleExportCSV} variant="secondary" icon={Download}>
                  Exportar
                </Button>

                <Button onClick={() => setShowUserModal(true)} icon={UserPlus}>
                  Novo paciente
                </Button>
              </div>

              {/* Modal novo paciente */}
              {showUserModal && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="font-black text-slate-800 flex items-center gap-2">
                        <UserPlus size={18} className="text-violet-600" /> Cadastrar paciente
                      </div>
                      <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-700">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nome</label>
                        <input
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700"
                          value={newPatient.name}
                          onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                          placeholder="Nome do paciente"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">E-mail</label>
                        <input
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700"
                          value={newPatient.email}
                          onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                          placeholder="paciente@email.com"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Celular (WhatsApp)</label>
                        <input
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700"
                          value={newPatient.phone}
                          onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                          placeholder="11999998888"
                        />
                      </div>

                      <Button onClick={handleRegisterPatient} icon={UserPlus} className="w-full mt-4 py-3 shadow-lg">
                        Cadastrar e Autorizar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Nome</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Email</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Telefone</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {subscribers
                      .filter((u) => {
                        if (!searchTerm?.trim()) return true;
                        const q = searchTerm.trim().toLowerCase();
                        const n = (u.name || '').toLowerCase();
                        const p = (u.phone || '').toLowerCase();
                        return n.includes(q) || p.includes(q);
                      })
                      .map((u) => (
                        <tr key={u.phone} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold text-slate-800">{u.name || '-'}</td>
                          <td className="p-3 text-slate-500">{u.email || '-'}</td>
                          <td className="p-3 text-slate-500">{u.phone || '-'}</td>
                          <td className="p-3">
                            <Badge status={u.pushToken ? 'confirmed' : 'missing'} text={u.pushToken ? 'Ativo' : 'Sem Push'} />
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleRemovePatient(u.phone)}
                              className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 text-xs font-semibold"
                              title="Remover"
                            >
                              <UserMinus size={14} /> Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {subscribers.length === 0 && (
                  <div className="text-center py-20 text-slate-300">Nenhum paciente cadastrado.</div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* HISTÓRICO */}
        {adminTab === 'history' && (
          <Card title="Histórico de Envios" className="h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-1 overflow-y-auto pr-2">
              {historyLogs.length === 0 ? (
                <div className="text-center py-20 text-slate-300">Nenhum envio registado ainda.</div>
              ) : (
                <div className="space-y-4">
                  {historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <CalendarCheck size={16} className="text-violet-400" />
                          {log.sentAt?.seconds ? new Date(log.sentAt.seconds * 1000).toLocaleString() : '-'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 ml-6">{log.summary}</div>
                      </div>
                      <div className="flex gap-2">
                        {log.types?.map((t) => (
                          <span
                            key={t}
                            className="bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 rounded-full text-xs font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* CONFIGURAÇÃO */}
        {adminTab === 'config' && (
          <Card title="Configurações do Sistema" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8 max-w-2xl mx-auto py-4 overflow-y-auto h-full pr-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Smartphone size={16} /> WhatsApp da Clínica
                </label>
                <input
                  value={localConfig.whatsapp}
                  onChange={(e) => setLocalConfig({ ...localConfig, whatsapp: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-200 transition-all"
                  placeholder="5511..."
                />
                <p className="text-xs text-slate-400 mt-2">Usado para o botão de contato no painel do paciente.</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between mb-3 items-center">
                  <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FileText size={16} /> Contrato Terapêutico
                  </label>
                  <span className="text-xs bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500 font-mono">
                    v{localConfig.contractVersion}
                  </span>
                </div>
                <textarea
                  value={localConfig.contractText}
                  onChange={(e) => setLocalConfig({ ...localConfig, contractText: e.target.value })}
                  className="w-full p-4 border border-slate-200 rounded-xl h-40 text-slate-700 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-violet-200 outline-none"
                  placeholder="Escreva os termos aqui."
                />
                <div className="flex gap-3 mt-4">
                  <Button onClick={() => saveConfig(false)} variant="secondary" className="flex-1 text-xs">
                    Salvar Rascunho
                  </Button>
                  <Button onClick={() => saveConfig(true)} className="flex-1 text-xs shadow-none" icon={CloudUpload}>
                    Publicar Nova Versão
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  * Publicar uma nova versão exigirá novo aceite de todos os pacientes.
                </p>
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-center">
                  Modelos de Mensagem
                </h4>

                {['msg48h', 'msg24h', 'msg12h'].map((key) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                      {key.replace('msg', '')} Antes
                    </label>
                    <textarea
                      value={localConfig[key]}
                      onChange={(e) => setLocalConfig({ ...localConfig, [key]: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl h-24 text-slate-700 text-sm resize-none focus:ring-2 focus:ring-violet-200 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100">
                <Button onClick={() => saveConfig(false)} icon={Save} className="w-full py-4 text-lg shadow-xl">
                  Salvar Todas as Configurações
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
