// src/features/patient/hooks/useAppointmentsLastSync.js

import { useEffect, useRef, useState } from "react";

/**
 * Busca (server-side) a última atualização de import/sync da agenda.
 * API: GET /api/appointments/last-sync
 */
export function useAppointmentsLastSync({ user }) {
  const [appointmentsLastSyncAt, setAppointmentsLastSyncAt] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const run = async () => {
      try {
        if (!user) return;
        const idToken = await user.getIdToken();
        const res = await fetch("/api/appointments/last-sync", {
          method: "GET",
          headers: { authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelledRef.current) return;
        if (res.ok && data?.appointmentsLastSyncAt) {
          setAppointmentsLastSyncAt(data.appointmentsLastSyncAt);
        }
      } catch (_) {
        // silencioso
      }
    };

    run();

    return () => {
      cancelledRef.current = true;
    };
  }, [user?.uid]);

  return { appointmentsLastSyncAt };
}
