"use client";

import React, { useEffect, useMemo, useState } from "react";
import { app, db } from "../../app/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

import { Button, Card, Badge, Toast } from "../DesignSystem";
import {
  CalendarCheck,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  FileText,
  Trash2,
  Loader2,
  Bell,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  LogOut,
} from "lucide-react";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function formatPhoneBR(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

function brDateParts(dateStrOrIso) {
  const s = String(dateStrOrIso || "").trim();
  if (!s) return { day: "--", mon: "---", label: "" };

  let dateObj = null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) dateObj = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);

  if (!dateObj) {
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) dateObj = new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00`);
  }

  if (!dateObj || Number.isNaN(dateObj.getTime())) {
    return { day: "--", mon: "---", label: s };
  }

  const day = String(dateObj.getDate()).padStart(2, "0");
  const monNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const mon = monNames[dateObj.getMonth()];
  const label = dateObj.toLocaleDateString("pt-BR");
  return { day, mon, label };
}

function makeIcsDataUrl({ title, description, startISO, endISO }) {
  const dt = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const da = pad(d.getUTCDate());
    const h = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const s = pad(d.getUTCSeconds());
    return `${y}${m}${da}T${h}${mi}${s}Z`;
  };

  const uid = `lembretepsi-${Math.random().toString(16).slice(2)}@local`;
  const ics =
    "BEGIN:VCALENDAR\n" +
    "VERSION:2.0\n" +
    "PRODID:-//Lembrete Psi//PT-BR\n" +
    "CALSCALE:GREGORIAN\n" +
    "METHOD:PUBLISH\n" +
    "BEGIN:VEVENT\n" +
    `UID:${uid}\n` +
    `DTSTAMP:${dt(new Date().toISOString())}\n` +
    `DTSTART:${dt(startISO)}\n` +
    `DTEND:${dt(endISO)}\n` +
    `SUMMARY:${String(title || "Atendimento").replace(/\n/g, " ")}\n` +
    `DESCRIPTION:${String(description || "").replace(/\n/g, " ")}\n` +
    "END:VEVENT\n" +
    "END:VCALENDAR";

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export default function PatientFlow({ user, onLogout, onAdminAccess, globalConfig, showToast: showToastFromProps }) {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const [toast, setToast] = useState({ msg: "", type: "success" });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    if (typeof showToastFromProps === "function") showToastFromProps(msg, type);
  };

  // UI states
  const [contractOpen, setContractOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteSearch, setNoteSearch] = useState("");

  // Notificações
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState("default");
  const [notifHasToken, setNotifHasToken] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);

  const cleanPhoneFromProfile = useMemo(() => {
    const p = profile?.phone || profile?.phoneNumber || "";
    return onlyDigits(p);
  }, [profile]);

  const currentContractVersion = Number(globalConfig?.contractVersion || 1);
  const acceptedVersion = Number(profile?.contractAcceptedVersion || 0);
  const needsContractAcceptance = currentContractVersion > acceptedVersion;

  const whatsappLink = useMemo(() => {
    const raw = globalConfig?.whatsapp || "";
    const phone = onlyDigits(raw);
    if (!phone) return null;
    return `https://wa.me/${phone}`;
  }, [globalConfig?.whatsapp]);

  const contractText = String(globalConfig?.contractText || "Contrato não configurado.");

  // ✅ Perfil
  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;
    let unsub = null;

    (async () => {
      try {
        setLoadingProfile(true);
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(
            userRef,
            {
              uid: user.uid,
              email: (user.email || "").toLowerCase(),
              name: user.displayName || "",
              phone: "",
              role: "patient",
              createdAt: new Date(),
              lastSeen: new Date(),
              contractAcceptedVersion: 0,
              contractAcceptedAt: null,
            },
            { merge: true }
          );
        } else {
          await setDoc(userRef, { lastSeen: new Date() }, { merge: true });
        }

        if (cancelled) return;

        unsub = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) setProfile({ id: docSnap.id, ...docSnap.data() });
            else setProfile(null);
            setLoadingProfile(false);
          },
          (err) => {
            console.error(err);
            setLoadingProfile(false);
            showToast("Erro ao carregar perfil.", "error");
          }
        );
      } catch (e) {
        console.error(e);
        setLoadingProfile(false);
        showToast("Erro ao inicializar perfil.", "error");
      }
    })();

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [user?.uid, user?.email, user?.displayName]);

  // ✅ Abrir contrato automaticamente se pendente (primeira carga)
  useEffect(() => {
    if (loadingProfile) return;
    if (needsContractAcceptance) setContractOpen(true);
  }, [loadingProfile, needsContractAcceptance]);

  // ✅ Status de notificações
  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotifPermission(Notification?.permission || "default");
    setNotifSupported("Notification" in window && "serviceWorker" in navigator);

    const onChange = () => setNotifPermission(Notification.permission || "default");
    document?.addEventListener?.("visibilitychange", onChange);
    return () => document?.removeEventListener?.("visibilitychange", onChange);
  }, []);

  async function enableNotificationsAndSaveToken() {
    try {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;

      setNotifBusy(true);

      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm || "default");
        if (perm !== "granted") {
          showToast("Permissão de notificação não concedida.", "error");
          return;
        }
      }

      if (Notification.permission !== "granted") {
        showToast("Notificações bloqueadas no navegador.", "error");
        return;
      }

      const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
      const supported = await isSupported();
      setNotifSupported(Boolean(supported));
      if (!supported) {
        showToast("Seu navegador não suporta notificações.", "error");
        return;
      }

      const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;

      if (!vapidKey) {
        showToast("VAPID não configurado. Fale com o administrador.", "error");
        return;
      }

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (!token) {
        showToast("Não foi possível gerar token de notificação.", "error");
        return;
      }

      const phone = cleanPhoneFromProfile;
      if (!phone) {
        showToast("Seu telefone ainda não está no perfil. Peça atualização ao admin.", "error");
        return;
      }

      await updateDoc(doc(db, "subscribers", phone), {
        pushToken: token,
        lastSeen: new Date(),
      });

      setNotifHasToken(true);
      showToast("Notificações ativadas ✅", "success");
    } catch (e) {
      console.error(e);
      showToast("Falha ao ativar notificações.", "error");
    } finally {
      setNotifBusy(false);
    }
  }

  // ✅ acompanhar pushToken do próprio subscriber
  useEffect(() => {
    if (!cleanPhoneFromProfile) return;

    let unsub = null;
    try {
      const ref = doc(db, "subscribers", cleanPhoneFromProfile);
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) setNotifHasToken(Boolean(snap.data()?.pushToken));
        },
        () => {}
      );
    } catch (_) {}

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [cleanPhoneFromProfile]);

  // ✅ Agenda
  useEffect(() => {
    if (!user?.uid) return;
    if (loadingProfile) return;

    setLoadingAppointments(true);

    const colRef = collection(db, "appointments");
    const phone = cleanPhoneFromProfile;

    let q = null;
    if (phone) q = query(colRef, where("phone", "==", phone), orderBy("isoDate", "asc"), limit(50));
    else if (user?.email)
      q = query(colRef, where("email", "==", (user.email || "").toLowerCase()), orderBy("isoDate", "asc"), limit(50));
    else {
      setAppointments([]);
      setLoadingAppointments(false);
      return;
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingAppointments(false);
      },
      (err) => {
        console.error(err);
        setAppointments([]);
        setLoadingAppointments(false);
        showToast("Erro ao carregar agenda.", "error");
      }
    );

    return () => unsub();
  }, [user?.uid, user?.email, loadingProfile, cleanPhoneFromProfile]);

  // ✅ Notas
  useEffect(() => {
    if (!user?.uid) return;

    setLoadingNotes(true);

    const qNotes = query(collection(db, "patient_notes"), where("patientId", "==", user.uid));
    const unsub = onSnapshot(
      qNotes,
      (snap) => {
        const arr = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.createdAt?.seconds ? a.createdAt.seconds : 0;
            const tb = b.createdAt?.seconds ? b.createdAt.seconds : 0;
            return tb - ta;
          });
        setNotes(arr);
        setLoadingNotes(false);
      },
      (err) => {
        console.error(err);
        setNotes([]);
        setLoadingNotes(false);
        showToast("Erro ao carregar notas.", "error");
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const handleAcceptContract = async () => {
    try {
      if (!user?.uid) return;
      await updateDoc(doc(db, "users", user.uid), {
        contractAcceptedVersion: currentContractVersion,
        contractAcceptedAt: new Date(),
      });
      showToast("Contrato aceito com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showToast("Erro ao aceitar contrato.", "error");
    }
  };

  const handleSaveNote = async () => {
    try {
      const content = (noteContent || "").trim();
      if (!content) return;

      await addDoc(collection(db, "patient_notes"), {
        patientId: user.uid,
        phone: cleanPhoneFromProfile || "",
        content,
        createdAt: new Date(),
      });

      setNoteContent("");
      setNoteModalOpen(false);
      showToast("Nota salva!", "success");
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar nota.", "error");
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      if (!confirm("Apagar esta nota?")) return;
      await deleteDoc(doc(db, "patient_notes", id));
      showToast("Nota apagada.", "success");
    } catch (e) {
      console.error(e);
      showToast("Erro ao apagar nota.", "error");
    }
  };

  const filteredNotes = useMemo(() => {
    const q = (noteSearch || "").trim().toLowerCase();
    if (!q) return notes;
    return (notes || []).filter((n) => String(n.content || "").toLowerCase().includes(q));
  }, [notes, noteSearch]);

  // Loading inicial (skeleton)
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <Skeleton className="h-4 w-28 mb-3" />
            <Skeleton className="h-6 w-64" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const patientName = profile?.name || user?.displayName || "Paciente";
  const patientPhone = formatPhoneBR(cleanPhoneFromProfile);

  // ✅ Texto solicitado
  const notifInlineInfo = (() => {
    if (!notifSupported) {
      return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600 flex gap-2">
          <AlertTriangle size={16} className="mt-0.5 text-slate-400" />
          <div>
            Este navegador pode não suportar notificações.
            <div className="text-xs text-slate-400 mt-1">Você ainda receberá lembretes via WhatsApp (se habilitado).</div>
          </div>
        </div>
      );
    }

    if (notifHasToken) {
      return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 flex gap-2">
          <CheckCircle size={16} className="mt-0.5" />
          <div>
            <b>Notificação ativada</b> ✅
            <div className="text-xs text-emerald-800/70 mt-1">Você receberá lembretes neste aparelho.</div>
          </div>
        </div>
      );
    }

    if (notifPermission === "denied") {
      return (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2">
          <AlertTriangle size={16} className="mt-0.5" />
          <div>
            Notificações bloqueadas.
            <div className="text-xs text-amber-800/70 mt-1">Libere nas permissões do navegador para receber lembretes.</div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm text-violet-900 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Bell size={16} className="mt-0.5 text-violet-700" />
          <div>
            <b>Ative as notificações</b>
            <div className="text-xs text-violet-800/70 mt-1">Você receberá lembretes neste aparelho.</div>
          </div>
        </div>
        <Button
          onClick={enableNotificationsAndSaveToken}
          disabled={notifBusy}
          variant="secondary"
          icon={notifBusy ? Loader2 : Bell}
        >
          {notifBusy ? "Ativando..." : "Ativar"}
        </Button>
      </div>
    );
  })();

  const contractBadge = needsContractAcceptance ? (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-100 text-xs font-semibold">
      <AlertTriangle size={14} /> Contrato pendente
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold">
      <CheckCircle size={14} /> Contrato OK
    </span>
  );

  return (
    <>
      {toast?.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: "" })} />}

      <div className={`min-h-screen bg-slate-50 ${needsContractAcceptance ? "pb-24" : "pb-10"}`}>
        <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Área do Paciente</div>
              <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <span>Olá, {patientName}</span> <span className="text-lg">👋</span>
              </div>
              <div className="text-sm text-slate-500 mt-1">Tudo em um só lugar: agenda, contrato e seu diário.</div>
            </div>

            <div className="hidden sm:flex gap-2">
              <Button onClick={onAdminAccess} variant="secondary">
                Admin
              </Button>
              <Button onClick={onLogout} variant="secondary" icon={LogOut}>
                Sair
              </Button>
            </div>
          </div>

          {/* Cartão do paciente com info de notificações */}
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-200">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate">{patientName}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                      <Phone size={14} className="text-slate-400" />
                      {patientPhone || "Telefone não informado"}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">{contractBadge}</div>
              </div>

              {/* ✅ Texto pedido aqui */}
              {notifInlineInfo}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {whatsappLink ? (
                  <Button as="a" href={whatsappLink} target="_blank" rel="noreferrer" icon={MessageCircle}>
                    WhatsApp
                  </Button>
                ) : (
                  <Button disabled variant="secondary" icon={MessageCircle}>
                    WhatsApp indisponível
                  </Button>
                )}

                <Button onClick={onAdminAccess} variant="secondary">
                  Admin
                </Button>

                <Button onClick={onLogout} variant="secondary" icon={LogOut}>
                  Sair
                </Button>
              </div>
            </div>
          </Card>

          {/* CONTRATO */}
          <Card title="Contrato Terapêutico">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setContractOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FileText size={18} className="text-violet-600" />
                  {needsContractAcceptance ? "Contrato pendente: toque para ver e aceitar" : "Ver contrato"}
                </div>
                {contractOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </button>

              {contractOpen && (
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                  {contractText}
                </div>
              )}
            </div>
          </Card>

          {/* AGENDA */}
          <Card title="Próximos Atendimentos">
            {loadingAppointments ? (
              <div className="space-y-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-sm text-slate-500">Nenhum agendamento encontrado.</div>
            ) : (
              <div className="space-y-3">
                {appointments.map((a) => {
                  const dateBase = a.isoDate || a.date || "";
                  const { day, mon, label } = brDateParts(dateBase);
                  const time = a.time || "";
                  const prof = a.profissional || "Profissional não informado";

                  let icsUrl = null;
                  try {
                    if (a.isoDate && time) {
                      const startISO = `${a.isoDate}T${time}:00`;
                      const start = new Date(startISO);
                      const end = new Date(start.getTime() + 50 * 60 * 1000);
                      icsUrl = makeIcsDataUrl({
                        title: "Atendimento",
                        description: `Atendimento com ${prof}`,
                        startISO: start.toISOString(),
                        endISO: end.toISOString(),
                      });
                    }
                  } catch (_) {}

                  return (
                    <div
                      key={a.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-16 shrink-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                          <div className="text-2xl font-black text-slate-800 leading-none">{day}</div>
                          <div className="text-[11px] font-bold text-slate-500 mt-1">{mon}</div>
                        </div>

                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <CalendarCheck size={18} className="text-violet-600" />
                            <span>{label || a.date || a.isoDate}</span>
                            {time ? <span className="text-slate-400">•</span> : null}
                            {time ? <span className="text-slate-700">{time}</span> : null}
                          </div>

                          <div className="text-sm text-slate-500">
                            Profissional: <b className="text-slate-700">{prof}</b>
                          </div>

                          {a.reminderType ? (
                            <div className="pt-1">
                              <Badge status="time" text={`Lembrete ${String(a.reminderType).toUpperCase()}`} />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {icsUrl ? (
                          <Button
                            as="a"
                            href={icsUrl}
                            download={`atendimento_${onlyDigits(a.phone || "")}_${a.isoDate || "data"}.ics`}
                            variant="secondary"
                            icon={CalendarCheck}
                          >
                            Adicionar ao calendário
                          </Button>
                        ) : (
                          <Button variant="secondary" disabled icon={CalendarCheck}>
                            Calendário indisponível
                          </Button>
                        )}

                        {whatsappLink ? (
                          <Button as="a" href={whatsappLink} target="_blank" rel="noreferrer" icon={MessageCircle}>
                            Falar com a clínica
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* NOTAS */}
          <Card title="Diário rápido">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700 text-sm"
                    placeholder="Buscar nas suas notas..."
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                  />
                </div>

                <Button onClick={() => setNoteModalOpen(true)} icon={Plus} className="shrink-0">
                  Nova
                </Button>
              </div>

              {loadingNotes ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-sm text-slate-500">
                  Nenhuma nota ainda.
                  <div className="text-xs text-slate-400 mt-1">Use “Nova” para registrar lembretes, tarefas ou observações.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotes.map((n) => {
                    const when = n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString("pt-BR") : "";
                    return (
                      <div key={n.id} className="p-4 rounded-2xl border border-slate-100 bg-white flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">{n.content}</div>
                          {when ? <div className="text-[11px] text-slate-400 mt-2">{when}</div> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors mt-1"
                          title="Apagar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* FAB */}
        <button
          type="button"
          onClick={() => setNoteModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-200 flex items-center justify-center active:scale-95 transition-transform md:hidden"
          aria-label="Adicionar nota"
        >
          <Plus size={22} />
        </button>

        {/* Rodapé aceitar contrato */}
        {needsContractAcceptance && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 p-4">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                <b className="text-slate-800">Ação necessária:</b> aceite o contrato (v{currentContractVersion}) para continuar.
              </div>
              <Button onClick={handleAcceptContract} icon={CheckCircle} className="sm:w-auto w-full">
                Aceitar contrato
              </Button>
            </div>
          </div>
        )}

        {/* Modal Nova Nota */}
        {noteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="font-bold text-slate-800">Nova nota</div>
                <button type="button" onClick={() => setNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3">
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700 text-sm min-h-[120px] resize-none"
                  placeholder="Escreva aqui..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setNoteModalOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveNote} className="flex-1" icon={CheckCircle}>
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
