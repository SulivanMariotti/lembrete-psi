"use client";

import React, { useMemo, useState } from "react";
import { Button, Card } from "../../../components/DesignSystem";
import { Calendar, CalendarCheck } from "lucide-react";
import Skeleton from "./Skeleton";
import AppointmentMiniRow from "./AppointmentMiniRow";
import {
  startOfWeek,
  weekLabelPT,
  monthLabelFromIso,
  toMillis,
  formatDateTimeBR,
} from "../lib/dates";
import { startDateTimeFromAppointment } from "../lib/ics";

export default function PatientAgendaCard({ appointments = [], appointmentsRaw = [], loading = false, confirmedIds }) {
  const [agendaView, setAgendaView] = useState("compact");
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // ✅ sutil: última atualização da agenda
  const agendaLastUpdate = useMemo(() => {
    let bestMs = null;
    let bestSource = "";

    for (const a of appointmentsRaw || []) {
      const ms =
        toMillis(a?.updatedAt) ??
        toMillis(a?.uploadedAt) ??
        toMillis(a?.createdAt) ??
        null;

      if (ms && (!bestMs || ms > bestMs)) {
        bestMs = ms;
        bestSource = String(a?.sourceUploadId || a?.uploadId || "").trim();
      }
    }

    if (!bestMs) return null;

    return {
      label: formatDateTimeBR(bestMs),
      sourceUploadId: bestSource || "",
    };
  }, [appointmentsRaw]);

  const agendaGroups = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const items = (appointments || [])
      .map((a) => {
        const dt = startDateTimeFromAppointment(a);
        const ts = dt ? dt.getTime() : Number.POSITIVE_INFINITY;
        return { a, dt, ts };
      })
      .filter((x) => Number.isFinite(x.ts))
      .sort((x, y) => x.ts - y.ts);

    const upcoming = items.filter((x) => x.ts >= now.getTime());

    const highlights = upcoming.slice(0, 3).map((x) => x.a);

    const weeksMap = new Map();
    const monthsMap = new Map();

    for (const x of upcoming) {
      const dt = x.dt;
      if (!dt) continue;

      if (dt <= in30) {
        const key = startOfWeek(dt).toISOString();
        const label = weekLabelPT(dt);
        if (!weeksMap.has(key)) weeksMap.set(key, { key, label, list: [] });
        weeksMap.get(key).list.push(x.a);
      } else {
        const iso = x.a?.isoDate || x.a?.date || "";
        const m = monthLabelFromIso(iso) || "Outros";
        if (!monthsMap.has(m)) monthsMap.set(m, []);
        monthsMap.get(m).push(x.a);
      }
    }

    const weeks = Array.from(weeksMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const months = Array.from(monthsMap.entries()).map(([label, list]) => ({ label, list }));

    return { highlights, weeks, months };
  }, [appointments]);

  return (
    <Card title="Agenda">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">Visualização:</div>

          {agendaLastUpdate?.label ? (
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              Agenda atualizada em <b className="text-slate-500">{agendaLastUpdate.label}</b>
              {agendaLastUpdate.sourceUploadId ? <span className="text-slate-300"> • </span> : null}
              {agendaLastUpdate.sourceUploadId ? <span>Upload: {agendaLastUpdate.sourceUploadId}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setAgendaView("compact");
              setShowAllWeeks(false);
              setShowAllMonths(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              agendaView === "compact"
                ? "bg-violet-50 border-violet-100 text-violet-900"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            Compacta
          </button>
          <button
            type="button"
            onClick={() => {
              setAgendaView("all");
              setShowAllWeeks(true);
              setShowAllMonths(true);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              agendaView === "all" ? "bg-violet-50 border-violet-100 text-violet-900" : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            Completa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : (appointments || []).length === 0 ? (
        <div className="text-sm text-slate-500">Nenhum agendamento encontrado.</div>
      ) : (
        <div className="space-y-5">
          {agendaGroups.highlights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Calendar size={14} className="text-slate-400" />
                Próximos atendimentos
              </div>
              {agendaGroups.highlights.map((a) => (
                <AppointmentMiniRow key={a.id} a={a} isConfirmed={confirmedIds?.has?.(String(a.id))} />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Próximas semanas</div>

            {(showAllWeeks ? agendaGroups.weeks : agendaGroups.weeks.slice(0, 3)).map((w) => (
              <div key={w.key} className="space-y-2">
                <div className="text-xs text-slate-400 font-semibold mt-2">{w.label}</div>
                {w.list.slice(0, agendaView === "compact" ? 5 : 999).map((a) => (
                  <AppointmentMiniRow key={a.id} a={a} isConfirmed={confirmedIds?.has?.(String(a.id))} />
                ))}
                {agendaView === "compact" && w.list.length > 5 && (
                  <div className="text-xs text-slate-400">+ {w.list.length - 5} atendimentos nesta semana</div>
                )}
              </div>
            ))}

            {agendaGroups.weeks.length > 3 && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowAllWeeks((v) => !v)}
                icon={CalendarCheck}
              >
                {showAllWeeks ? "Mostrar menos semanas" : "Mostrar mais semanas"}
              </Button>
            )}
          </div>

          {agendaGroups.months.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Depois</div>

              {(showAllMonths ? agendaGroups.months : agendaGroups.months.slice(0, 2)).map((m) => (
                <div key={m.label} className="space-y-2">
                  <div className="text-xs text-slate-400 font-semibold mt-2">{m.label}</div>
                  {m.list.slice(0, agendaView === "compact" ? 4 : 999).map((a) => (
                    <AppointmentMiniRow key={a.id} a={a} isConfirmed={confirmedIds?.has?.(String(a.id))} />
                  ))}
                  {agendaView === "compact" && m.list.length > 4 && (
                    <div className="text-xs text-slate-400">+ {m.list.length - 4} atendimentos neste mês</div>
                  )}
                </div>
              ))}

              {agendaGroups.months.length > 2 && (
                <Button variant="secondary" className="w-full" onClick={() => setShowAllMonths((v) => !v)}>
                  {showAllMonths ? "Mostrar menos meses" : "Mostrar mais meses"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
