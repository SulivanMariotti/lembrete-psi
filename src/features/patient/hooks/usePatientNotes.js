// src/features/patient/hooks/usePatientNotes.js

import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";

/**
 * Notas do paciente (collection: patient_notes)
 * - Lista em realtime
 * - saveNote / deleteNote
 */
export function usePatientNotes({ db, user, phoneForNote, onToast }) {
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const toastRef = useRef(onToast);
  useEffect(() => {
    toastRef.current = onToast;
  }, [onToast]);

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
        toastRef.current?.("Erro ao carregar notas.", "error");
      }
    );

    return () => unsub();
  }, [db, user?.uid]);

  const saveNote = async (content) => {
    const c = String(content || "").trim();
    if (!c) return;

    await addDoc(collection(db, "patient_notes"), {
      patientId: user.uid,
      phone: phoneForNote || "",
      content: c,
      createdAt: new Date(),
    });
  };

  const deleteNote = async (id) => {
    await deleteDoc(doc(db, "patient_notes", id));
  };

  const hasNotes = useMemo(() => (notes || []).length > 0, [notes]);

  return { notes, hasNotes, loadingNotes, saveNote, deleteNote };
}
