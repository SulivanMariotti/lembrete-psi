import React from 'react';
import { Button, Card } from '../DesignSystem';

export default function AdminConfigTab({
  localConfig,
  setLocalConfig,
  saveConfig,
  isSaving,
}) {
  return (
    <Card title="Configurações do Sistema" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8 max-w-2xl mx-auto py-4 overflow-y-auto h-full pr-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  WhatsApp da Clínica
                </label>
                <input
                  value={localConfig.whatsapp}
                  onChange={(e) => setLocalConfig({ ...localConfig, whatsapp: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-200 transition-all"
                  placeholder="5511..."
                />
                <p className="text-xs text-slate-400 mt-2">Usado para o botão de contato no painel do paciente.</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between mb-3 items-center">
                  <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                    Contrato Terapêutico
                  </label>
                  <span className="text-xs bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500 font-mono">
                    v{localConfig.contractVersion}
                  </span>
                </div>
                <textarea
                  value={localConfig.contractText}
                  onChange={(e) => setLocalConfig({ ...localConfig, contractText: e.target.value })}
                  className="w-full p-4 border border-slate-200 rounded-xl h-40 text-slate-700 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-violet-200 outline-none"
                  placeholder="Escreva os termos aqui."
                />
                <div className="flex gap-3 mt-4">
                  <Button onClick={() => saveConfig(false)} disabled={isSaving} variant="secondary" className="flex-1 text-xs">
                    Salvar Rascunho
                  </Button>
                  <Button onClick={() => saveConfig(true)} disabled={isSaving} className="flex-1 text-xs shadow-none">
                    Publicar Nova Versão
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  * Publicar uma nova versão exigirá novo aceite de todos os pacientes.
                </p>
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-center">
                  Modelos de Mensagem
                </h4>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-600 mb-3">
                    Defina quantas <b>horas antes</b> cada mensagem será considerada “pendente” para disparo.
                    (Mantemos 3 lembretes por consistência terapêutica.)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">Mensagem {idx + 1}</span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={(localConfig.reminderOffsetsHours || [48, 24, 12])[idx]}
                          onChange={(e) => {
                            const v = Number(e.target.value || 0);
                            const current = Array.isArray(localConfig.reminderOffsetsHours)
                              ? [...localConfig.reminderOffsetsHours]
                              : [48, 24, 12];
                            current[idx] = v;
                            setLocalConfig({ ...localConfig, reminderOffsetsHours: current });
                          }}
                          className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-violet-200 transition-all"
                          placeholder="Horas"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {['msg1', 'msg2', 'msg3'].map((key) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{key}</label>
                    <textarea
                      value={localConfig[key]}
                      onChange={(e) => setLocalConfig({ ...localConfig, [key]: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl h-24 text-slate-700 text-sm resize-none focus:ring-2 focus:ring-violet-200 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100">
                <Button onClick={() => saveConfig(false)} disabled={isSaving} className="w-full py-4 text-lg shadow-xl">
                  Salvar Todas as Configurações
                </Button>
              </div>
            </div>
          </Card>
  );
}
