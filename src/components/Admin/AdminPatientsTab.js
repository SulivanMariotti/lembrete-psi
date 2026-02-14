import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, UserPlus, UserMinus, X, Flag, Bell, BellOff, CheckCircle, XCircle, FileText, KeyRound, Copy, Loader2 } from 'lucide-react';
import { Button, Card } from '../DesignSystem';

/**
 * AdminPatientsTab
 * - Lista pacientes via rota server-side (Admin SDK): POST /api/admin/patients/list
 * - Edita / cria via POST /api/admin/patient/register
 * - Desativa via POST /api/admin/patient/delete (soft delete)
 *
 * FIX URGENTE (desativação):
 * - Agora SEMPRE envia uid (docId real em users/{uid}) + patientExternalId quando existir,
 *   para o endpoint não criar um doc "p_base64(email)" e sim atualizar o doc correto.
 */

export default function AdminPatientsTab({ showToast, globalConfig }) {
  const [searchTerm, setSearchTerm] = useState('');

  const currentContractVersion = Number(globalConfig?.contractVersion || 1);

  // --- UI helpers (flags) ---
  const IndicatorPill = ({ kind, ok, label, title }) => {
    const base =
      'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border w-fit whitespace-nowrap';

    const palette = (() => {
      if (kind === 'status') {
        return ok
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
          : 'bg-red-50 text-red-700 border-red-100';
      }

      if (kind === 'contract') {
        return ok
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
          : 'bg-amber-50 text-amber-700 border-amber-100';
      }

      // kind === 'push'
      return ok
        ? 'bg-violet-50 text-violet-700 border-violet-100'
        : 'bg-amber-50 text-amber-700 border-amber-100';
    })();

    const Icon = (() => {
      if (kind === 'status') return ok ? CheckCircle : XCircle;
      if (kind === 'contract') return FileText;
      return ok ? Bell : BellOff; // push
    })();

    return (
      <span className={`${base} ${palette}`} title={title || ''}>
        <Flag size={14} />
        <Icon size={14} />
        <span>{label}</span>
      </span>
    );
  };

  const PairCodePill = ({ status, last4, createdAt, usedAt }) => {
    const s = String(status || '').toLowerCase();

    const base =
      'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border w-fit whitespace-nowrap';

    const palette = (() => {
      if (!s) return 'bg-slate-50 text-slate-700 border-slate-100';
      if (s === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      if (s === 'used') return 'bg-amber-50 text-amber-800 border-amber-100';
      if (s === 'revoked') return 'bg-red-50 text-red-700 border-red-100';
      return 'bg-slate-50 text-slate-700 border-slate-100';
    })();

    const mask = last4 ? `••••${last4}` : '—';

    const label = (() => {
      if (!s) return 'Sem código';
      if (s === 'active') return `Código ativo ${mask}`;
      if (s === 'used') return `Código usado ${mask}`;
      if (s === 'revoked') return `Código revogado ${mask}`;
      return `Código ${s} ${mask}`;
    })();

    const titleParts = [];
    if (s) titleParts.push(`Status: ${s}`);
    if (createdAt) titleParts.push(`Criado: ${createdAt}`);
    if (usedAt) titleParts.push(`Usado: ${usedAt}`);
    titleParts.push('Se o paciente trocar de aparelho ou perder o acesso, gere um novo código.');

    return (
      <span className={`${base} ${palette}`} title={titleParts.join(' • ')}>
        <Flag size={14} />
        <KeyRound size={14} />
        <span>{label}</span>
      </span>
    );
  };

  // Lista de pacientes carregada do servidor (Admin SDK)
  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  // Estado para cadastro/edição
  const [newPatient, setNewPatient] = useState({ name: '', email: '', phone: '', patientExternalId: '' });
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  // Código de Vinculação (pareamento do aparelho)
  const [showPairCodeModal, setShowPairCodeModal] = useState(false);
  const [pairCodeValue, setPairCodeValue] = useState('');
  const [pairCodePatient, setPairCodePatient] = useState(null);
  const [pairCodeLoadingUid, setPairCodeLoadingUid] = useState(null);


  const adminSecret = useMemo(() => process.env.NEXT_PUBLIC_ADMIN_PANEL_SECRET || '', []);

  const closePatientModal = () => {
    setShowUserModal(false);
    setEditingPatient(null);
    setNewPatient({ name: '', email: '', phone: '', patientExternalId: '' });
  };

  const closePairCodeModal = () => {
    setShowPairCodeModal(false);
    setPairCodeValue('');
    setPairCodePatient(null);
  };

  const copyPairCode = async () => {
    try {
      if (!pairCodeValue) return;
      await navigator.clipboard.writeText(pairCodeValue);
      showToast?.('Código copiado.', 'success');
    } catch (e) {
      console.error(e);
      showToast?.('Não foi possível copiar automaticamente. Selecione e copie manualmente.', 'error');
    }
  };

  const handleGeneratePairCode = async (u) => {
    const uid = u?.uid || u?.id;
    if (!uid) {
      showToast?.('Paciente sem uid. Atualize a lista.', 'error');
      return;
    }

    setPairCodeLoadingUid(uid);
    try {
      const res = await fetch('/api/admin/patient/pair-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ uid }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.pairCode) {
        throw new Error(data?.error || 'Falha ao gerar código.');
      }

      setPairCodePatient(u);
      setPairCodeValue(String(data.pairCode));
      setShowPairCodeModal(true);

      showToast?.('Código gerado. Copie e envie ao paciente.', 'success');
    } catch (e) {
      console.error(e);
      showToast?.(e?.message || 'Falha ao gerar código.', 'error');
    } finally {
      setPairCodeLoadingUid(null);
    }
  };


  const loadPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const res = await fetch('/api/admin/patients/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          limit: 2000,
          includePush: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Falha ao carregar pacientes.');
      }
      setPatients(Array.isArray(data.patients) ? data.patients : []);
    } catch (e) {
      console.error('loadPatients failed', e);
      showToast?.(e?.message || 'Falha ao carregar pacientes.', 'error');
    } finally {
      setIsLoadingPatients(false);
    }
  };

  useEffect(() => {
    if (!adminSecret) {
      showToast?.('Falta configurar NEXT_PUBLIC_ADMIN_PANEL_SECRET (admin).', 'error');
      return;
    }
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNewPatientModal = () => {
    setEditingPatient(null);
    setNewPatient({ name: '', email: '', phone: '', patientExternalId: '' });
    setShowUserModal(true);
  };

  const openEditPatientModal = async (u) => {
    const prevEmail = String(u?.email || '').trim();
    const prevPhone = String(u?.phoneCanonical || u?.phone || '').trim();

    setEditingPatient({
      ...u,
      previousEmail: prevEmail,
      previousPhoneCanonical: prevPhone,
    });

    setNewPatient({
      name: String(u?.name || u?.nome || '').trim(),
      email: prevEmail,
      phone: prevPhone,
      patientExternalId: String(u?.patientExternalId || '').trim(),
    });

    setShowUserModal(true);
  };

  const handleRegisterPatient = async () => {
    if (!newPatient.email || !newPatient.name || !newPatient.phone) {
      return showToast?.('Preencha todos os campos.', 'error');
    }
    if (!adminSecret) {
      return showToast?.('Falta configurar NEXT_PUBLIC_ADMIN_PANEL_SECRET (admin).', 'error');
    }

    try {
      const payload = {
        name: newPatient.name.trim(),
        email: newPatient.email.trim().toLowerCase(),
        phone: String(newPatient.phone || '').trim(),
        patientExternalId: String(newPatient.patientExternalId || '').trim(),
        ...(editingPatient?.previousPhoneCanonical ? { previousPhoneCanonical: editingPatient.previousPhoneCanonical } : {}),
        ...(editingPatient?.previousEmail ? { previousEmail: editingPatient.previousEmail } : {}),
      };

      const res = await fetch('/api/admin/patient/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        return showToast?.(data?.error || 'Erro ao salvar paciente.', 'error');
      }

      showToast?.(editingPatient ? 'Paciente atualizado com sucesso!' : 'Paciente cadastrado com sucesso!');
      await loadPatients();
      closePatientModal();
    } catch (e) {
      console.error(e);
      showToast?.('Erro ao salvar paciente.', 'error');
    }
  };

  const handleRemovePatient = async (u) => {
    try {
      if (!adminSecret) {
        return showToast?.('Falta configurar NEXT_PUBLIC_ADMIN_PANEL_SECRET (admin).', 'error');
      }

      // IMPORTANT: enviar UID real do doc, para atualizar o registro correto no Firestore
      const uid = String(u?.uid || u?.id || '').trim(); // backend usa docId real
      const patientExternalId = String(u?.patientExternalId || '').trim() || null;
      const phoneCanonical = String(u?.phoneCanonical || u?.phone || '').trim();
      const email = String(u?.email || '').trim().toLowerCase();

      if (!uid && !phoneCanonical && !email && !patientExternalId) {
        return showToast?.('Paciente inválido (sem uid/email/telefone/id externo).', 'error');
      }

      const res = await fetch('/api/admin/patient/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          uid: uid || undefined,
          patientExternalId: patientExternalId || undefined,
          phoneCanonical: phoneCanonical || undefined,
          email: email || undefined,
          reason: 'admin_ui_remove',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        showToast?.(data?.error || 'Erro ao remover paciente.', 'error');
        return;
      }

      showToast?.('Paciente desativado.');
      await loadPatients();
    } catch (e) {
      console.error(e);
      showToast?.('Erro ao remover paciente.', 'error');
    }
  };

  const filteredPatients = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return patients;

    return patients.filter((p) => {
      const name = String(p?.name || '').toLowerCase();
      const email = String(p?.email || '').toLowerCase();
      const phone = String(p?.phoneCanonical || p?.phone || '').toLowerCase();
      const ext = String(p?.patientExternalId || '').toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term) || ext.includes(term);
    });
  }, [patients, searchTerm]);

  const exportCSV = () => {
    try {
      const headers = ['Nome', 'Email', 'Telefone', 'ID (externo)', 'Push', 'Cadastro', 'Contrato', 'Código'];
      const rows = filteredPatients.map((p) => [
        String(p?.name || ''),
        String(p?.email || ''),
        String(p?.phoneCanonical || p?.phone || ''),
        String(p?.patientExternalId || ''),
        p?.hasPushToken ? 'SIM' : 'NAO',
        String(p?.status || ''),
        Number(p?.contractAcceptedVersion || 0) >= Number(globalConfig?.contractVersion || 1) ? 'ACEITO' : 'PENDENTE',
        String(p?.pairCodeStatus || ''),
      ]);

      const csv = [headers, ...rows]
        .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pacientes_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      showToast?.('Falha ao exportar CSV.', 'error');
    }
  };

  const isEditMode = Boolean(editingPatient);

  return (
    <div>
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Search size={18} />
            <input
              className="border rounded px-3 py-2 w-full md:w-[360px]"
              placeholder="Buscar por nome, email, telefone ou ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={exportCSV} variant="secondary">
              <Download size={16} className="mr-2" />
              Exportar
            </Button>
            <Button onClick={openNewPatientModal}>
              <UserPlus size={16} className="mr-2" />
              Novo paciente
            </Button>
          </div>
        </div>

        <div className="mt-3 text-sm opacity-80">
          {isLoadingPatients ? 'Carregando pacientes…' : `Total exibido: ${filteredPatients.length}`}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">Paciente</th>
                <th className="p-3">Email</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Push</th>
                <th className="p-3">Cadastro</th>
                <th className="p-3">Contrato</th>
                <th className="p-3">Código</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td className="p-4 opacity-70" colSpan={8}>
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((u) => (
                  <tr key={u.uid || u.id} className="border-b last:border-b-0">
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{u?.name || '—'}</div>
                      {u?.patientExternalId ? (
                        <div className="text-[11px] text-slate-400 mt-0.5">ID: {u?.patientExternalId}</div>
                      ) : null}
                    </td>
                    <td className="p-3">{u?.email || '—'}</td>
                    <td className="p-3">{u?.phoneCanonical || u?.phone || '—'}</td>
                    <td className="p-3">
                      <IndicatorPill
                        kind="push"
                        ok={Boolean(u?.hasPushToken)}
                        label={u?.hasPushToken ? 'Notificações ativas' : 'Sem notificações'}
                        title={
                          u?.hasPushToken
                            ? 'Este paciente tem Push ativo (token válido em subscribers).' 
                            : 'Sem Push ativo. Oriente o paciente a ativar as notificações neste aparelho.'
                        }
                      />
                    </td>
                    <td className="p-3">
                      <IndicatorPill
                        kind="status"
                        ok={String(u?.status || '').toLowerCase() === 'active'}
                        label={String(u?.status || '').toLowerCase() === 'active' ? 'Cadastro ativo' : 'Cadastro inativo'}
                        title={
                          String(u?.status || '').toLowerCase() === 'active'
                            ? 'Cadastro ativo (pode receber agenda/disparos).'
                            : 'Cadastro inativo/desativado (não deve receber atendimentos/disparos).'
                        }
                      />
                    </td>
                    <td className="p-3">
                      <IndicatorPill
                        kind="contract"
                        ok={Number(u?.contractAcceptedVersion || 0) >= currentContractVersion}
                        label={
                          Number(u?.contractAcceptedVersion || 0) >= currentContractVersion
                            ? 'Contrato aceito'
                            : 'Contrato pendente'
                        }
                        title={`Aceite do contrato: v${Number(u?.contractAcceptedVersion || 0)} • Versão atual: v${currentContractVersion}`}
                      />
                    </td>
                    <td className="p-3">
                      <PairCodePill
                        status={u?.pairCodeStatus}
                        last4={u?.pairCodeLast4}
                        createdAt={u?.pairCodeCreatedAt}
                        usedAt={u?.pairCodeUsedAt}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleGeneratePairCode(u)}
                          disabled={pairCodeLoadingUid === (u.uid || u.id)}
                          title="Gerar novo código de vinculação (troca de aparelho/recuperação de acesso)."
                        >
                          {pairCodeLoadingUid === (u.uid || u.id) ? (
                            <>
                              <Loader2 size={16} className="mr-2 animate-spin" />
                              Gerando
                            </>
                          ) : (
                            <>
                              <KeyRound size={16} className="mr-2" />
                              Código
                            </>
                          )}
                        </Button>
                        <Button variant="secondary" onClick={() => openEditPatientModal(u)}>
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => handleRemovePatient(u)}>
                          <UserMinus size={16} className="mr-2" />
                          Desativar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>


      {showPairCodeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl relative">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Código de Vinculação</h3>
              <button onClick={closePairCodeModal} className="p-2 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="bg-slate-50 border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {pairCodePatient?.name || 'Paciente'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Este código é <b>single-use</b>. Depois de vincular um aparelho, para trocar de dispositivo, gere um novo.
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-right">
                    Entregue ao paciente<br />
                    (preferencialmente em sessão)
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="font-mono text-lg tracking-widest text-slate-900 select-all">
                    {pairCodeValue || '—'}
                  </div>
                  <Button variant="secondary" onClick={copyPairCode}>
                    <Copy size={16} className="mr-2" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-[12px] text-slate-600 leading-snug">
                <b>Mensagem sugerida:</b> “Este é seu acesso ao seu espaço de cuidado. A constância sustenta o processo — guarde este código com atenção.”
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={closePairCodeModal} className="bg-slate-900">
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl relative">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{isEditMode ? 'Editar paciente' : 'Novo paciente'}</h3>
              <button onClick={closePatientModal} className="p-2 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm opacity-80 mb-1">Nome</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Email</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Telefone (DDD+número, sem 55)</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  placeholder="11999999999"
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">ID do seu sistema (patientExternalId)</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={newPatient.patientExternalId}
                  onChange={(e) => setNewPatient({ ...newPatient, patientExternalId: e.target.value })}
                  disabled={isEditMode}
                />
                <div className="text-xs opacity-70 mt-1">Modo: {isEditMode ? 'EDITAR (travado)' : 'NOVO'}</div>
              </div>
            </div>

            <div className="p-5 border-t flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={closePatientModal}>
                Cancelar
              </Button>
              <Button onClick={handleRegisterPatient}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}