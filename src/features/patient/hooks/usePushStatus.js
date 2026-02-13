// src/features/patient/hooks/usePushStatus.js

import { useEffect, useRef, useState } from "react";

/**
 * Lê no server se existe token push registrado para o paciente.
 * API: GET /api/patient/push/status
 */
export function usePushStatus({ user, effectivePhone }) {
  const [notifHasToken, setNotifHasToken] = useState(false);

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function loadPushStatus() {
      try {
        if (!user) return;
        const idToken = await user.getIdToken();
        const res = await fetch("/api/patient/push/status", {
          method: "GET",
          headers: { authorization: "Bearer " + idToken },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelledRef.current) return;
        if (res.ok && data?.ok) {
          setNotifHasToken(Boolean(data?.hasToken));
        }
      } catch (_) {
        // silencioso
      }
    }

    loadPushStatus();

    return () => {
      cancelledRef.current = true;
    };
  }, [user?.uid, effectivePhone]);

  return { notifHasToken, setNotifHasToken };
}
