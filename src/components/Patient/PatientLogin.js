import React, { useState } from 'react';
import { devLogin } from '../../services/authService';
import { Mail, AlertTriangle, Loader2, ArrowRight, Lock } from 'lucide-react';

export default function PatientLogin({ onLoginSuccess, onAdminAccess }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, error
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) {
        setStatus('error'); 
        setMessage("Digite um e-mail válido."); 
        return;
    }

    setStatus('loading');
    
    // Chama o login direto (simulado para desenvolvimento)
    const result = await devLogin(email);
    
    if (result.success) {
      onLoginSuccess(result.user);
    } else {
      setStatus('error');
      setMessage(result.error);
      // Reseta status após erro para permitir nova tentativa
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Área do Paciente</h1>
          <p className="text-slate-500 text-sm">Digite seu e-mail para acessar seus agendamentos e anotações.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">E-mail Cadastrado</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 transition-all"
              placeholder="exemplo@email.com"
              disabled={status === 'loading'}
            />
          </div>

          {status === 'error' && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={16} className="flex-shrink-0" />
              {message}
            </div>
          )}

          <button 
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight size={18}/></>}
          </button>
        </form>
        
        {/* BOTÃO DE ACESSO ADMIN - RESTAURADO E VISÍVEL */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <button 
                onClick={onAdminAccess} 
                className="text-xs text-slate-400 hover:text-violet-600 flex items-center justify-center gap-1.5 mx-auto transition-colors py-2 px-4 rounded hover:bg-slate-50"
             >
                <Lock size={12} /> Acesso da Clínica (Admin)
             </button>
        </div>
      </div>
    </div>
  );
}