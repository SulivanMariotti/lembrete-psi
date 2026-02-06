import { useState, useEffect } from 'react';
import { db } from '../app/firebase'; // Ajuste o caminho se necessário
import { collection, onSnapshot, query, orderBy, where, limit, doc } from 'firebase/firestore';

export function useData() {
  const [subscribers, setSubscribers] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [dbAppointments, setDbAppointments] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({});

  useEffect(() => {
    if (!db) return;

    try {
      // 1. Ouvinte de Configuração Global
      const unsubConfig = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
        if (docSnap.exists()) {
            setGlobalConfig(docSnap.data());
        }
      });

      // 2. Ouvinte de Pacientes (Subscribers)
      const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const unsubUsers = onSnapshot(qUsers, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubscribers(list);
      }, (err) => console.error("Erro Users:", err));

      // 3. Ouvinte de Histórico
      const qHist = query(collection(db, "history"), orderBy("sentAt", "desc"), limit(50));
      const unsubHist = onSnapshot(qHist, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistoryLogs(list);
      });

      // 4. Ouvinte de Agendamentos Futuros
      const todayIso = new Date().toISOString().split('T')[0];
      const qApps = query(collection(db, "appointments"), where("isoDate", ">=", todayIso));
      const unsubApps = onSnapshot(qApps, (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDbAppointments(list);
      });

      return () => { 
        unsubConfig(); 
        unsubUsers(); 
        unsubHist(); 
        unsubApps(); 
      };
    } catch (e) {
      console.error("Erro nos listeners:", e);
    }
  }, []);

  return { subscribers, historyLogs, dbAppointments, globalConfig };
}