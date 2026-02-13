"use client";

import React from "react";
import { Button, Card } from "../../../components/DesignSystem";
import { BriefcaseMedical, CalendarCheck, MapPin, MessageCircle } from "lucide-react";
import { brDateParts } from "../lib/dates";
import { chipClass } from "../lib/appointments";

export default function NextSessionCard({
  nextAppointment,
  nextLabel,
  nextStatusChip,
  nextServiceLabel,
  nextPlaceLabel,
  nextMeta,
  confirmBusy,
  confirmedLoading,
  onConfirmPresence,
}) {
  return (
    <Card title="Seu próximo atendimento" className="border-violet-100 ring-1 ring-violet-100/60 bg-gradient-to-b from-violet-50/50 to-white shadow-md shadow-violet-100/30 hover:shadow-lg hover:shadow-violet-100/40">
      {!nextAppointment ? (
        <div className="text-sm text-slate-500">Nenhum atendimento encontrado.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center shrink-0">
                <div className="text-xl font-black text-slate-800 leading-none">
                  {brDateParts(nextAppointment.isoDate || nextAppointment.date).day}
                </div>
                <div className="text-[11px] font-bold text-slate-500 mt-1">
                  {brDateParts(nextAppointment.isoDate || nextAppointment.date).mon}
                </div>
              </div>

              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate flex items-center gap-2 flex-wrap">
                  <span>
                    {brDateParts(nextAppointment.isoDate || nextAppointment.date).label}
                    {nextAppointment.time ? <span className="text-slate-400"> • </span> : null}
                    {nextAppointment.time ? <span className="text-slate-700">{nextAppointment.time}</span> : null}
                  </span>

                  {nextLabel ? (
                    <span
                      className={`text-[11px] px-2 py-1 rounded-full border font-semibold ${chipClass(nextLabel.style)}`}
                    >
                      {nextLabel.text}
                    </span>
                  ) : null}

                  {nextStatusChip ? (
                    <span className={`text-[11px] px-2 py-1 rounded-full border font-semibold ${nextStatusChip.cls}`}>
                      {nextStatusChip.text}
                    </span>
                  ) : null}
                </div>

                <div className="text-sm text-slate-500 truncate flex items-center gap-2">
                  {nextServiceLabel ? (
                    <span className="inline-flex items-center gap-1">
                      <BriefcaseMedical size={14} className="text-slate-400" />
                      <b className="text-slate-700">{nextServiceLabel}</b>
                    </span>
                  ) : (
                    <span>
                      Profissional: <b className="text-slate-700">{nextAppointment.profissional || "Não informado"}</b>
                    </span>
                  )}

                  {nextPlaceLabel ? (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="text-slate-600">{nextPlaceLabel}</span>
                      </span>
                    </>
                  ) : null}
                </div>

                {nextServiceLabel ? (
                  <div className="text-[12px] text-slate-500 truncate">
                    Profissional: <b className="text-slate-700">{nextAppointment.profissional || "Não informado"}</b>
                  </div>
                ) : null}

                {confirmedLoading ? <div className="text-[11px] text-slate-400 mt-1">Atualizando confirmações…</div> : null}
              </div>
            </div>

            <div className="shrink-0">
              {nextMeta?.ics ? (
                <Button as="a" href={nextMeta.ics} download={"proximo_atendimento.ics"} variant="secondary" icon={CalendarCheck}>
                  Calendário
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {nextMeta?.wa && !nextMeta?.waDisabled ? (
              <Button onClick={onConfirmPresence} disabled={confirmBusy} icon={MessageCircle} className="w-full">
                {confirmBusy ? "Registrando..." : "Confirmar presença no WhatsApp"}
              </Button>
            ) : (
              <Button disabled variant="secondary" icon={MessageCircle} className="w-full">
                WhatsApp não configurado (admin)
              </Button>
            )}
          </div>

          <div className="text-[12px] text-slate-500 leading-snug">
            Este botão é apenas para <b>confirmar presença</b>. Reagendamentos são tratados diretamente com a clínica.
            <div className="text-[11px] text-slate-400 mt-1">
              A constância sustenta seu processo — faltar quebra a sequência que você está construindo.
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
