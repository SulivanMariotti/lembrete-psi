"use client";

import React, { useEffect, useMemo, useState } from "react";
import Skeleton from "../../features/patient/components/Skeleton";
import PatientHeader from "../../features/patient/components/PatientHeader";
import NextSessionCard from "../../features/patient/components/NextSessionCard";
import NotificationStatusCard from "../../features/patient/components/NotificationStatusCard";
import PatientAgendaCard from "../../features/patient/components/PatientAgendaCard";
import PatientNotesCard from "../../features/patient/components/PatientNotesCard";
import {
  app,
  db } from "../../app/firebase";
import { doc,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc } from "firebase/firestore";

import { Button,
  Card,
  Toast } from "../DesignSystem";
import {
  CheckCircle,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
} from "lucide-react";

import { onlyDigits, toCanonical, normalizeWhatsappPhone, formatPhoneBR } from "../../features/patient/lib/phone";
import { brDateParts, addMinutes, relativeLabelForDate } from "../../features/patient/lib/dates";
import { makeIcsDataUrl, startDateTimeFromAppointment } from "../../features/patient/lib/ics";

import { prettyServiceLabel, getServiceTypeFromAppointment, getLocationFromAppointment, statusChipFor } from "../../features/patient/lib/appointments";

import { useAppointmentsLastSync } from "../../features/patient/hooks/useAppointmentsLastSync";
import { usePatientAppointments } from "../../features/patient/hooks/usePatientAppointments";
import { usePatientNotes } from "../../features/patient/hooks/usePatientNotes";
import { usePushStatus } from "../../features/patient/hooks/usePushStatus";

// 🔹 Normaliza Timestamp/Date/string → millis

export default function PatientFlow({ user, onLogout, onAdminAccess, globalConfig, showToast: showToastFromProps }) {
  
  // STEP42: o paciente não acessa a coleção subscribers no client
  const subscribers = null;
const [profile, setProfile] = useState(null);


  const [loadingProfile, setLoadingProfile] = useState(true);

  const [toast, setToast] = useState({ msg: "", type: "success" });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    if (typeof showToastFromProps === "function") showToastFromProps(msg, type);
  };

  const [contractOpen, setContractOpen] = useState(false);

  const [confirmBusy, setConfirmBusy] = useState(false);

  const [confirmedIds, setConfirmedIds] = useState(() => new Set());
  const [confirmedLoading, setConfirmedLoading] = useState(false);

  const [mantraIndex, setMantraIndex] = useState(0);

  const DEV_SWITCH_ENABLED = String(process.env.NEXT_PUBLIC_DEV_LOGIN || "").toLowerCase() === "true";
  const DEV_IMP_KEY = "LP_IMPERSONATE_PHONE";

  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [impersonatePhone, setImpersonatePhone] = useState("");
  const [impersonateInput, setImpersonateInput] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!DEV_SWITCH_ENABLED) return;

    const saved = window.localStorage.getItem(DEV_IMP_KEY) || "";
    setImpersonatePhone(onlyDigits(saved));
    setImpersonateInput(onlyDigits(saved));
  }, [DEV_SWITCH_ENABLED]);

  const cleanPhoneFromProfile = useMemo(() => {
    const p = profile?.phone || profile?.phoneNumber || "";
    return onlyDigits(p);
  }, [profile]);

// Fallback: se o phone não veio no users/{uid}, resolve via API server-side (Admin SDK)
// Motivo: o paciente não deve consultar `subscribers` no client, e o fallback anterior
// estava quebrado (variável `snap` inexistente), causando ausência de telefone e falhas
// de leitura em `appointments` por regras.
const [resolvedPhone, setResolvedPhone] = useState("");

useEffect(() => {
  let cancelled = false;

  async function resolve() {
    const fromProfile = cleanPhoneFromProfile;
    if (fromProfile) {
      if (!cancelled) setResolvedPhone(fromProfile);
      return;
    }

    if (!user?.uid) return;

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/patient/resolve-phone", {
        method: "GET",
        headers: { authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      const clean = toCanonical((data?.phoneCanonical || data?.phone || "") );
      if (!clean) return;

      if (!cancelled) setResolvedPhone(clean);

      // tenta gravar no perfil para evitar esse fallback no futuro
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { phone: clean, phoneNumber: clean, phoneCanonical: clean, updatedAt: new Date() },
          { merge: true }
        );
      } catch (_) {
        // sem impacto: pode falhar por regras
      }
    } catch (_) {
      // silencioso
    }
  }

  resolve();
  return () => {
    cancelled = true;
  };
}, [cleanPhoneFromProfile, user?.uid]);

  const effectivePhone = useMemo(() => {
    if (DEV_SWITCH_ENABLED && impersonatePhone) return toCanonical(impersonatePhone);
    return toCanonical(resolvedPhone || cleanPhoneFromProfile);
  }, [DEV_SWITCH_ENABLED, impersonatePhone, resolvedPhone, cleanPhoneFromProfile]);

  const currentContractVersion = Number(globalConfig?.contractVersion || 1);
  const acceptedVersion = Number(profile?.contractAcceptedVersion || 0);
  const needsContractAcceptance = currentContractVersion > acceptedVersion;

  const clinicWhatsappPhone = useMemo(() => normalizeWhatsappPhone(globalConfig?.whatsapp || ""), [globalConfig?.whatsapp]);
  const contractText = String(globalConfig?.contractText || "Contrato não configurado.");

  const patientName = profile?.name || user?.displayName || "Paciente";
  const patientPhoneDisplay = formatPhoneBR(resolvedPhone || cleanPhoneFromProfile);

  // Step 9.2: hooks por domínio (agenda, notas, push, last-sync)
  const { appointmentsLastSyncAt } = useAppointmentsLastSync({ user });
  const { notifHasToken, setNotifHasToken } = usePushStatus({ user, effectivePhone });

  const { appointmentsRaw, appointments, loadingAppointments } = usePatientAppointments({
    db,
    user,
    effectivePhone,
    loadingProfile,
    onToast: showToast,
  });

  const phoneForNote = (resolvedPhone || cleanPhoneFromProfile) || "";
  const { notes, loadingNotes, saveNote, deleteNote } = usePatientNotes({
    db,
    user,
    phoneForNote,
    onToast: showToast,
  });


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

  useEffect(() => {
    if (loadingProfile) return;
    if (needsContractAcceptance) setContractOpen(true);
  }, [loadingProfile, needsContractAcceptance]);

  // Confirmed via API
  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    (async () => {
      try {
        setConfirmedLoading(true);
        const idToken = await user.getIdToken();
        const res = await fetch("/api/attendance/confirmed", {
          method: "GET",
          headers: { authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          setConfirmedIds(new Set());
          return;
        }

        const ids = Array.isArray(data.appointmentIds) ? data.appointmentIds.map(String) : [];
        setConfirmedIds(new Set(ids));
      } catch (e) {
        console.error(e);
        if (!cancelled) setConfirmedIds(new Set());
      } finally {
        if (!cancelled) setConfirmedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Notas

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

  // Próximo atendimento
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
      const serviceLabel = prettyServiceLabel(getServiceTypeFromAppointment(nextAppointment));
      const servicePiece = serviceLabel ? ` (${serviceLabel})` : "";

      const msg =
        `Olá! Sou ${patientName}. ` +
        `Confirmo minha presença no atendimento${prof}${servicePiece} no dia ${dateLabel}${time ? ` às ${time}` : ""}. ` +
        `Estou me organizando para estar presente.`;

      wa = `https://wa.me/${clinicWhatsappPhone}?text=${encodeURIComponent(msg)}`;
      waDisabled = false;
    }

    let ics = null;
    try {
      if (nextAppointment.isoDate && nextAppointment.time) {
        const start = new Date(`${nextAppointment.isoDate}T${nextAppointment.time}:00`);
        const end = addMinutes(start, 50);
        const serviceLabel = prettyServiceLabel(getServiceTypeFromAppointment(nextAppointment));

        ics = makeIcsDataUrl({
          title: serviceLabel ? `Atendimento (${serviceLabel})` : "Atendimento",
          description: `Atendimento ${nextAppointment.profissional ? `com ${nextAppointment.profissional}` : ""}`,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
        });
      }
    } catch (_) {}

    return { label, wa, waDisabled, ics };
  }, [nextAppointment, clinicWhatsappPhone, patientName]);

  async function handleConfirmPresence() {
    if (!nextAppointment || !nextMeta?.wa) return;

    try {
      setConfirmBusy(true);

      const idToken = await user.getIdToken();

      const res = await fetch("/api/attendance/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          appointmentId: nextAppointment.id,
          phone: effectivePhone || cleanPhoneFromProfile || "",
          channel: "whatsapp",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        showToast("Não consegui registrar sua confirmação agora, mas você pode confirmar pelo WhatsApp.", "error");
      } else {
        setConfirmedIds((prev) => {
          const n = new Set(prev);
          n.add(String(nextAppointment.id));
          return n;
        });
      }
    } catch (e) {
      console.error(e);
      showToast("Não consegui registrar sua confirmação agora, mas você pode confirmar pelo WhatsApp.", "error");
    } finally {
      setConfirmBusy(false);
      window.open(nextMeta.wa, "_blank", "noreferrer");
    }
  }

  const handleDevApply = () => {
    const p = onlyDigits(impersonateInput);
    if (!p) {
      showToast("Digite um telefone válido (DDD + número).", "error");
      return;
    }
    setImpersonatePhone(p);
    if (typeof window !== "undefined") window.localStorage.setItem(DEV_IMP_KEY, p);
    showToast("Visualização alterada para esse paciente (agenda).", "success");
    setDevPanelOpen(false);
  };

  const handleDevClear = () => {
    setImpersonatePhone("");
    setImpersonateInput("");
    if (typeof window !== "undefined") window.localStorage.removeItem(DEV_IMP_KEY);
    showToast("Voltando para o seu painel.", "success");
    setDevPanelOpen(false);
  };

  const nextLabel = useMemo(() => {
    const dt = nextAppointment ? startDateTimeFromAppointment(nextAppointment) : null;
    return dt ? relativeLabelForDate(dt) : null;
  }, [nextAppointment]);

  const nextIsConfirmed = useMemo(() => {
    if (!nextAppointment?.id) return false;
    return confirmedIds.has(String(nextAppointment.id));
  }, [confirmedIds, nextAppointment?.id]);

  const nextStatusChip = useMemo(() => {
    return statusChipFor(nextAppointment?.status, nextIsConfirmed);
  }, [nextAppointment?.status, nextIsConfirmed]);

  const nextServiceLabel = useMemo(() => {
    return prettyServiceLabel(getServiceTypeFromAppointment(nextAppointment));
  }, [nextAppointment]);

  const nextPlaceLabel = useMemo(() => {
    return String(getLocationFromAppointment(nextAppointment) || "").trim();
  }, [nextAppointment]);


  return (
    <>
      {toast?.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: "" })} />}

      <div className={`min-h-screen bg-slate-50 ${needsContractAcceptance ? "pb-24" : "pb-10"}`}>
        <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
          {/* Header */}
<PatientHeader
  patientName={patientName}
  devSwitchEnabled={DEV_SWITCH_ENABLED}
  impersonatePhone={impersonatePhone}
  setDevPanelOpen={setDevPanelOpen}
  onAdminAccess={onAdminAccess}
  onLogout={onLogout}
/>

{/* DEV painel */}
          {DEV_SWITCH_ENABLED && devPanelOpen && (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-violet-600" />
                    Trocar paciente (DEV)
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Digite o telefone do paciente para visualizar a agenda (sem alterar login).</div>
                </div>
                <button type="button" onClick={() => setDevPanelOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700"
                  placeholder="DDD + número (ex: 11999998888)"
                  value={impersonateInput}
                  onChange={(e) => setImpersonateInput(onlyDigits(e.target.value))}
                />
                <Button onClick={handleDevApply} className="sm:w-auto w-full">
                  Aplicar
                </Button>
                <Button onClick={handleDevClear} variant="secondary" className="sm:w-auto w-full">
                  Voltar
                </Button>
              </div>

              <div className="mt-3 text-[11px] text-slate-400">
                * Esse recurso aparece somente quando <b>NEXT_PUBLIC_DEV_LOGIN=true</b>.
              </div>
            </Card>
          )}

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
                  <div className="text-[11px] text-slate-400 mt-2">Lembrete Psi é tecnologia a serviço do vínculo terapêutico.</div>
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
          <Card>
            <NotificationStatusCard
              app={app}
              user={user}
              notifHasToken={notifHasToken}
              setNotifHasToken={setNotifHasToken}
              showToast={showToast}
            />
          </Card>

          {/* Próximo atendimento */}
<NextSessionCard
  nextAppointment={nextAppointment}
  nextLabel={nextLabel}
  nextStatusChip={nextStatusChip}
  nextServiceLabel={nextServiceLabel}
  nextPlaceLabel={nextPlaceLabel}
  nextMeta={nextMeta}
  confirmBusy={confirmBusy}
  confirmedLoading={confirmedLoading}
  onConfirmPresence={handleConfirmPresence}
/>

          {/* Agenda */}
          <PatientAgendaCard
            appointments={appointments}
            appointmentsRaw={appointmentsRaw}
            loading={loadingAppointments}
            confirmedIds={confirmedIds}
          />

          {/* Contrato */}
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

          {/* Diário */}
          <PatientNotesCard
            notes={notes}
            loadingNotes={loadingNotes}
            saveNote={saveNote}
            deleteNote={deleteNote}
            showToast={showToast}
          />
        </div>

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
      </div>
    </>
  );
}
