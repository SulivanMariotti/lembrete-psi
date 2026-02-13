"use client";

import React, { useMemo, useState } from "react";
import { Search, Plus, Trash2, CheckCircle } from "lucide-react";

import Skeleton from "./Skeleton";
import { Button, Card } from "../../../components/DesignSystem";

/**
 * Diário rápido (Notas)
 * Props esperadas:
 * - notes: array { id, content, createdAt }
 * - loadingNotes: boolean
 * - saveNote(content: string): Promise<void>
 * - deleteNote(id: string): Promise<void>
 * - showToast(msg: string, type?: 'success'|'error'): void
 */
export default function PatientNotesCard({ notes, loadingNotes, saveNote, deleteNote, showToast }) {
  const [noteSearch, setNoteSearch] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredNotes = useMemo(() => {
    const q = String(noteSearch || "").trim().toLowerCase();
    const arr = Array.isArray(notes) ? notes : [];
    if (!q) return arr;
    return arr.filter((n) => String(n?.content || "").toLowerCase().includes(q));
  }, [notes, noteSearch]);

  const handleSaveNote = async () => {
    if (busy) return;
    const c = String(noteContent || "").trim();
    if (!c) {
      showToast?.("Escreva algo antes de salvar.", "error");
      return;
    }

    try {
      setBusy(true);
      await saveNote?.(c);
      setNoteContent("");
      setNoteModalOpen(false);
      showToast?.("Nota salva!", "success");
    } catch (e) {
      console.error(e);
      showToast?.("Erro ao salvar nota.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (busy) return;
    try {
      setBusy(true);
      await deleteNote?.(id);
      showToast?.("Nota apagada.", "success");
    } catch (e) {
      console.error(e);
      showToast?.("Erro ao apagar nota.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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
                const when = n?.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString("pt-BR") : "";
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
                      disabled={busy}
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

      {/* FAB notas (mobile) */}
      <button
        type="button"
        onClick={() => setNoteModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-200 flex items-center justify-center active:scale-95 transition-transform md:hidden"
        aria-label="Adicionar nota"
      >
        <Plus size={22} />
      </button>

      {/* Modal Nova Nota */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold text-slate-800">Nova nota</div>
              <button type="button" onClick={() => setNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600" disabled={busy}>
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700 text-sm min-h-[120px] resize-none"
                placeholder="Escreva aqui..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                disabled={busy}
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setNoteModalOpen(false)} className="flex-1" disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveNote} className="flex-1" icon={CheckCircle} disabled={busy}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
