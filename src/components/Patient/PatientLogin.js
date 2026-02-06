import React, { useState, useEffect } from 'react';
import { sendMagicLink, completeLoginWithLink } from '../../services/authService';
import { Mail, AlertTriangle, Loader2, ArrowRight, Lock } from 'lucide-react';

export default function PatientLogin({ onLoginSuccess, onAdminAccess }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, sending, sent, verifying, error
  const [message, setMessage] = useState('');

  // Verifica se o usuário chegou através do link de e-mail (Magic Link)
  useEffect(() => {
    if (window.location.href.includes('apiKey')) { 
      setStatus('verifying');
      completeLoginWithLink()
        .then((result) => {
          if (result.success) {
            onLoginSuccess(result.user);
          } else {
            setStatus('error');
            setMessage(result.error);
          }
        });
    }
  }, [onLoginSuccess]);

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) {
        setStatus('error'); 
        setMessage("E-mail inválido."); 
        return;
    }

    setStatus('sending');
    const result = await sendMagicLink(email);
    
    if (result.success) {
      setStatus('sent');
    } else {
      setStatus('error');
      setMessage(result.error);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-violet-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Verificando acesso...</h2>
        <p className="text-sm text-slate-500">Estamos validando seu cadastro na clínica.</p>
      </div>
    );
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifique seu E-mail</h2>
        <p className="text-slate-600 max-w-sm mb-6">
          Enviamos um link mágico para <strong>{email}</strong>. 
          <br/>Clique no link enviado para entrar no seu painel.
        </p>
        <button onClick={() => setStatus('idle')} className="text-sm text-slate-400 hover:text-violet-600 underline">Tentar outro e-mail</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Área do Paciente</h1>
          <p className="text-slate-500">Digite seu e-mail cadastrado na recepção para receber o acesso.</p>
        </div>

        <form onSubmit={handleSendLink} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl outline-violet-600 text-slate-900 bg-slate-50 focus:bg-white transition-all"
              placeholder="exemplo@email.com"
              disabled={status === 'sending'}
            />
          </div>

          {status === 'error' && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle size={16} />
              {message}
            </div>
          )}

          <button 
            type="submit"
            disabled={status === 'sending'}
            className="w-full bg-violet-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {status === 'sending' ? <Loader2 className="animate-spin" /> : <>Enviar Link de Acesso <ArrowRight size={18}/></>}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <button 
                onClick={onAdminAccess} 
                className="text-xs text-slate-400 hover:text-violet-600 flex items-center justify-center gap-1 mx-auto transition-colors"
             >
                <Lock size={12} /> Acesso da Clínica (Admin)
             </button>
        </div>
      </div>
    </div>
  );
}