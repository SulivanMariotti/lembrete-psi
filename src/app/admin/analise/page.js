"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getAuth, getIdTokenResult, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";

import { app } from "../../firebase";
import { Button, Card, Toast } from "../../../components/DesignSystem";
import AdminAnalysisView from "../../../components/Admin/AdminAnalysisView";
import { logoutUser } from "../../../services/authService";

export default function AdminAnalisePage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const showToast = (msg, type = "success") => setToast({ msg, type });
  const needsLogoutToProceed = useMemo(() => Boolean(user) && !isAdmin, [user, isAdmin]);

  useEffect(() => {
    const auth = getAuth(app);

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser || null);

      if (!nextUser) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        const token = await getIdTokenResult(nextUser, true);
        const role = token?.claims?.role;
        setIsAdmin(role === "admin");
      } catch (_) {
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (_) {
      // ok
    } finally {
      setUser(null);
      setIsAdmin(false);
    }
  };

  const handleAdminLogin = async (event) => {
    event?.preventDefault?.();

    const pass = String(password || "").trim();
    if (!pass) {
      showToast("Digite a senha de administrador.", "error");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok || !data?.token) {
        showToast(data?.error || "Senha incorreta", "error");
        return;
      }

      const auth = getAuth(app);
      await signInWithCustomToken(auth, data.token);

      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await getIdTokenResult(currentUser, true);
        const role = token?.claims?.role;
        if (role === "admin") {
          setIsAdmin(true);
          setPassword("");
          showToast("Bem-vindo, Admin!", "success");
          return;
        }
      }

      showToast("Login efetuado, mas sem permissão de admin.", "error");
      setIsAdmin(false);
    } catch (error) {
      console.error(error);
      showToast("Erro de servidor", "error");
      setIsAdmin(false);
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Carregando...
      </div>
    );
  }

  if (isAdmin) {
    return (
      <>
        {toast?.msg && (
          <Toast
            message={toast.msg}
            type={toast.type}
            onClose={() => setToast({ msg: "", type: "success" })}
          />
        )}

        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
          <AdminAnalysisView showToast={showToast} />
        </div>
      </>
    );
  }

  return (
    <>
      {toast?.msg && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast({ msg: "", type: "success" })}
        />
      )}

      <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-violet-50/30 to-slate-50 p-6 shadow-sm md:p-8">
            <div className="flex items-start gap-4">
              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <Image
                  src="/logo.png"
                  alt="Lembrete Psi"
                  fill
                  className="object-contain p-2"
                  sizes="56px"
                  priority
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    Lembrete Psi
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Admin
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Análise • preparação para detecção de duplicidades em Excel
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-slate-600">
              <p className="text-sm sm:text-base">
                Área preparada para receber planilhas <b>.xlsx</b>, validar o cabeçalho da primeira aba,
                mapear colunas e devolver um preview das linhas antes de aplicar as regras de duplicidade.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Rota</div>
                  <div className="mt-1 font-semibold text-slate-800">/admin/analise</div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Upload</div>
                  <div className="mt-1 font-semibold text-slate-800">.xlsx</div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Saída atual</div>
                  <div className="mt-1 font-semibold text-slate-800">Cabeçalhos + preview</div>
                </div>
              </div>
            </div>
          </div>

          <Card title="Acesso Admin">
            {needsLogoutToProceed ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-600">
                  Você já está logado, mas <b>sem permissão de admin</b>.
                  <div className="mt-1 text-xs text-slate-400">
                    Para entrar como Admin, saia e informe a senha de administrador.
                  </div>
                </div>

                <Button variant="secondary" className="w-full" onClick={handleLogout}>
                  Sair
                </Button>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handleAdminLogin}>
                <div className="text-sm text-slate-600">
                  Área restrita. Use a senha para acessar a leitura da planilha e, no próximo passo, configurar as regras que vão devolver as linhas duplicadas.
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold uppercase text-slate-500">Senha</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3 text-slate-700 outline-none focus:ring-2 focus:ring-violet-200"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </div>

                <Button className="w-full" disabled={busy} onClick={handleAdminLogin}>
                  {busy ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            )}

            <div className="mt-4 text-[11px] leading-snug text-slate-400">
              * Nesta etapa a rota faz a leitura da estrutura do Excel. As regras de duplicidade entram no próximo passo.
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
