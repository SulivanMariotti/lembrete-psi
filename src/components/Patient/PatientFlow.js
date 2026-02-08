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

import { Button, Card, Toast } from "../DesignSystem";
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
  Shield,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeWhatsappPhone(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

function formatPhoneBR(raw) {
  const d = onlyDigits(raw);
  if (!d) return "";
  const pure = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;

  if (pure.length === 11) return `(${pure.slice(0, 2)}) ${pure.slice(2, 7)}-${pure.slice(7)}`;
  if (pure.length === 10) return `(${pure.slice(0, 2)}) ${pure.slice(2, 6)}-${pure.slice(6)}`;
  return pure;
}

function parseDateFromAny(a) {
  const s = String(a || "").trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);

  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00`);

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function brDateParts(dateStrOrIso) {
  const d = parseDateFromAny(dateStrOrIso);
  if (!d) return { day: "--", mon: "---", label: String(dateStrOrIso || "") };
  const day = String(d.getDate()).padStart(2, "0");
  const monNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const mon = monNames[d.getMonth()];
  const label = d.toLocaleDateString("pt-BR");
  return { day, mon, label };
}

function monthLabelFromIso(isoDate) {
  const d = parseDateFromAny(isoDate);
  if (!d) return "";
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
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

function startDateTimeFromAppointment(a) {
  const iso = a?.isoDate || a?.date || "";
  const t = String(a?.time || "").trim();
  const d = parseDateFromAny(iso);
  if (!d) return null;

  if (t && /^\d{2}:\d{2}$/.test(t)) {
    return new Date(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${t}:00`
    );
  }
  return d;
}

function startOfWeek(d) {
  // Semana começando na segunda (PT-BR)
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 domingo
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function weekLabelPT(d) {
  const s = startOfWeek(d);
  const e = endOfWeek(d);
  const ds = s.toLocaleDateString("pt-BR");
  const de = e.toLocaleDateString("pt-BR");
  return `Semana ${ds} → ${de}`;
}

function relativeLabelForDate(dt) {
  if (!dt) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return { text: "Hoje", style: "today" };
  if (diffDays === 1) return { text: "Amanhã", style: "tomorrow" };
  if (diffDays > 1) return { text: `Em ${diffDays} dias`, style: "future" };
  if (diffDays === -1) return { text: "Ontem", style: "past" };
  return { text: `${Math.abs(diffDays)} dias atrás`, style: "past" };
}

function chipClass(style) {
  if (style === "today") return "bg-emerald-50 border-emerald-100 text-emerald-900";
  if (style === "tomorrow") return "bg-violet-50 border-violet-100 text-violet-900";
  if (style === "future") return "bg-slate-50 border-slate-200 text-slate-700";
  return "bg-amber-50 border-amber-100 text-amber-900";
}

function AppointmentMiniRow({ a }) {
  const dateBase = a.isoDate || a.date || "";
  const { day, mon, label } = brDateParts(dateBase);
  const time = a.time || "";
  const prof = a.profissional || "Profissional não informado";
  const place = a.location || a.sala || "";

  return (
    <div className="px-3 py-2.5 rounded-2xl border border-slate-100 bg-white flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 rounded-2xl border border-slate-100 bg-slate-50 p-2 text-center shrink-0">
          <div className="text-base font-black text-slate-800 leading-none">{day}</div>
          <div className="text-[10px] font-bold text-slate-500 mt-1">{mon}</div>
        </div>

        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">
            {label}
            {time ? <span className="text-slate-500"> • {time}</span> : null}
          </div>
          <div className="text-[12px] text-slate-500 truncate">
            Prof.: <b className="text-slate-700">{prof}</b>
            {place ? <span className="text-slate-400"> • </span> : null}
            {place ? <span className="text-slate-500">{place}</span> : null}
          </div>
        </div>
      </div>

      {a.reminderType ? (
        <span className="text-[11px] px-2 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-900 font-semibold shrink-0">
          {String(a.reminderType).toUpperCase()}
        </span>
      ) : null}
    </div>
  );
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

  // UI
  const [contractOpen, setContractOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Agenda UX
  const [agendaView, setAgendaView] = useState("compact"); // "compact" | "all"
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Notificações
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState("default");
  const [notifHasToken, setNotifHasToken] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);

  // Mantras
  const [mantraIndex, setMantraIndex] = useState(0);

  const cleanPhoneFromProfile = useMemo(() => {
    const p = profile?.phone || profile?.phoneNumber || "";
    return onlyDigits(p);
  }, [profile]);

  const currentContractVersion = Number(globalConfig?.contractVersion || 1);
  const acceptedVersion = Number(profile?.contractAcceptedVersion || 0);
  const needsContractAcceptance = currentContractVersion > acceptedVersion;

  const clinicWhatsappPhone = useMemo(() => normalizeWhatsappPhone(globalConfig?.whatsapp || ""), [globalConfig?.whatsapp]);
  const contractText = String(globalConfig?.contractText || "Contrato não configurado.");

  const patientName = profile?.name || user?.displayName || "Paciente";
  const patientPhoneDisplay = formatPhoneBR(cleanPhoneFromProfile);

  const mantras = useMemo(() => {
    return [
      { title: "O segredo é a constância", text: "A terapia funciona na regularidade. A continuidade muda." },
      { title: "Seu horário é um espaço sagrado", text: "Este encontro é cuidado ativo. Estar presente sustenta o processo." },
      { title: "Faltar interrompe", text: "Não é só perder uma hora: é quebrar a sequência de evolução que você constrói." },
      { title: "Responsabilidade com seu cuidado", text: "Este painel te apoia. Sua parte principal é comparecer." },
    ];
  }, []);

  useEffect(() => {
    const t = setInterval(() => setMantraIndex((i) => (i + 1) % mantras.length), 9000);
    return () => clearInterval(t);
  }, [mantras.length]);

  const currentMantra = mantras[mantraIndex] || mantras[0];

  // Perfil
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

  // Abrir contrato se pendente
  useEffect(() => {
    if (loadingProfile) return;
    if (needsContractAcceptance) setContractOpen(true);
  }, [loadingProfile, needsContractAcceptance]);

  // Notificações - status
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

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
      if (!token) {
        showToast("Não foi possível gerar token de notificação.", "error");
        return;
      }

      const phone = cleanPhoneFromProfile;
      if (!phone) {
        showToast("Seu telefone ainda não está no perfil. Peça atualização ao admin.", "error");
        return;
      }

      await updateDoc(doc(db, "subscribers", phone), { pushToken: token, lastSeen: new Date() });
      setNotifHasToken(true);
      showToast("Notificações ativadas ✅", "success");
    } catch (e) {
      console.error(e);
      showToast("Falha ao ativar notificações.", "error");
    } finally {
      setNotifBusy(false);
    }
  }

  useEffect(() => {
    if (!cleanPhoneFromProfile) return;

    let unsub = null;
    try {
      const ref = doc(db, "subscribers", cleanPhoneFromProfile);
      unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) setNotifHasToken(Boolean(snap.data()?.pushToken));
      });
    } catch (_) {}

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [cleanPhoneFromProfile]);

  // Agenda
  useEffect(() => {
    if (!user?.uid) return;
    if (loadingProfile) return;

    setLoadingAppointments(true);

    const colRef = collection(db, "appointments");
    const phone = cleanPhoneFromProfile;

    let q = null;
    if (phone) q = query(colRef, where("phone", "==", phone), orderBy("isoDate", "asc"), limit(200));
    else if (user?.email)
      q = query(colRef, where("email", "==", (user.email || "").toLowerCase()), orderBy("isoDate", "asc"), limit(200));
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

  // Notas
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

  // Próximo atendimento (1º futuro)
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const list = (appointments || [])
      .map((a) => {
        const dt = startDateTimeFromAppointment(a);
        return { a, ts: dt ? dt.getTime() : Number.POSITIVE_INFINITY };
      })
      .filter((x) => Number.isFinite(x.ts))
      .sort((x, y) => x.ts - y.ts);

    const upcoming = list.find((x) => x.ts >= now.getTime());
    return upcoming?.a || (list[0]?.a ?? null);
  }, [appointments]);

  const nextMeta = useMemo(() => {
    if (!nextAppointment) return { label: null, wa: null, waDisabled: true, ics: null };

    const dt = startDateTimeFromAppointment(nextAppointment);
    const label = relativeLabelForDate(dt);

    let wa = null;
    let waDisabled = true;

    if (clinicWhatsappPhone) {
      const dateLabel = brDateParts(nextAppointment.isoDate || nextAppointment.date).label;
      const time = String(nextAppointment.time || "").trim();
      const prof = nextAppointment.profissional ? ` com ${nextAppointment.profissional}` : "";

      const msg =
        `Olá! Sou ${patientName}. ` +
        `Confirmo minha presença no atendimento${prof} no dia ${dateLabel}${time ? ` às ${time}` : ""}. ` +
        `Estou me organizando para estar presente.`;

      wa = `https://wa.me/${clinicWhatsappPhone}?text=${encodeURIComponent(msg)}`;
      waDisabled = false;
    }

    let ics = null;
    try {
      if (nextAppointment.isoDate && nextAppointment.time) {
        const start = new Date(`${nextAppointment.isoDate}T${nextAppointment.time}:00`);
        const end = addMinutes(start, 50);
        ics = makeIcsDataUrl({
          title: "Atendimento",
          description: `Atendimento ${nextAppointment.profissional ? `com ${nextAppointment.profissional}` : ""}`,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
        });
      }
    } catch (_) {}

    return { label, wa, waDisabled, ics };
  }, [nextAppointment, clinicWhatsappPhone, patientName]);

  // ✅ NOVO: Agenda agrupada por semana (até 30 dias) + depois por mês
  const agendaGroups = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const items = (appointments || [])
      .map((a) => {
        const dt = startDateTimeFromAppointment(a);
        const ts = dt ? dt.getTime() : Number.POSITIVE_INFINITY;
        return { a, dt, ts };
      })
      .filter((x) => Number.isFinite(x.ts))
      .sort((x, y) => x.ts - y.ts);

    const upcoming = items.filter((x) => x.ts >= now.getTime());

    const highlights = upcoming.slice(0, 3).map((x) => x.a);

    const weeksMap = new Map();
    const monthsMap = new Map();

    for (const x of upcoming) {
      const dt = x.dt;
      if (!dt) continue;

      if (dt <= in30) {
        const key = startOfWeek(dt).toISOString();
        const label = weekLabelPT(dt);
        if (!weeksMap.has(key)) weeksMap.set(key, { key, label, list: [] });
        weeksMap.get(key).list.push(x.a);
      } else {
        const iso = x.a.isoDate || x.a.date || "";
        const m = monthLabelFromIso(iso) || "Outros";
        if (!monthsMap.has(m)) monthsMap.set(m, []);
        monthsMap.get(m).push(x.a);
      }
    }

    const weeks = Array.from(weeksMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const months = Array.from(monthsMap.entries()).map(([label, list]) => ({ label, list }));

    return { highlights, weeks, months };
  }, [appointments]);

  // Notificações bloco (sem título)
  const notifBlock = useMemo(() => {
    if (typeof window === "undefined") {
      return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600 flex gap-2">
          <Loader2 size={16} className="mt-0.5 animate-spin text-slate-400" />
          <div>Carregando status de notificações…</div>
        </div>
      );
    }

    if (!notifSupported) {
      return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600 flex gap-2">
          <AlertTriangle size={16} className="mt-0.5 text-slate-400" />
          <div>
            Este navegador pode não suportar notificações.
            <div className="text-xs text-slate-400 mt-1">Se possível, use Chrome/Safari para receber lembretes.</div>
          </div>
        </div>
      );
    }

    if (notifHasToken) {
      return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 flex gap-2">
          <CheckCircle size={16} className="mt-0.5" />
          <div>
            <b>Notificações ativas neste aparelho</b> ✅
            <div className="text-xs text-emerald-800/70 mt-1">Você receberá lembretes neste dispositivo.</div>
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
            <div className="text-xs text-amber-800/70 mt-1">Libere as permissões do navegador para ativar.</div>
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
            <div className="text-xs text-violet-800/70 mt-1">Para receber lembretes neste aparelho.</div>
          </div>
        </div>
        <Button onClick={enableNotificationsAndSaveToken} disabled={notifBusy} variant="secondary" icon={notifBusy ? Loader2 : Bell}>
          {notifBusy ? "Ativando..." : "Ativar"}
        </Button>
      </div>
    );
  }, [notifSupported, notifHasToken, notifPermission, notifBusy]);

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <Skeleton className="h-6 w-64" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast?.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: "" })} />}

      <div className={`min-h-screen bg-slate-50 ${needsContractAcceptance ? "pb-24" : "pb-10"}`}>
        <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Área do Paciente</div>
              <div className="text-lg font-extrabold text-slate-900 truncate">Olá, {patientName}</div>
              <div className="text-sm text-slate-500 mt-1">Lembretes e organização do seu cuidado — constância terapêutica.</div>
            </div>

            <div className="hidden sm:flex gap-2">
              <Button onClick={onAdminAccess} variant="secondary" icon={Shield}>
                Admin
              </Button>
              <Button onClick={onLogout} variant="secondary" icon={LogOut}>
                Sair
              </Button>
            </div>

            <div className="sm:hidden relative">
              <Button variant="secondary" onClick={() => setMobileMenuOpen((v) => !v)}>
                Menu
              </Button>
              {mobileMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-30">
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onAdminAccess();
                    }}
                  >
                    <Shield size={16} className="text-slate-500" /> Admin
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-2"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={16} className="text-slate-500" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mantra */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-200 shrink-0">
                  <Sparkles size={18} />
                </div>

                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 truncate">{currentMantra.title}</div>
                  <div className="text-sm text-slate-600 mt-1">{currentMantra.text}</div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    Lembrete Psi é tecnologia a serviço do vínculo terapêutico.
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
                  onClick={() => setMantraIndex((i) => (i - 1 + mantras.length) % mantras.length)}
                  aria-label="Anterior"
                >
                  <ChevronLeft size={16} className="text-slate-500" />
                </button>
                <button
                  type="button"
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
                  onClick={() => setMantraIndex((i) => (i + 1) % mantras.length)}
                  aria-label="Próximo"
                >
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 mt-3">
              {mantras.map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full ${i === mantraIndex ? "bg-violet-600" : "bg-slate-200"}`} />
              ))}
            </div>
          </Card>

          {/* Card do paciente */}
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-200">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Seu contato</div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-1 truncate">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-slate-700">{patientPhoneDisplay || "Telefone não informado"}</span>
                  </div>
                </div>
              </div>

              {needsContractAcceptance ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-100 text-xs font-semibold">
                  <AlertTriangle size={14} /> Contrato pendente
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold">
                  <CheckCircle size={14} /> Contrato OK
                </span>
              )}
            </div>
          </Card>

          {/* Notificações */}
          <Card>{notifBlock}</Card>

          {/* Próximo atendimento */}
          <Card title="Seu próximo atendimento">
            {!nextAppointment ? (
              <div className="text-sm text-slate-500">Nenhum atendimento encontrado.</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center shrink-0">
                      <div className="text-xl font-black text-slate-800 leading-none">
                        {brDateParts(nextAppointment.isoDate || nextAppointment.date).day}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 mt-1">
                        {brDateParts(nextAppointment.isoDate || nextAppointment.date).mon}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate flex items-center gap-2">
                        <span>
                          {brDateParts(nextAppointment.isoDate || nextAppointment.date).label}
                          {nextAppointment.time ? <span className="text-slate-400"> • </span> : null}
                          {nextAppointment.time ? <span className="text-slate-700">{nextAppointment.time}</span> : null}
                        </span>

                        {nextMeta.label ? (
                          <span className={`text-[11px] px-2 py-1 rounded-full border font-semibold ${chipClass(nextMeta.label.style)}`}>
                            {nextMeta.label.text}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-sm text-slate-500 truncate">
                        Profissional: <b className="text-slate-700">{nextAppointment.profissional || "Não informado"}</b>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {nextMeta.ics ? (
                      <Button as="a" href={nextMeta.ics} download={`proximo_atendimento.ics`} variant="secondary" icon={CalendarCheck}>
                        Calendário
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {nextMeta.wa && !nextMeta.waDisabled ? (
                    <Button as="a" href={nextMeta.wa} target="_blank" rel="noreferrer" icon={MessageCircle} className="w-full">
                      Confirmar presença no WhatsApp
                    </Button>
                  ) : (
                    <Button disabled variant="secondary" icon={MessageCircle} className="w-full">
                      WhatsApp não configurado (admin)
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* ✅ AGENDA NOVA */}
          <Card title="Agenda">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-xs text-slate-500">Visualização:</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAgendaView("compact");
                    setShowAllWeeks(false);
                    setShowAllMonths(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    agendaView === "compact"
                      ? "bg-violet-50 border-violet-100 text-violet-900"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Compacta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgendaView("all");
                    setShowAllWeeks(true);
                    setShowAllMonths(true);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    agendaView === "all"
                      ? "bg-violet-50 border-violet-100 text-violet-900"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Completa
                </button>
              </div>
            </div>

            {loadingAppointments ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-sm text-slate-500">Nenhum agendamento encontrado.</div>
            ) : (
              <div className="space-y-5">
                {/* Destaque próximos */}
                {agendaGroups.highlights.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <Calendar size={14} className="text-slate-400" />
                      Próximos atendimentos
                    </div>
                    {agendaGroups.highlights.map((a) => (
                      <AppointmentMiniRow key={a.id} a={a} />
                    ))}
                  </div>
                )}

                {/* Por semana */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Próximas semanas</div>

                  {(showAllWeeks ? agendaGroups.weeks : agendaGroups.weeks.slice(0, 3)).map((w) => (
                    <div key={w.key} className="space-y-2">
                      <div className="text-xs text-slate-400 font-semibold mt-2">{w.label}</div>
                      {w.list.slice(0, agendaView === "compact" ? 5 : 999).map((a) => (
                        <AppointmentMiniRow key={a.id} a={a} />
                      ))}
                      {agendaView === "compact" && w.list.length > 5 && (
                        <div className="text-xs text-slate-400">+ {w.list.length - 5} atendimentos nesta semana</div>
                      )}
                    </div>
                  ))}

                  {agendaGroups.weeks.length > 3 && (
                    <Button variant="secondary" className="w-full" onClick={() => setShowAllWeeks((v) => !v)} icon={CalendarCheck}>
                      {showAllWeeks ? "Mostrar menos semanas" : "Mostrar mais semanas"}
                    </Button>
                  )}
                </div>

                {/* Depois por mês */}
                {agendaGroups.months.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Depois</div>

                    {(showAllMonths ? agendaGroups.months : agendaGroups.months.slice(0, 2)).map((m) => (
                      <div key={m.label} className="space-y-2">
                        <div className="text-xs text-slate-400 font-semibold mt-2">{m.label}</div>
                        {m.list.slice(0, agendaView === "compact" ? 4 : 999).map((a) => (
                          <AppointmentMiniRow key={a.id} a={a} />
                        ))}
                        {agendaView === "compact" && m.list.length > 4 && (
                          <div className="text-xs text-slate-400">+ {m.list.length - 4} atendimentos neste mês</div>
                        )}
                      </div>
                    ))}

                    {agendaGroups.months.length > 2 && (
                      <Button variant="secondary" className="w-full" onClick={() => setShowAllMonths((v) => !v)}>
                        {showAllMonths ? "Mostrar menos meses" : "Mostrar mais meses"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* CONTRATO */}
          <Card title="Contrato Terapêutico">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setContractOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FileText size={18} className="text-violet-600" />
                  {needsContractAcceptance ? "Contrato pendente: toque para ver" : "Ver contrato"}
                </div>
                {contractOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </button>

              {contractOpen && (
                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                  {contractText}
                </div>
              )}
            </div>
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

        {/* FAB notas */}
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
