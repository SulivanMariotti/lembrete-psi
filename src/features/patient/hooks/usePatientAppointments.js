// src/features/patient/hooks/usePatientAppointments.js

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";

/**
 * Carrega a agenda do paciente (client-side via Firestore) com fallback por e-mail.
 * Mantém o comportamento atual do PatientFlow.
 */
export function usePatientAppointments({ db, user, effectivePhone, loadingProfile, onToast }) {
  const [appointmentsRaw, setAppointmentsRaw] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const toastRef = useRef(onToast);
  useEffect(() => {
    toastRef.current = onToast;
  }, [onToast]);

  useEffect(() => {
    if (!user?.uid) return;
    if (loadingProfile) return;

    setLoadingAppointments(true);

    const colRef = collection(db, "appointments");
    const phone = effectivePhone;

    let q = null;
    if (phone) {
      q = query(colRef, where("phone", "==", phone), orderBy("isoDate", "asc"), limit(250));
    } else if (user?.email) {
      q = query(colRef, where("email", "==", (user.email || "").toLowerCase()), orderBy("isoDate", "asc"), limit(250));
    } else {
      setAppointmentsRaw([]);
      setLoadingAppointments(false);
      return;
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAppointmentsRaw(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingAppointments(false);
      },
      (err) => {
        console.error(err);
        setAppointmentsRaw([]);
        setLoadingAppointments(false);
        toastRef.current?.("Erro ao carregar agenda.", "error");
      }
    );

    return () => unsub();
  }, [db, user?.uid, user?.email, loadingProfile, effectivePhone]);

  const appointments = useMemo(() => {
    return (appointmentsRaw || []).filter((a) => String(a.status || "").toLowerCase() !== "cancelled");
  }, [appointmentsRaw]);

  return { appointmentsRaw, appointments, loadingAppointments };
}
