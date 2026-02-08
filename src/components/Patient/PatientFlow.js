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
} from "lucide-react";

export default function PatientFlow({ user, onLogout, onAdminAccess, globalConfig }) {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const [noteContent, setNoteContent] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const showToast = (msg, type = "success") => setToast({ msg, type });

  const cleanPhoneFromProfile = useMemo(() => {
    const p = profile?.phone || profile?.phoneNumber || "";
    return String(p).replace(/\D/g, "");
  }, [profile]);

  const currentContractVersion = Number(globalConfig?.contractVersion || 1);
  const acceptedVersion = Number(profile?.contractAcceptedVersion || 0);
  const needsContractAcceptance = currentContractVersion > acceptedVersion;

  const whatsappLink = useMemo(() => {
    const raw = globalConfig?.whatsapp || "";
    const phone = String(raw).replace(/\D/g, "");
    if (!phone) return null;
    return `https://wa.me/${phone}`;
  }, [globalConfig?.whatsapp]);

  // 1) Perfil users/{uid}
  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;
    let unsubProfile = null;

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

        unsubProfile = onSnapshot(
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
      if (typeof unsubProfile === "function") unsubProfile();
    };
  }, [user?.uid, user?.email, user?.displayName]);

  // 2) ✅ Registrar pushToken no subscribers/{phone}
  useEffect(() => {
    if (!user?.uid) return;
    if (loadingProfile) return;

    const phone = cleanPhoneFromProfile;
    if (!phone) return;

    (async () => {
      try {
        if (typeof window === "undefined") return;
        if (!("Notification" in window)) return;

        const { isSupported, getMessaging, getToken } = await import("firebase/messaging");

        const supported = await isSupported();
        if (!supported) return;

        // pede permissão
        if (Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") return;
        }
        if (Notification.permission !== "granted") return;

        // registra SW
        const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        const messaging = getMessaging(app);

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!vapidKey) {
          console.warn("NEXT_PUBLIC_VAPID_KEY não configurada");
          return;
        }

        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
        if (!token) return;

        // salva token no subscriber do telefone (rules agora permitem)
        await updateDoc(doc(db, "subscribers", phone), {
          pushToken: token,
          lastSeen: new Date(),
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user?.uid, loadingProfile, cleanPhoneFromProfile]);

  // 3) Agenda
  useEffect(() => {
    if (!user?.uid) return;
    if (loadingProfile) return;

    setLoadingAppointments(true);

    const colRef = collection(db, "appointments");
    const phone = cleanPhoneFromProfile;

    let q = null;
    if (phone) {
      q = query(colRef, where("phone", "==", phone), orderBy("isoDate", "asc"), limit(50));
    } else if (user?.email) {
      q = query(
        colRef,
        where("email", "==", (user.email || "").toLowerCase()),
        orderBy("isoDate", "asc"),
        limit(50)
      );
    } else {
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

  // 4) Notas por patientId
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
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
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

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-violet-600">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {toast?.msg && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: "" })} />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Área do Paciente</div>
            <div className="text-xl font-black text-slate-900">
              Olá, {profile?.name || user?.displayName || "Paciente"} 👋
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onAdminAccess} variant="secondary">Admin</Button>
            <Button onClick={onLogout} variant="secondary">Sair</Button>
          </div>
        </div>

        {needsContractAcceptance && (
          <Card title="Contrato Terapêutico">
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 text-amber-900 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="mt-0.5" size={18} />
                <div className="text-sm">
                  Identificamos uma <b>nova versão</b> do contrato (v{currentContractVersion}). Para continuar, é necessário aceitar.
                </div>
              </div>

              <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                {globalConfig?.contractText || "Contrato não configurado."}
              </div>

              <Button onClick={handleAcceptContract} icon={CheckCircle} className="w-full">
                Aceitar Contrato
              </Button>
            </div>
          </Card>
        )}

        <Card title="Próximos Atendimentos">
          {loadingAppointments ? (
            <div className="text-sm text-slate-400">Carregando agenda...</div>
          ) : appointments.length === 0 ? (
            <div className="text-sm text-slate-400">Nenhum agendamento encontrado.</div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="p-4 rounded-xl border border-slate-100 bg-white flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <CalendarCheck size={18} className="text-violet-600" />
                      {a.date || a.isoDate} {a.time ? `• ${a.time}` : ""}
                    </div>
                    <div className="text-sm text-slate-500">
                      {a.profissional ? <>Profissional: <b>{a.profissional}</b></> : <span>Profissional não informado</span>}
                    </div>
                  </div>
                  {a.reminderType && <Badge>{String(a.reminderType).toUpperCase()}</Badge>}
                </div>
              ))}
            </div>
          )}

          {whatsappLink && (
            <div className="mt-4">
              <Button as="a" href={whatsappLink} target="_blank" rel="noreferrer" icon={MessageCircle} className="w-full">
                Falar no WhatsApp
              </Button>
            </div>
          )}
        </Card>

        <Card title="Minhas Notas">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Escreva uma nota rápida..."
              />
              <Button onClick={handleSaveNote} icon={FileText}>Salvar</Button>
            </div>

            {loadingNotes ? (
              <div className="text-sm text-slate-400">Carregando notas...</div>
            ) : notes.length === 0 ? (
              <div className="text-sm text-slate-400">Nenhuma nota ainda.</div>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between gap-3">
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</div>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="text-slate-400 hover:text-red-500 transition"
                      title="Apagar nota"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
