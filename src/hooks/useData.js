import { useEffect, useState } from "react";
import { db } from "../app/firebase";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";

/**
 * Hook central de dados do app.
 *
 * Regras:
 * - globalConfig (config/global) deve estar sempre disponível (admin e paciente)
 * - coleções sensíveis só carregam quando isAdminMode === true
 */
export function useData(isAdminMode = false) {
  const [subscribers, setSubscribers] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({});

  // ✅ Global config: sempre ativo (admin e paciente)
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "config", "global"), (snapshot) => {
      setGlobalConfig(snapshot.exists() ? snapshot.data() : {});
    });

    return () => unsubConfig();
  }, []);

  // ✅ Dados sensíveis: só no admin
  useEffect(() => {
    if (!isAdminMode) {
      // limpa quando sair do admin para não “vazar” dados no modo paciente
      setSubscribers([]);
      setHistoryLogs([]);
      setAppointments([]);
      return;
    }

    // SUBSCRIBERS
    const unsubSubscribers = onSnapshot(collection(db, "subscribers"), (snap) => {
      setSubscribers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // HISTORY (ordena por sentAt)
    const historyQ = query(collection(db, "history"), orderBy("sentAt", "desc"));
    const unsubHistory = onSnapshot(historyQ, (snap) => {
      setHistoryLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // APPOINTMENTS
    const appQ = query(collection(db, "appointments"));
    const unsubAppointments = onSnapshot(appQ, (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubSubscribers?.();
      unsubHistory?.();
      unsubAppointments?.();
    };
  }, [isAdminMode]);

  return { subscribers, historyLogs, appointments, globalConfig };
}
