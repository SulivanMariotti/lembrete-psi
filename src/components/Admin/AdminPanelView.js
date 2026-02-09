import React, { useState, useMemo, useEffect , useRef} from 'react';
import { db } from '../../app/firebase';
import {collection,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch, orderBy} from 'firebase/firestore';
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

// phoneCanonical: DDD + número (10/11), SEM 55
function normalizePhoneCanonical(input) {
  let d = onlyDigits(input).replace(/^0+/, '');
  if (!d) return '';
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
}

// phoneE164: 55 + canônico
function phoneToE164(phoneCanonical) {
  const c = normalizePhoneCanonical(phoneCanonical);
  if (!c) return '';
  if (c.length === 10 || c.length === 11) return `55${c}`;
  return c;
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

function formatISOToBR(iso) {
  const s = String(iso || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
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
  
  // STEP43: Painel de Constância (attendance_logs)
  const [attendancePeriodDays, setAttendancePeriodDays] = useState(30);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    total: 0,
    rate: 0,
    topAbsent: []
  });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);

  // STEP44: Importar Presença/Faltas (CSV) para attendance_logs via API server-side
  const [attendanceImportText, setAttendanceImportText] = useState('');
  const [attendanceImportSource, setAttendanceImportSource] = useState('planilha');
  const [attendanceImportDefaultStatus, setAttendanceImportDefaultStatus] = useState('absent'); // absent|present
  const [attendanceImportResult, setAttendanceImportResult] = useState(null);
  const [attendanceImportLoading, setAttendanceImportLoading] = useState(false);

  

  // STEP43-FIX: carregar estatísticas de constância via API (Admin SDK), evitando rules no client
const [adminTab, setAdminTab] = useState('dashboard');
    
  useEffect(() => {
    const run = async () => {
      if (adminTab !== 'dashboard') return;
      try {
        setAttendanceLoading(true);
        setAttendanceError(null);
        const res = await fetch(`/api/admin/attendance/summary?days=${attendancePeriodDays}`, { method: 'GET' });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || 'Falha ao carregar constância');
        setAttendanceStats({
          present: Number(data.present || 0),
          absent: Number(data.absent || 0),
          total: Number(data.total || 0),
          rate: Number(data.attendanceRate || 0),
          topAbsent: Array.isArray(data.topMisses)
            ? data.topMisses.map((x) => ({ phoneCanonical: x.phoneCanonical, count: x.misses }))
            : [],
        });
      } catch (e) {
        setAttendanceStats({ present: 0, absent: 0, total: 0, rate: 0, topAbsent: [] });
        setAttendanceError(e?.message || 'Erro ao carregar constância');
      } finally {
        setAttendanceLoading(false);
      }
    };
    run();
  }, [adminTab, attendancePeriodDays]);
const fileInputRef = useRef(null);
const [csvInput, setCsvInput] = useState('');
  
  const [hasVerified, setHasVerified] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [lastUploadId, setLastUploadId] = useState(null);
const [appointments, setAppointments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sendPreview, setSendPreview] = useState(null);
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
  const [newPatient, setNewPatient] = useState({ name: '', email: '', phone: '', patientExternalId: '' });
  const [showUserModal, setShowUserModal] = useState(false);
  // Edição (sem mudar layout): ao clicar na linha do paciente abre o mesmo modal com dados preenchidos
  const [editingPatient, setEditingPatient] = useState(null);

  const [filterProf, setFilterProf] = useState('Todos');

  // Configuração Local
  const [localConfig, setLocalConfig] = useState({
    reminderOffsetsHours: [48, 24, 12],
    msg1: '',
    msg2: '',
    msg3: '',
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
      const p = normalizePhoneCanonical(s?.phoneCanonical || s?.phone);
      if (p) m.set(p, s);
    });
    return m;
  }, [subscribers]);

  // Carrega configuração global
  useEffect(() => {
    if (!globalConfig) return;
    setLocalConfig((prev) => ({
      ...prev,
      ...globalConfig,
      // Compatibilidade: se ainda estiver salvo como msg48h/msg24h/msg12h, preenche msg1/msg2/msg3
      msg1: globalConfig?.msg1 ?? globalConfig?.msg48h ?? prev.msg1 ?? '',
      msg2: globalConfig?.msg2 ?? globalConfig?.msg24h ?? prev.msg2 ?? '',
      msg3: globalConfig?.msg3 ?? globalConfig?.msg12h ?? prev.msg3 ?? '',
    }));
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
      msg1: localConfig.msg1 || localConfig.msg48h || '',
        msg2: localConfig.msg2 || localConfig.msg24h || '',
        msg3: localConfig.msg3 || localConfig.msg12h || '',
        // Mantém compatibilidade com versões antigas do disparo
        msg48h: localConfig.msg1 || localConfig.msg48h || '',
        msg24h: localConfig.msg2 || localConfig.msg24h || '',
        msg12h: localConfig.msg3 || localConfig.msg12h || '',
    };
    return parseCSV(csvInput, subscribers, msgConfig);
  }, [csvInput, subscribers, localConfig.msg48h, localConfig.msg24h, localConfig.msg12h]);

  
  // PASSO 27/45 — Resumo da Verificação (sem mudar layout: apenas texto/contadores)
  const verificationSummary = useMemo(() => {
    if (!hasVerified) return null;

    const total = processedAppointments.length;

    const phones = new Set();
    let firstISO = null;
    let lastISO = null;

    let fallbackServiceCount = 0;

    processedAppointments.forEach((a) => {
      const p = normalizePhoneCanonical(a?.cleanPhone || a?.phoneCanonical || a?.phone || '');
      if (p) phones.add(p);

      const iso = String(a?.isoDate || '').trim();
      if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        if (!firstISO || iso < firstISO) firstISO = iso;
        if (!lastISO || iso > lastISO) lastISO = iso;
      }

      if (String(a?.serviceType || '').trim() === 'Sessão') fallbackServiceCount += 1;
    });

    return {
      total,
      uniquePatients: phones.size,
      firstISO,
      lastISO,
      dateFrom: firstISO ? formatISOToBR(firstISO) : '—',
      dateTo: lastISO ? formatISOToBR(lastISO) : '—',
      fallbackServiceCount,
    };
  }, [hasVerified, processedAppointments]);

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

// PASSO 23/45: Stepper lógico (Importar→Verificar→Sincronizar→Disparar) — sem mudar layout
useEffect(() => {
  setHasVerified(false);
  setHasSynced(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [csvInput]);

    const closePatientModal = () => {
    setShowUserModal(false);
    setEditingPatient(null);
    setNewPatient({ name: '', email: '', phone: '', patientExternalId: '' });
  };

  const openEditPatientModal = async (u) => {
    setEditingPatient(u);

    // Prefill básico (o que já aparece na tabela)
    const prevEmail = String(u?.email || '').trim();
    const prevPhone = String(u?.phoneCanonical || u?.phone || u?.id || '').trim();

    let patientExternalId = String(u?.patientExternalId || '').trim();

    // Busca o ID externo diretamente em users/{uid} (admin) via email
    try {
      if (!patientExternalId && prevEmail) {
        const q = query(collection(db, 'users'), where('email', '==', prevEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() || {};
          patientExternalId = String(data.patientExternalId || data.patientExternalId || data.patientId || '').trim();
        }
      }
    } catch (e) {
      // silencioso: se rules bloquear, continua vazio e o admin pode preencher manualmente
      console.warn('openEditPatientModal: failed to fetch users patientExternalId', e);
    }

    setNewPatient({
      name: String(u?.name || u?.nome || '').trim(),
      email: prevEmail,
      phone: prevPhone,
      patientExternalId,
    });

    setShowUserModal(true);
  };

  const handleRegisterPatient = async () => {
    if (!newPatient.email || !newPatient.name || !newPatient.phone) {
      return showToast('Preencha todos os campos.', 'error');
    }

    try {
      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || '';
      if (!adminSecret) {
        return showToast('Falta configurar NEXT_PUBLIC_ADMIN_PANEL_SECRET (admin).', 'error');
      }

      const payload = {
        name: newPatient.name.trim(),
        email: newPatient.email.trim().toLowerCase(),
        phone: newPatient.phone,
          patientExternalId: String(newPatient.patientExternalId || '').trim(),
        ...(editingPatient?.previousPhoneCanonical
          ? { previousPhoneCanonical: editingPatient.previousPhoneCanonical }
          : {}),
        ...(editingPatient?.previousEmail ? { previousEmail: editingPatient.previousEmail } : {}),
      };

      const res = await fetch('/api/admin/patient/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const msg = data?.error || 'Erro ao salvar paciente.';
        return showToast(msg, 'error');
      }

      showToast(editingPatient ? 'Paciente atualizado com sucesso!' : 'Paciente cadastrado e autorizado com sucesso!');
      closePatientModal();
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar paciente.', 'error');
    }
  };


  // 2. Remover Paciente
  const handleRemovePatient = async (u) => {
    try {
      const phoneCanonical = String(u?.phoneCanonical || u?.phone || '').trim();
      const email = String(u?.email || '').trim().toLowerCase();

      const res = await fetch('/api/admin/patient/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || '',
        },
        body: JSON.stringify({
          phoneCanonical,
          email,
          reason: 'admin_ui_remove',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        showToast(data?.error || 'Erro ao remover paciente.', 'error');
        return;
      }

      showToast('Paciente desativado.');
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
    // Nova importação: reseta preview e validações
    resetSendState();
    setHasVerified(false);
    setHasSynced(false);

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
    // Reset completo do pipeline (para permitir reimportar o MESMO arquivo e limpar preview)
    resetSendState();
    setHasVerified(false);
    setHasSynced(false);
    if (fileInputRef?.current) fileInputRef.current.value = '';

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

    // PASSO 26/45 fix: marcar como verificado para liberar Sincronizar
    setHasVerified(true);
    setHasSynced(false);

    const total = parsed.length;
    const authorized = parsed.filter((a) => a.isSubscribed).length;
    const notAuthorized = total - authorized;
    const pendingSends = parsed.filter((a) => a.isSubscribed && a.reminderType).length;

    showToast(
      `Planilha verificada: ${total} linhas • ${authorized} autorizados • ${notAuthorized} não autorizados • ${pendingSends} disparos pendentes.`
    );
  };



  const handleAttendanceImport = async () => {
    try {
      setAttendanceImportLoading(true);
      setAttendanceImportResult(null);
      const res = await fetch('/api/admin/attendance/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || ''
        },
        body: JSON.stringify({
          csvText: attendanceImportText,
          source: attendanceImportSource,
          defaultStatus: attendanceImportDefaultStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setAttendanceImportResult({ ok: false, error: data?.error || 'Falha ao importar' });
        showToast(data?.error || 'Falha ao importar', 'error');
        return;
      }
      setAttendanceImportResult({ ok: true, imported: data.imported, skipped: data.skipped, errors: data.errors || [] });
      showToast(`Importado: ${data.imported} • Ignorados: ${data.skipped}`);
      // Recarrega estatística para refletir imediatamente
      setAttendancePeriodDays((d) => d); // trigger effect
    } catch (e) {
      setAttendanceImportResult({ ok: false, error: e?.message || 'Erro' });
      showToast('Erro ao importar presença/faltas', 'error');
    } finally {
      setAttendanceImportLoading(false);
    }
  };


  // 7. Sincronizar agenda no Firestore (✅ upsert + reconciliação: cancela futuros que sumirem do upload)
  

// PASSO 22/45: reconciliação — cancel

// PASSO 22/45: conjunto de IDs do upload atual (docId preferindo externalId quando existir)
const currentIdsSet = new Set(
  (processedAppointments || [])
    .map((a) => String(a.externalId || a.docId || a.id || "").trim())
    .filter(Boolean)
);
  // PASSO 22/45: reconciliação — cancelar futuros removidos do upload (mantém histórico, não apaga passado)
const chunkArray = (arr, size = 10) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const cancelMissingFutureAppointments = async ({ list, currentIdsSet, uploadId }) => {
  try {
    const now = new Date();

    // Telefones presentes no upload (para limitar a busca). Firestore "in" limita 10 itens.
    const phones = Array.from(
      new Set(
        (list || [])
          .map((a) => String(a.cleanPhone || a.phone || "").replace(/\D/g, ""))
          .filter(Boolean)
      )
    );

    if (!phones.length) return { cancelled: 0, scanned: 0 };

    let cancelled = 0;
    let scanned = 0;

    for (const phoneChunk of chunkArray(phones, 10)) {
      const q = query(
        collection(db, "appointments"),
        where("phone", "in", phoneChunk),
        where("startAt", ">=", now),
        orderBy("startAt", "asc")
      );

      const snap = await getDocs(q);
      scanned += snap.size || 0;

      for (const d of snap.docs) {
        const appt = d.data() || {};
        const status = String(appt.status || "").toLowerCase();
        if (status === "cancelled" || status === "done") continue;

        if (currentIdsSet.has(d.id)) continue;

        const externalId = String(appt.externalId || "").trim();
        if (externalId && currentIdsSet.has(externalId)) continue;

        await updateDoc(doc(db, "appointments", d.id), {
          status: "cancelled",
          cancelledBy: "sync",
          cancelledAt: new Date(),
          cancelledUploadId: uploadId,
        });
        cancelled += 1;
      }
    }

    return { cancelled, scanned };
  } catch (e) {
    console.error("cancelMissingFutureAppointments failed:", e);
    return { cancelled: 0, scanned: 0, error: e?.message || String(e) };
  }
};
const handleSyncSchedule = async () => {

if (!hasVerified) {
  showToast("Antes de sincronizar, clique em Verificar para validar a planilha.", "error");
  return;
}

    if (!appointments.length) return showToast('Nenhuma agenda para sincronizar.', 'error');

    setIsSaving(true);

    // uploadId ajuda auditoria e reconciliação (snapshot do estado atual)
    const uploadId = `upload_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    setLastUploadId(uploadId);

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
        const phoneCanonical = normalizePhoneCanonical(a.cleanPhone || a.phone || '');
        const phoneE164 = phoneToE164(phoneCanonical);
        const phone = phoneCanonical;
        const date = a.data || a.date || '';
        const time = a.hora || a.time || '';
        const profissional = a.profissional || '';
        const isoDate = a.isoDate || normalizeToISODate(date);

        // PASSO 15/45: timestamp unificado para ordenação/consulta (evita depender de strings)
        const safeTime = (time || "00:00").trim();
        const startAt = isoDate ? new Date(`${isoDate}T${safeTime}:00`) : null;

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
          phoneCanonical,
          phoneE164,
          date: date || '',
          isoDate,
          time: time || '',
          startAt: startAt || null,
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

      

// PASSO 22/45: cancela sessões futuras que estavam no Firestore mas não vieram no upload atual
const recon = await cancelMissingFutureAppointments({ list: processedAppointments, currentIdsSet, uploadId });
if (recon?.cancelled) {
  showToast(`Reconciliação: ${recon.cancelled} sessões futuras canceladas (não estavam no upload).`, "info");
}
showToast(
        `Agenda sincronizada! (${syncedIds.length} registros) • Reconciliação aplicada (futuros removidos foram cancelados).`
      );
      // PASSO 27/45 — Registrar resumo do upload no history (server-side)
      try {
        const adminSecret = process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || '';
        if (adminSecret && verificationSummary?.total) {
          await fetch('/api/admin/appointments/sync-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
            body: JSON.stringify({
              uploadId,
              totalAppointments: verificationSummary.total,
              uniquePatients: verificationSummary.uniquePatients,
              dateRange: {
                firstISO: verificationSummary.firstISO || null,
                lastISO: verificationSummary.lastISO || null,
              },
              fallbackServiceCount: verificationSummary.fallbackServiceCount || 0,
            }),
          }).catch(() => null);
        }
      } catch (_) {
        // não bloquear sincronização por falha de log
      }

      setHasSynced(true);

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
    const newLine = `,${manualEntry.nome},${cleanPhone},${manualEntry.data},${manualEntry.hora},${nomeProfissional},`;

    setCsvInput((prev) => (prev ? `${prev}\n${newLine}` : newLine));
    setManualEntry({ nome: '', telefone: '', data: '', hora: '', profissional: '' });
    setShowManualForm(false);
    showToast('Registro manual adicionado. Clique em Verificar.');
  };


  const inactivePhoneSet = useMemo(() => {
    const set = new Set();
    (subscribers || []).forEach((s) => {
      if (String(s?.status || '').toLowerCase() === 'inactive') {
        const p = String(s?.phoneCanonical || s?.phone || '').replace(/\D/g, '');
        if (p) set.add(p.startsWith('55') && (p.length === 12 || p.length === 13) ? p.slice(2) : p);
      }
    });
    return set;
  }, [subscribers]);

    // 9. Enviar lembretes (push) — PASSO 28/45: PREVIEW (não envia)
  const generateSendPreview = async () => {
    if (!hasVerified) {
      showToast("Antes de disparar, clique em Verificar.", "error");
      return;
    }
    if (!hasSynced) {
      showToast("Antes de disparar, clique em Sincronizar.", "error");
      return;
    }

    const onlyDigits = (v) => String(v || "").replace(/\D/g, "");
    const toCanonical = (v) => {
      let d = onlyDigits(v).replace(/^0+/, "");
      if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
      return d;
    };

    const candidates = (filteredAppointments || []).filter((a) => a.reminderType);

    // Busca server-side (Admin SDK) para saber quem realmente tem token,
    // sem ler subscribers no client.
    const phonesUnique = Array.from(
      new Set(
        candidates
          .map((a) => toCanonical(a.cleanPhone || a.phoneCanonical || a.phone))
          .filter((p) => p && (p.length === 10 || p.length === 11))
      )
    );

    let hasTokenByPhone = {};
    try {
      const res = await fetch("/api/admin/push/status-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || "",
        },
        body: JSON.stringify({ phones: phonesUnique }),
      });

      if (res.ok) {
        const data = await res.json();
        const results = data?.results || {};
        hasTokenByPhone = Object.fromEntries(
          Object.entries(results).map(([phone, info]) => [phone, Boolean(info?.hasToken)])
        );
      } else {
        // fallback: se rota falhar, usa flag isSubscribed existente
        hasTokenByPhone = {};
      }
    } catch (e) {
      hasTokenByPhone = {};
    }

    const getHasToken = (a) => {
      const p = toCanonical(a.cleanPhone || a.phoneCanonical || a.phone);
      if (p && Object.prototype.hasOwnProperty.call(hasTokenByPhone, p)) return !!hasTokenByPhone[p];
      // fallback (legado)
      return Boolean(a.isSubscribed);
    };

    const blockedNoToken = candidates.filter((a) => !getHasToken(a));
    const blockedInactive = candidates.filter((a) => {
      const p = toCanonical(a.cleanPhone || a.phoneCanonical || a.phone);
      return getHasToken(a) && inactivePhoneSet.has(p);
    });
    const willSend = candidates.filter((a) => {
      const p = toCanonical(a.cleanPhone || a.phoneCanonical || a.phone);
      return getHasToken(a) && !inactivePhoneSet.has(p);
    });

    const byPatient = new Map();
    willSend.forEach((a) => {
      const phone = toCanonical(a.cleanPhone || a.phoneCanonical || a.phone);
      const key = phone || "sem_telefone";
      const prev = byPatient.get(key) || {
        phoneCanonical: phone,
        name: a.name || a.patientName || "-",
        count: 0,
      };
      prev.count += 1;
      byPatient.set(key, prev);
    });

    const patients = Array.from(byPatient.values())
      .sort((x, y) => y.count - x.count)
      .slice(0, 25);

    const blockedPatientsMap = new Map();

// Consolida bloqueios por paciente (até 25 no preview)
candidates.forEach((a) => {
  const phone = toCanonical(a.cleanPhone || a.phoneCanonical || a.phone);
  const name = a.name || a.patientName || '-';
  const key = phone || 'sem_telefone';

  let reason = null;
  if (!phone) {
    reason = 'Sem telefone';
  } else if (inactivePhoneSet.has(phone)) {
    reason = 'Inativo';
  } else if (!getHasToken(a)) {
    reason = 'Sem Push';
  }

  if (!reason) return;

  const prev = blockedPatientsMap.get(key) || {
    phoneCanonical: phone || '',
    name,
    reason,
    count: 0,
  };

  // Se houver múltiplos motivos (raro), prioriza Inativo > Sem Push > Sem telefone
  const priority = { 'Inativo': 3, 'Sem Push': 2, 'Sem telefone': 1 };
  if (priority[reason] > (priority[prev.reason] || 0)) prev.reason = reason;

  prev.count += 1;
  blockedPatientsMap.set(key, prev);
});

const blockedPatients = Array.from(blockedPatientsMap.values())
  .sort((x, y) => y.count - x.count)
  .slice(0, 25);

const blockedMissingPhone = candidates.filter((a) => {
  const p = toCanonical(a.cleanPhone || a.phoneCanonical || a.phone);
  return !p;
}).length;

const preview = {
  uploadId: lastUploadId || globalConfig?.appointmentsLastUploadId || null,
  generatedAtISO: new Date().toISOString(),
  totals: {
    candidates: candidates.length,
    willSend: willSend.length,
    blockedNoToken: blockedNoToken.length,
    blockedInactive: blockedInactive.length,
    blockedMissingPhone,
  },
  patients,
  blockedPatients,

  willSendItems: willSend.map((a) => ({
    appointmentId: a.id || a.appointmentId || null,
    phoneCanonical: toCanonical(a.cleanPhone || a.phoneCanonical || a.phone),
    patientName: a.name || a.patientName || '',
    startISO: a.startISO || a.start || a.dateISO || a.date || null,
    reminderType: a.reminderType || null,
    serviceType: a.serviceType || 'Sessão',
    location: a.location || 'Clínica',
  })),
};

    setSendPreview(preview);
    showToast("Preview gerado. Nenhuma mensagem foi enviada.", "info");
  };

  const [sendMode, setSendMode] = useState('preview'); // 'preview' | 'ready' | 'sending'
  const resetSendState = () => {
    setSendPreview(null);
    setSendMode('preview');
  };
const handleDispatchReminders = async () => {
    if (!sendPreview || !sendPreview?.willSendItems?.length) {
      showToast("Gere o preview antes de disparar.", "error");
      return;
    }
    setIsSending(true);
    setSendMode('sending');
    try {
      const res = await fetch("/api/admin/reminders/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || "",
        },
        body: JSON.stringify({
          uploadId: sendPreview?.uploadId || lastUploadId || globalConfig?.appointmentsLastUploadId || null,
          reminders: sendPreview.willSendItems,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const msg = data?.error || "Erro ao disparar lembretes.";
        showToast(msg, "error");
        setSendMode('ready');
        return;
      }

      showToast(
        `Disparo concluído: ${data?.sentCount || 0} enviados, ${data?.failCount || 0} falharam, ${data?.skippedNoToken || 0} sem push.`,
        "success"
      );

      // Reseta estado para evitar disparo duplicado acidental.
      setSendPreview(null);
      setSendMode('preview');
    } catch (e) {
      console.error(e);
      showToast("Erro ao disparar lembretes.", "error");
      setSendMode('ready');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReminders = async () => {
    if (sendMode === 'ready') {
      await handleDispatchReminders();
      return;
    }
    setIsSending(true);
    try {
      await generateSendPreview();
      // generateSendPreview já dá toast. Aqui só muda o modo.
      setSendMode('ready');
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
        reminderOffsetsHours: Array.isArray(localConfig.reminderOffsetsHours)
          ? localConfig.reminderOffsetsHours.map((n) => Number(n || 0))
          : [48, 24, 12],
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
            {/* STEP43: Constância Terapêutica (Presença/Faltas) */}
            <Card className="p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Constância Terapêutica</h3>
                  <p className="text-sm text-slate-500">
                    A cura acontece na continuidade. Este painel ajuda a monitorar presença e faltas para apoiar o vínculo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 mr-2">Período:</span>
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setAttendancePeriodDays(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        attendancePeriodDays === d
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {attendanceError && (
                <div className="mt-4 text-sm text-red-600">
                  {attendanceError}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title={`Presenças (${attendancePeriodDays} dias)`} value={attendanceLoading ? "..." : attendanceStats.present} icon={CalendarCheck} />
                <StatCard title={`Faltas (${attendancePeriodDays} dias)`} value={attendanceLoading ? "..." : attendanceStats.absent} icon={UserMinus} />
                <StatCard title="Taxa de Comparecimento" value={attendanceLoading ? "..." : `${attendanceStats.rate}%`} icon={Activity} />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Faltas mais frequentes</h4>
                  <span className="text-xs text-slate-500">Top 8 por paciente</span>
                </div>

                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-semibold text-slate-600">Paciente (phoneCanonical)</th>
                        <th className="px-4 py-2 font-semibold text-slate-600">Faltas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!attendanceLoading && attendanceStats.topAbsent.length === 0 ? (
                        <tr>
                          <td className="px-4 py-3 text-slate-500" colSpan={2}>Sem dados de faltas no período.</td>
                        </tr>
                      ) : (
                        attendanceStats.topAbsent.map((row) => (
                          <tr key={row.phoneCanonical} className="border-t border-slate-200">
                            <td className="px-4 py-2 text-slate-700">{row.phoneCanonical}</td>
                            <td className="px-4 py-2 text-slate-700">{row.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Importante: este painel não oferece cancelamento/reagendamento. A ausência deve ser tratada com contato ativo com a clínica, criando uma barreira saudável contra resistências momentâneas.
                </p>
              </div>
            </Card>

            {/* STEP44: Importar Presença/Faltas */}
            <Card className="p-5 mt-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Importar Presença/Faltas</h3>
                  <p className="text-sm text-slate-600">
                    Alimente <b>attendance_logs</b> via planilha (CSV). Isso sustenta o painel de constância e futuras mensagens de cuidado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-sm text-slate-600">Fonte</label>
                  <input
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200"
                    value={attendanceImportSource}
                    onChange={(e) => setAttendanceImportSource(e.target.value)}
                    placeholder="ex.: sistema_atual / recepção / manual"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600">Status padrão (se faltar coluna)</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200"
                    value={attendanceImportDefaultStatus}
                    onChange={(e) => setAttendanceImportDefaultStatus(e.target.value)}
                  >
                    <option value="absent">Falta</option>
                    <option value="present">Presença</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleAttendanceImport}
                    disabled={attendanceImportLoading || !attendanceImportText.trim()}
                    className="w-full"
                  >
                    {attendanceImportLoading ? 'Importando...' : 'Importar'}
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm text-slate-600">Cole o CSV aqui</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 min-h-[140px]"
                  value={attendanceImportText}
                  onChange={(e) => setAttendanceImportText(e.target.value)}
                  placeholder={"telefone,data,status,nome\n11999999999,07/02/2026,presente,João\n..."}
                />
              </div>

              {attendanceImportResult && (
                <div className="mt-3 text-sm">
                  {attendanceImportResult.ok ? (
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        Importado: <b>{attendanceImportResult.imported}</b> • Ignorados: <b>{attendanceImportResult.skipped}</b>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <X className="w-4 h-4" />
                      <span>Erro: {attendanceImportResult.error}</span>
                    </div>
                  )}

                  {attendanceImportResult.ok && attendanceImportResult.errors?.length > 0 && (
                    <div className="mt-2 text-slate-600">
                      <div className="font-semibold">Amostra de erros:</div>
                      <ul className="list-disc ml-5">
                        {attendanceImportResult.errors.slice(0, 5).map((er, idx) => (
                          <li key={idx}>
                            Linha {er.line}: {er.error} ({er.value})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>


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
                    <input type="file" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
                  </label>
                  <Button onClick={handleClearData} variant="danger" icon={Trash2} />
                  <Button onClick={() => processCsv()} className="flex-1" icon={Send}>
                    Verificar
                  </Button>
                </div>
                {verificationSummary ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <b>Total:</b> {verificationSummary.total}
                      </span>
                      <span>
                        <b>Pacientes únicos:</b> {verificationSummary.uniquePatients}
                      </span>
                      <span>
                        <b>Período:</b> {verificationSummary.dateFrom} → {verificationSummary.dateTo}
                      </span>
                      <span>
                        <b>Fallback “Sessão”:</b> {verificationSummary.fallbackServiceCount}
                      </span>
                    </div>
                  </div>
                ) : null}

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
                    {isSending ? 'Processando...' : (sendMode === 'ready' ? 'Disparar Lembretes' : 'Gerar Preview do Disparo')}
                  </Button>
                ) : (
                  <p className="text-center text-xs text-slate-400">
                    Nenhum disparo disponível para a seleção.
                  </p>
                )}
              </div>


              {sendPreview && (
                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-600">Preview do Disparo (não envia)</div>
                    <div className="text-[11px] text-slate-400">
                      Gerado em {new Date(sendPreview.generatedAtISO).toLocaleString('pt-BR')}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500">
                      Offsets atuais: {(
                        (Array.isArray(localConfig.reminderOffsetsHours)
                          ? localConfig.reminderOffsetsHours
                          : Array.isArray(globalConfig?.reminderOffsetsHours)
                            ? globalConfig.reminderOffsetsHours
                            : [48, 24, 12]
                        )
                          .slice()
                          .sort((a, b) => Number(b) - Number(a))
                          .join('h / ')
                      )}h
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white p-2 border border-slate-100">
                      <div className="text-slate-400">Candidatos</div>
                      <div className="text-slate-800 font-bold">{sendPreview.totals.candidates}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-slate-100">
                      <div className="text-slate-400">Iriam enviar</div>
                      <div className="text-slate-800 font-bold">{sendPreview.totals.willSend}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-slate-100">
                      <div className="text-slate-400">Bloqueados (sem Push)</div>
                      <div className="text-slate-800 font-bold">{sendPreview.totals.blockedNoToken}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-slate-100">
                      <div className="text-slate-400">Bloqueados (inativos)</div>
                      <div className="text-slate-800 font-bold">{sendPreview.totals.blockedInactive}</div>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500">
                    Sem telefone (dados incompletos): <span className="font-bold text-slate-700">{sendPreview.totals.blockedMissingPhone || 0}</span>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    Pacientes bloqueados (até 25) — motivo:
                    <span className="ml-2 text-slate-400">Sem Push → orientar ativação de notificações no painel. Inativo → não deve receber lembretes.</span>
                  </div>

                  <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-100 bg-white">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white border-b border-slate-100">
                        <tr>
                          <th className="p-2 text-left text-[11px] text-slate-400 font-bold">Paciente</th>
                          <th className="p-2 text-left text-[11px] text-slate-400 font-bold">Telefone</th>
                          <th className="p-2 text-left text-[11px] text-slate-400 font-bold">Motivo</th>
                          <th className="p-2 text-right text-[11px] text-slate-400 font-bold">Msgs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sendPreview.blockedPatients || []).map((p) => (
                          <tr key={`${p.phoneCanonical || 'sem'}_${p.reason || 'motivo'}`} className="border-b border-slate-50">
                            <td className="p-2 text-slate-700 font-semibold">{p.name || '-'}</td>
                            <td className="p-2 text-slate-500">{p.phoneCanonical || '-'}</td>
                            <td className="p-2 text-slate-600 font-bold">{p.reason || '-'}</td>
                            <td className="p-2 text-right text-slate-700 font-bold">{p.count}</td>
                          </tr>
                        ))}
                        {(!sendPreview.blockedPatients || sendPreview.blockedPatients.length === 0) && (
                          <tr>
                            <td className="p-3 text-center text-slate-400" colSpan={4}>
                              Nenhum bloqueio detectado no preview.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    Top pacientes (até 25) com lembretes pendentes:
                  </div>

                  <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-100 bg-white">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white border-b border-slate-100">
                        <tr>
                          <th className="p-2 text-left text-[11px] text-slate-400 font-bold">Paciente</th>
                          <th className="p-2 text-left text-[11px] text-slate-400 font-bold">Telefone</th>
                          <th className="p-2 text-right text-[11px] text-slate-400 font-bold">Msgs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sendPreview.patients.map((p) => (
                          <tr key={p.phoneCanonical || Math.random()} className="border-b border-slate-50">
                            <td className="p-2 text-slate-700 font-semibold">{p.name || '-'}</td>
                            <td className="p-2 text-slate-500">{p.phoneCanonical || '-'}</td>
                            <td className="p-2 text-right text-slate-700 font-bold">{p.count}</td>
                          </tr>
                        ))}
                        {sendPreview.patients.length === 0 && (
                          <tr>
                            <td className="p-3 text-center text-slate-400" colSpan={3}>
                              Nenhum lembrete pendente para preview.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

                <Button onClick={() => { setEditingPatient(null); setNewPatient({ name: '', email: '', phone: '', patientExternalId: '' }); setShowUserModal(true); }} icon={UserPlus}>
                  Novo paciente
                </Button>
              </div>

              {/* Modal novo paciente */}
              {showUserModal && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="font-black text-slate-800 flex items-center gap-2">
                        <UserPlus size={18} className="text-violet-600" /> {editingPatient ? 'Editar paciente' : 'Cadastrar paciente'}
                      </div>
                      <button onClick={closePatientModal} className="text-slate-400 hover:text-slate-700">
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
                      <div>
                       <label className="text-sm opacity-80">
  ID do paciente (sistema atual)
  <span className="ml-2 text-xs opacity-60">
    (modo: {editingPatient ? "EDITAR" : "NOVO"})
  </span>
</label>

{editingPatient ? (
  <div className="w-full mt-1 px-3 py-2 rounded-md border bg-gray-100 text-gray-700">
    {newPatient.patientExternalId || "-"}
  </div>
) : (
  <input
    className="w-full mt-1 px-3 py-2 rounded-md border"
    value={newPatient.patientExternalId}
    onChange={(e) => setNewPatient({ ...newPatient, patientExternalId: e.target.value })}
    placeholder="Ex.: 123456"
  />
)}
                        <p className="text-xs text-slate-500 mt-1 ml-1">
                          Usado na importação de Presença/Faltas. Importante quando há responsável com telefone compartilhado.
                        </p>
                      </div>


                      <Button onClick={handleRegisterPatient} icon={UserPlus} className="w-full mt-4 py-3 shadow-lg">
                        {editingPatient ? 'Salvar alterações' : 'Cadastrar e Autorizar'}
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
                        if (String(u?.status || '').toLowerCase() === 'inactive') return false;
                        if (!searchTerm?.trim()) return true;
                        const q = searchTerm.trim().toLowerCase();
                        const n = (u.name || '').toLowerCase();
                        const p = (u.phone || '').toLowerCase();
                        return n.includes(q) || p.includes(q);
                      })
                      .map((u) => (
                        <tr key={u.phone} onClick={() => openEditPatientModal(u)} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                          <td className="p-3 font-semibold text-slate-800">{u.name || '-'}</td>
                          <td className="p-3 text-slate-500">{u.email || '-'}</td>
                          <td className="p-3 text-slate-500">{u.phone || '-'}</td>
                          <td className="p-3">
                            <Badge status={u.pushToken ? 'confirmed' : 'missing'} text={u.pushToken ? 'Ativo' : 'Sem Push'} />
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemovePatient(u); }}
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
                <p className="text-xs text-slate-500 text-center -mt-2">
                  Placeholders: <code className="text-[11px]">{'{name}'}</code>, <code className="text-[11px]">{'{date}'}</code>, <code className="text-[11px]">{'{time}'}</code>, <code className="text-[11px]">{'{serviceType}'}</code>, <code className="text-[11px]">{'{location}'}</code>
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-600 mb-3">
                    Defina quantas <b>horas antes</b> cada mensagem será considerada “pendente” para disparo.
                    (Mantemos 3 lembretes por consistência terapêutica.)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { idx: 0, label: "Mensagem 1", hint: "maior antecedência" },
                      { idx: 1, label: "Mensagem 2", hint: "intermediária" },
                      { idx: 2, label: "Mensagem 3", hint: "mais próxima" },
                    ].map(({ idx, label, hint }) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">{label}</span>
                          <span className="text-[10px] text-slate-400">{hint}</span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={(localConfig.reminderOffsetsHours || [48, 24, 12])[idx]}
                          onChange={(e) => {
                            const v = Number(e.target.value || 0);
                            const current = Array.isArray(localConfig.reminderOffsetsHours)
                              ? [...localConfig.reminderOffsetsHours]
                              : [48, 24, 12];
                            current[idx] = v;
                            setLocalConfig({ ...localConfig, reminderOffsetsHours: current });
                          }}
                          className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-violet-200 transition-all"
                          placeholder="Horas"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Ex.: {(localConfig.reminderOffsetsHours || [48, 24, 12])[idx]}h antes</p>
                      </div>
                    ))}
                  </div>
                </div>


                {['msg1', 'msg2', 'msg3'].map((key) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                      {(() => {
                        const offsets = localConfig.reminderOffsetsHours || [48, 24, 12];
                        const map = { msg1: offsets[0], msg2: offsets[1], msg3: offsets[2] };
                        const h = map[key] ?? '';
                        const slotLabel = key === 'msg1' ? 'Mensagem 1' : key === 'msg2' ? 'Mensagem 2' : 'Mensagem 3';
                        return `${slotLabel} • ${h}h antes`;
                      })()}
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
