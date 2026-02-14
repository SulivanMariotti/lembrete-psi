"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Trash2, CheckCircle, Loader2, Sparkles } from "lucide-react";

import { Button, Card } from "../../../components/DesignSystem";
import InlineLoading from "./InlineLoading";
import EmptyState from "./EmptyState";
import InlineError from "./InlineError";

/**
 * Diário rápido (Notas)
 * Props esperadas:
 * - notes: array { id, content, createdAt }
 * - loadingNotes: boolean
 * - saveNote(content: string): Promise<void>
 * - deleteNote(id: string): Promise<void>
 * - showToast(msg: string, type?: 'success'|'error'): void
 */
const QUICK_PROMPTS = [
  { label: "Como me senti hoje", value: "Como me senti hoje: " },
  { label: "O que estou evitando", value: "O que estou evitando: " },
  { label: "O que eu preciso dizer", value: "O que eu preciso dizer na sessão: " },
  { label: "Uma pequena vitória", value: "Uma pequena vitória (mesmo que mínima): " },
  { label: "Algo que me ativou", value: "Uma situação que me ativou e como eu reagi: " },
];

export default function PatientNotesCard({ notes, loadingNotes, saveNote, deleteNote, showToast, error = null, onRetry = null }) {
  const [noteSearch, setNoteSearch] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [busyAction, setBusyAction] = useState(null); // 'save' | 'delete' | null
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const textareaRef = useRef(null);

  const busy = Boolean(busyAction);
  const saving = busyAction === "save";

  const autoGrowTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (!noteModalOpen) return;
    requestAnimationFrame(() => {
      autoGrowTextarea();
      textareaRef.current?.focus?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteModalOpen]);

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
      setBusyAction("save");
      await saveNote?.(c);
      setNoteContent("");
      setNoteModalOpen(false);
      setLastSavedAt(new Date());
      showToast?.("Nota salva!", "success");
    } catch (e) {
      console.error(e);
      showToast?.("Erro ao salvar nota.", "error");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteNote = async (id) => {
    if (busy) return;
    try {
      setBusyAction("delete");
      await deleteNote?.(id);
      showToast?.("Nota apagada.", "success");
    } catch (e) {
      console.error(e);
      showToast?.("Erro ao apagar nota.", "error");
    } finally {
      setBusyAction(null);
    }
  };

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return "";
    try {
      const t = lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return `Salvo agora • ${t}`;
    } catch {
      return "Salvo agora";
    }
  }, [lastSavedAt]);

  const injectPrompt = (promptText) => {
    if (busy) return;
    setNoteContent((prev) => {
      const base = String(prev || "");
      if (!base) return promptText;
      const needsBreak = !base.endsWith("\n") ? "\n" : "";
      return `${base}${needsBreak}${promptText}`;
    });
    requestAnimationFrame(() => autoGrowTextarea());
  };

  return (
    <>
      <Card title="Diário rápido">
        <div className="space-y-4">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Sparkles size={16} className="text-violet-600" />
              <div className="font-semibold text-sm">Anote agora para chegar mais presente na sessão</div>
            </div>
            <div className="text-xs text-slate-600 mt-1">
              A evolução acontece na continuidade.
            </div>
          </div>

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

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Um rascunho rápido para a sua próxima sessão.</span>
            {saving ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Salvando…
              </span>
            ) : lastSavedLabel ? (
              <span>{lastSavedLabel}</span>
            ) : (
              <span />
            )}
          </div>

          {error ? (
            <InlineError
              title="Não foi possível carregar suas notas"
              description={typeof error === "string" ? error : "Tente novamente em instantes."}
              actionLabel={typeof onRetry === "function" ? "Recarregar" : ""}
              onAction={onRetry}
            />
          ) : loadingNotes ? (
            <div className="py-2">
              <InlineLoading label="Carregando suas notas…" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <EmptyState
              title="Nenhuma nota ainda"
              description="Use “Nova” para registrar algo que você quer levar para a sessão. Pequenas anotações ajudam a manter a continuidade do seu processo."
            />
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
              <div className="font-bold text-slate-800">Nova anotação</div>
              <button type="button" onClick={() => setNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600" disabled={busy}>
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-xs text-slate-500">
                Use este espaço para registrar o que você quer levar para a sessão. A clareza nasce quando você volta, com constância, para o que importa.
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => injectPrompt(p.value)}
                    disabled={busy}
                    className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-slate-700 text-sm min-h-[160px] max-h-[45vh] overflow-y-auto resize-none leading-relaxed"
                placeholder="O que você quer levar para a sessão?\nUm fato, uma emoção, um incômodo, uma pequena vitória…"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onInput={autoGrowTextarea}
                disabled={busy}
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{saving ? "Salvando…" : ""}</span>
                <span>{lastSavedLabel}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setNoteModalOpen(false)} className="flex-1" disabled={busy}>
                  Fechar
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
