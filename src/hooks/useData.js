import { useEffect, useState } from 'react';
import { db } from '../app/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  onSnapshot as onDocSnapshot,
} from 'firebase/firestore';

export function useData(isAdmin) {
  const [subscribers, setSubscribers] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [globalConfig, setGlobalConfig] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      // evita manter listeners abertos quando não é admin
      setSubscribers([]);
      setHistoryLogs([]);
      setAppointments([]);
      setGlobalConfig(null);
      return;
    }

    // SUBSCRIBERS
    const unsubSubscribers = onSnapshot(collection(db, 'subscribers'), (snap) => {
      setSubscribers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // HISTORY (ordena por sentAt)
    const historyQ = query(collection(db, 'history'), orderBy('sentAt', 'desc'));
    const unsubHistory = onSnapshot(historyQ, (snap) => {
      setHistoryLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // APPOINTMENTS
    const appQ = query(collection(db, 'appointments'));
    const unsubAppointments = onSnapshot(appQ, (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // CONFIG (doc)
    const configRef = doc(db, 'config', 'global');
    const unsubConfig = onDocSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) setGlobalConfig(docSnap.data());
      else setGlobalConfig(null);
    });

    return () => {
      unsubSubscribers?.();
      unsubHistory?.();
      unsubAppointments?.();
      unsubConfig?.();
    };
  }, [isAdmin]);

  return { subscribers, historyLogs, appointments, globalConfig };
}
