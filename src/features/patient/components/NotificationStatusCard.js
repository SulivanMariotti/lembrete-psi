"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/DesignSystem";
import { AlertTriangle, Bell, CheckCircle, Loader2 } from "lucide-react";

/**
 * Card interno de status de notificações (push).
 * - Detecta suporte/permissão no client
 * - Permite ativar e registrar token via /api/patient/push/register
 * - Exibe status: ativo / bloqueado / não suportado / ativar
 */
export default function NotificationStatusCard({ app, user, notifHasToken, setNotifHasToken, showToast }) {
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState("default");
  const [notifBusy, setNotifBusy] = useState(false);

  // status básico do navegador (sem depender de Firestore)
  useEffect(() => {
    if (typeof window === "undefined") return;

    setNotifPermission(Notification?.permission || "default");
    setNotifSupported("Notification" in window && "serviceWorker" in navigator);

    const onChange = () => setNotifPermission(Notification?.permission || "default");
    document?.addEventListener?.("visibilitychange", onChange);
    return () => document?.removeEventListener?.("visibilitychange", onChange);
  }, []);

  async function enableNotificationsAndSaveToken() {
    try {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;

      setNotifBusy(true);

      // pede permissão se necessário
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm || "default");
        if (perm !== "granted") {
          showToast?.("Permissão de notificação não concedida.", "error");
          return;
        }
      }

      if (Notification.permission !== "granted") {
        showToast?.("Notificações bloqueadas no navegador.", "error");
        return;
      }

      // firebase messaging
      const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
      const supported = await isSupported();
      setNotifSupported(Boolean(supported));

      if (!supported) {
        showToast?.("Seu navegador não suporta notificações.", "error");
        return;
      }

      // garante o SW
      const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;

      if (!vapidKey) {
        showToast?.("VAPID não configurado. Fale com o administrador.", "error");
        return;
      }

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
      if (!token) {
        showToast?.("Não foi possível gerar token de notificação.", "error");
        return;
      }

      if (!user) {
        showToast?.("Sessão expirada. Recarregue a página.", "error");
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch("/api/patient/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: "Bearer " + idToken },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        showToast?.(data?.error || "Falha ao ativar notificações.", "error");
        return;
      }

      setNotifHasToken?.(true);
      showToast?.("Notificações ativadas ✅", "success");
    } catch (e) {
      console.error(e);
      showToast?.("Falha ao ativar notificações.", "error");
    } finally {
      setNotifBusy(false);
    }
  }

  const content = useMemo(() => {
    if (typeof window === "undefined") {
      return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600 flex gap-2">
          <Loader2 size={16} className="mt-0.5 animate-spin text-slate-400" />
          <div>Carregando status de notificações…</div>
        </div>
      );
    }

    if (!notifSupported) {
      return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600 flex gap-2">
          <AlertTriangle size={16} className="mt-0.5 text-slate-400" />
          <div>
            Este navegador pode não suportar notificações.
            <div className="text-xs text-slate-400 mt-1">Se possível, use Chrome/Safari para receber lembretes.</div>
          </div>
        </div>
      );
    }

    if (notifHasToken) {
      return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 flex gap-2">
          <CheckCircle size={16} className="mt-0.5" />
          <div>
            <b>Notificações ativas neste aparelho</b> ✅
            <div className="text-xs text-emerald-800/70 mt-1">Você receberá lembretes neste dispositivo.</div>
          </div>
        </div>
      );
    }

    if (notifPermission === "denied") {
      return (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2">
          <AlertTriangle size={16} className="mt-0.5" />
          <div>
            Notificações bloqueadas.
            <div className="text-xs text-amber-800/70 mt-1">Libere as permissões do navegador para ativar.</div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm text-violet-900 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Bell size={16} className="mt-0.5 text-violet-700" />
          <div>
            <b>Ative as notificações</b>
            <div className="text-xs text-violet-800/70 mt-1">Para receber lembretes neste aparelho.</div>
          </div>
        </div>
        <Button onClick={enableNotificationsAndSaveToken} disabled={notifBusy} variant="secondary" icon={notifBusy ? Loader2 : Bell}>
          {notifBusy ? "Ativando..." : "Ativar"}
        </Button>
      </div>
    );
  }, [notifSupported, notifHasToken, notifPermission, notifBusy]);

  return content;
}
