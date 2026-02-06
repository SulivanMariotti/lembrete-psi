import React, { useState, useEffect } from 'react';
import { db, messaging } from '../../app/firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { Smartphone, Bell, Lock, KeyRound, User, LogOut, CheckCircle, Info, StickyNote, Trash2, Shield, ScrollText, FileSignature, X, MessageCircle, HeartPulse, LifeBuoy, Calendar, Activity, Loader2, Lightbulb, BookOpen, ChevronRight } from 'lucide-react';
import { Button, Toast } from '../DesignSystem';
import { hashPin, formatPhone, getDayName } from '../../services/dataService';

// --- BASE DE CONHECIMENTO (CARDS) ---
const EDUCATION_CARDS = [
  { id: 1, title: "O que é constância terapêutica?", content: "A terapia é um processo contínuo.\n\nA presença regular ajuda a manter o vínculo, o ritmo e a profundidade do trabalho terapêutico.\n\nConstância não é perfeição. É continuidade." },
  { id: 2, title: "Por que a constância é tão importante?", content: "Cada sessão se conecta com a anterior.\n\nQuando há constância, o processo avança com mais clareza e segurança.\n\nA evolução acontece no conjunto, não em encontros isolados." },
  { id: 3, title: "O que acontece quando falto?", content: "Uma ausência pode interromper o fluxo do processo terapêutico.\n\nRetomar é possível, mas exige um tempo de readaptação.\n\nPor isso, estar presente faz toda a diferença." },
  { id: 4, title: "Estar presente em dias difíceis", content: "Nem todos os dias são bons — e tudo bem.\n\nA sessão não precisa ser perfeita para ser importante.\n\nMuitas vezes, é justamente nos dias difíceis que a terapia mais ajuda." },
  { id: 5, title: "Terapia não é só falar", content: "Às vezes a sessão é silenciosa. Às vezes é confusa. Às vezes parece não render.\n\nAinda assim, ela faz parte do processo.\n\nNem todo avanço é visível no momento." },
  { id: 6, title: "Como aproveitar melhor a sessão", content: "Você pode:\n• Observar pensamentos ao longo da semana\n• Anotar algo que queira lembrar\n• Chegar como estiver, sem preparo especial\n\nNão existe “jeito certo” de fazer terapia." },
  { id: 7, title: "O compromisso com a sessão", content: "A sessão é um compromisso com você mesmo.\n\nEla reserva um tempo para cuidado, reflexão e presença.\n\nManter esse compromisso ajuda a fortalecer o processo terapêutico." },
  { id: 8, title: "Quando parece que nada acontece", content: "É comum sentir que a terapia está “parada”.\n\nIsso não significa que ela não esteja funcionando.\n\nAlguns processos acontecem de forma silenciosa e gradual, como uma semente germinando." },
  { id: 9, title: "A importância da regularidade", content: "A regularidade cria segurança.\n\nEla permite que o processo se desenvolva com mais profundidade e continuidade.\n\nPequenos encontros frequentes constroem grandes mudanças ao longo do tempo." },
  { id: 10, title: "A terapia é um processo", content: "A terapia não é um evento pontual.\n\nEla é um caminho construído passo a passo.\n\nCada sessão é uma parte fundamental desse percurso." },
  { id: 11, title: "Presença como forma de cuidado", content: "Estar presente é uma forma de cuidado consigo mesmo.\n\nMesmo quando não há vontade, a presença mantém o espaço aberto para o processo.\n\nCuidar também é continuar." },
  { id: 12, title: "Constância não é cobrança", content: "Constância não é rigidez. Não é culpa. Não é punição.\n\nÉ um convite contínuo ao cuidado e ao compromisso com o próprio processo de cura." }
];

export default function PatientFlow({ onAdminAccess, globalConfig }) {
  const [view, setView] = useState('landing');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [authStep, setAuthStep] = useState('phone');
  const [tempUser, setTempUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });
  
  const [myApps, setMyAppointments] = useState([]);
  const [myNotes, setMyNotes] = useState([]);
  const [showContract, setShowContract] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false); 
  
  const [newPin, setNewPin] = useState('');
  const [noteContent, setNoteContent] = useState('');
  
  // Card do Dia (Aleatório)
  const [dailyCard, setDailyCard] = useState(null);

  const config = globalConfig || {};

  const showToast = (msg, type) => setToast({ msg, type });

  useEffect(() => {
    const savedPhone = localStorage.getItem('psi_user_phone');
    if (savedPhone) {
        setPhone(formatPhone(savedPhone));
    }
    // Selecionar um card aleatório para destaque inicial se necessário
    // mas vamos usar a lista completa no carrossel.
  }, []);

  const fetchAgenda = async (rawPhone) => {
      const q = query(collection(db, "appointments"), where("phone", "==", rawPhone));
      const snap = await getDocs(q);
      const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const today = new Date().toISOString().split('T')[0];
      setMyAppointments(apps.filter(a => a.isoDate >= today).sort((a,b) => a.isoDate.localeCompare(b.isoDate)));
  };

  const subscribeNotes = (rawPhone) => {
      const q = query(collection(db, "patient_notes"), where("phone", "==", rawPhone));
      return onSnapshot(q, (snap) => setMyNotes(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  };

  const handleCheckPhone = async () => {
      const raw = phone.replace(/\D/g, '');
      if (raw.length < 10) return showToast("Telefone inválido", "error");
      setLoading(true);
      const q = query(collection(db, "users"), where("phone", "==", raw));
      const snap = await getDocs(q);
      if (!snap.empty) {
          const user = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setTempUser(user);
          setAuthStep(user.pin ? 'verify' : 'create');
      } else {
          setAuthStep('create');
      }
      setLoading(false);
  };

  const handleAuth = async () => {
      if (pin.length < 4) return;
      setLoading(true);
      const raw = phone.replace(/\D/g, '');
      try {
        const hashed = await hashPin(pin);
        if (authStep === 'verify') {
             const isValid = tempUser.pin === hashed || tempUser.pin === pin;
             if (!isValid) throw new Error("Senha incorreta");
             if (tempUser.pin === pin && tempUser.pin !== hashed) updateDoc(doc(db, "users", tempUser.id), { pin: hashed });
             await finalizeLogin(raw, tempUser.id, tempUser);
        } else {
             let token = null;
             try { if(messaging) token = await getToken(messaging, { vapidKey: 'BDYKoBDPNh4Q0SoSaY7oSXGz2fgVqGkJZWRgCMMeryqj-Jk7_csF0oJapZWhkSa9SEjgfYf6x3thWNZ4QttknZM' }); } catch(e){}
             let uid = tempUser?.id;
             if(uid) {
                 await updateDoc(doc(db, "users", uid), { pin: hashed, pushToken: token, lastSeen: new Date() });
             } else {
                 const ref = await addDoc(collection(db, "users"), { phone: raw, pin: hashed, pushToken: token, createdAt: new Date(), lastSeen: new Date() });
                 uid = ref.id;
             }
             await finalizeLogin(raw, uid, { acceptedTermsVersion: 0 });
        }
      } catch (e) {
          showToast(e.message, "error");
          setLoading(false);
      }
  };

  const finalizeLogin = async (raw, uid, userData) => {
      localStorage.setItem('psi_user_phone', raw);
      await fetchAgenda(raw);
      subscribeNotes(raw);
      setCurrentUser(userData);
      
      if (!userData.acceptedTermsVersion || userData.acceptedTermsVersion < (config.contractVersion || 1)) {
          setShowContract(true);
      }
      setView('dashboard');
      setLoading(false);
  };

  const handleAcceptContract = async () => {
      if(currentUser) {
          await updateDoc(doc(db, "users", currentUser.id), { acceptedTermsVersion: config.contractVersion || 1 });
          setShowContract(false);
      }
  };
  
  const handleSaveNote = async () => {
      if(!noteContent.trim()) return;
      const raw = phone.replace(/\D/g, '');
      await addDoc(collection(db, "patient_notes"), { phone: raw, content: noteContent, createdAt: new Date() });
      setNoteContent('');
      showToast("Nota salva!");
  };

  const handleDeleteNote = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "patient_notes", id)); };
  
  const handleLogout = () => { 
    localStorage.removeItem('psi_user_phone'); 
    setPhone(''); 
    setPin(''); 
    setAuthStep('phone'); 
    setView('landing'); 
  };

  const handleChangePin = async () => {
      if(newPin.length < 4) return showToast("Mínimo 4 dígitos", "error");
      showToast("Funcionalidade requer re-login para segurança.", "error"); 
      setShowProfile(false);
  };

  // --- Renderização ---
  if (view === 'landing') {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50">
               {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({})} />}
               <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg space-y-6 relative">
                   <div className="w-16 h-16 bg-violet-600 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-violet-200">
                       <Bell className="text-white w-8 h-8"/>
                   </div>
                   
                   <div>
                        <h1 className="text-2xl font-bold text-slate-900">Lembrete Psi</h1>
                        <p className="text-slate-500 mt-2">Nunca mais esqueça o horário da sua terapia.</p>
                   </div>
                   
                   <div className="bg-violet-50 p-4 rounded-lg border border-violet-100 text-xs text-violet-800 leading-relaxed text-left">
                        <p className="font-bold flex items-center gap-2 mb-2 justify-center text-sm"><HeartPulse size={16}/> Importante</p>
                        A constância é o segredo da evolução. Faltas frequentes podem prejudicar seu progresso terapêutico.
                   </div>
                   
                   <div className="space-y-3">
                        <Button onClick={() => setView('form')} icon={Smartphone} className="w-full">Acessar Meu Painel</Button>
                        <p className="text-xs text-slate-400">Funciona direto no navegador.</p>
                   </div>

                   <div className="pt-4 border-t border-slate-100">
                       <button onClick={onAdminAccess} className="text-sm text-slate-400 hover:text-violet-600 underline block mx-auto">Acesso da Clínica (Admin)</button>
                   </div>
               </div>
          </div>
      );
  }

  if (view === 'form') {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white">
              {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({})} />}
              <div className="w-full max-w-md space-y-6">
                  {authStep === 'phone' ? (
                      <>
                        <h2 className="text-2xl font-bold text-slate-900">Qual seu número?</h2>
                        <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className="w-full text-2xl p-4 border rounded-xl outline-violet-600 text-slate-900" placeholder="(11) 99999-9999" />
                        <Button onClick={handleCheckPhone} disabled={loading} className="w-full">{loading ? "Verificando..." : "Continuar"}</Button>
                      </>
                  ) : (
                      <>
                        <h2 className="text-2xl font-bold text-slate-900">{authStep === 'create' ? 'Crie sua Senha' : 'Digite sua Senha'}</h2>
                        <input type="tel" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} className="w-full text-center text-4xl p-4 border rounded-xl tracking-[0.5em] text-slate-900 outline-violet-600" placeholder="****" />
                        <Button onClick={handleAuth} disabled={loading} className="w-full">{loading ? "Entrando..." : "Entrar"}</Button>
                        <button onClick={() => setAuthStep('phone')} className="text-sm text-slate-400 block mx-auto mt-4">Voltar</button>
                      </>
                  )}
              </div>
          </div>
      );
  }

  // Dashboard do Paciente
  const nextApp = myApps[0];
  const recurrenceText = nextApp ? `Toda ${getDayName(nextApp.date)} às ${nextApp.time}` : "Aguardando agendamento";

  return (
      <div className="min-h-screen bg-violet-50 p-6 flex flex-col">
          {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({})} />}
          
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full shadow-sm"><User className="text-violet-600"/></div>
                  <div><h2 className="font-bold text-slate-800">Meu Espaço</h2><p className="text-xs text-slate-500">Bem-vindo</p></div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setShowLibrary(true)} className="bg-indigo-500 p-2 rounded-full text-white shadow hover:bg-indigo-600 transition" title="Biblioteca"><BookOpen size={18}/></button>
                 <button onClick={() => setShowContract(true)} className="bg-violet-100 p-2 rounded-full text-violet-600 shadow hover:bg-violet-200 transition"><ScrollText size={18}/></button>
                 <button onClick={() => setShowSOS(true)} className="bg-rose-500 p-2 rounded-full text-white shadow hover:bg-rose-600 transition"><LifeBuoy size={18}/></button>
                 <button onClick={handleLogout} className="bg-white p-2 rounded-full text-slate-400 shadow hover:text-slate-600 transition"><LogOut size={18}/></button>
              </div>
          </div>

          {/* CARROSSEL DE EDUCAÇÃO + CONSTÂNCIA (Estilo Instagram) */}
          <div className="mb-6 overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory flex gap-4 hide-scrollbar">
               
               {/* Card 1: Constância (Fixo) */}
               <div className="min-w-[85%] bg-white p-5 rounded-2xl shadow-sm border-l-4 border-violet-500 snap-center flex flex-col justify-center relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="bg-violet-100 p-2 rounded-full"><Activity size={20} className="text-violet-600" /></div>
                        <h4 className="font-bold text-slate-800 text-sm">O segredo é a constância</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed relative z-10">
                        Lembre-se: cada sessão é um passo importante. Faltas podem interromper seu progresso. Priorize seu horário!
                    </p>
                    <div className="absolute right-0 top-0 opacity-5 text-violet-500"><HeartPulse size={100}/></div>
               </div>

               {/* Cards Educativos */}
               {EDUCATION_CARDS.map(card => (
                   <div key={card.id} className="min-w-[85%] bg-indigo-50 p-5 rounded-2xl border border-indigo-100 snap-center flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 text-indigo-700">
                                <Lightbulb size={18} />
                                <h4 className="font-bold text-sm truncate pr-4">{card.title}</h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                                {card.content}
                            </p>
                        </div>
                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-indigo-600"><BookOpen size={80}/></div>
                   </div>
               ))}
          </div>

          {/* Card Recorrência */}
          {nextApp ? (
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-xl p-6 mb-6 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-violet-100 text-xs font-medium uppercase tracking-wider mb-1">Seu Horário Fixo</p>
                    <h3 className="text-2xl font-bold mb-2">{recurrenceText}</h3>
                    <div className="flex items-center gap-2 text-sm opacity-90"><User size={16}/> <span>{nextApp.professional || 'Psicoterapia'}</span></div>
                </div>
                <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            </div>
          ) : (
             <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-center text-slate-500 border border-slate-200">
                <Calendar className="mx-auto mb-2 opacity-20" size={32}/>
                Nenhum horário fixo identificado.
             </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-6 flex gap-3">
              <Info className="text-amber-600 w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                  Este horário é válido como sessão semanal recorrente. Alterações devem ser combinadas previamente com a clínica.
              </p>
          </div>

          {/* ANOTAÇÕES */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><StickyNote className="text-violet-600"/> Anotações para a Terapia</h3>
             <p className="text-xs text-slate-500 mb-4">Lembrete de algo para falar ou para o responsável informar ao profissional.</p>
             <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} className="w-full p-3 border rounded-lg text-sm mb-3 h-20 resize-none text-slate-900 focus:ring-2 focus:ring-violet-200 outline-none" placeholder="Escreva aqui..." />
             <Button onClick={handleSaveNote} className="w-full text-sm">Salvar Anotação</Button>
             {myNotes.length > 0 && (
                 <div className="mt-4 space-y-2">
                     {myNotes.map(n => (
                         <div key={n.id} className="bg-slate-50 p-3 rounded border border-slate-100 text-sm text-slate-700 flex justify-between relative group hover:bg-white hover:shadow-sm transition-all">
                             <span className="whitespace-pre-wrap">{n.content}</span>
                             <button onClick={() => handleDeleteNote(n.id)} className="text-slate-300 hover:text-red-500 pl-2"><Trash2 size={14}/></button>
                         </div>
                     ))}
                 </div>
             )}
          </div>

          {/* Lista de Sessões */}
          <div className="flex-1 overflow-y-auto pb-4">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase text-slate-500">
                  <Calendar size={16}/> Datas Confirmadas
              </h3>
              {myApps.length > 0 ? (
                  <div className="space-y-3">
                      {myApps.map(app => (
                          <div key={app.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                              <div className="bg-slate-100 text-slate-600 w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                                  <span className="font-bold text-sm">{app.date.split('/')[0]}</span>
                                  <span className="text-[9px] uppercase">{new Date(app.isoDate).toLocaleString('pt-BR', { month: 'short' }).replace('.','')}</span>
                              </div>
                              <div>
                                  <p className="font-bold text-slate-700 text-sm">Sessão Agendada</p>
                                  <p className="text-xs text-slate-500">{app.date} às {app.time}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-4 text-slate-400 text-xs">
                      Nenhuma data específica carregada.
                  </div>
              )}
          </div>

          {/* --- MODAIS --- */}
          
          {/* 1. BIBLIOTECA (Grade Completa) */}
          {showLibrary && (
              <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-xl w-full max-w-md h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                      <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                          <h3 className="font-bold flex items-center gap-2"><BookOpen size={20}/> Biblioteca Terapêutica</h3>
                          <button onClick={() => setShowLibrary(false)}><X size={20} className="hover:text-indigo-200"/></button>
                      </div>
                      <div className="p-4 overflow-y-auto space-y-4 bg-slate-50 flex-1">
                          {EDUCATION_CARDS.map(card => (
                              <div key={card.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                  <h4 className="font-bold text-indigo-700 mb-2">{card.title}</h4>
                                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{card.content}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* 2. SOS */}
          {showSOS && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
                      <div className="bg-rose-500 p-4 text-white flex justify-between items-center">
                          <h3 className="font-bold flex items-center gap-2"><LifeBuoy size={20}/> Apoio Emocional</h3>
                          <button onClick={() => setShowSOS(false)}><X size={20} className="hover:text-rose-100"/></button>
                      </div>
                      <div className="p-6 space-y-4">
                          <p className="text-sm text-slate-600 text-center mb-2">Se você está passando por um momento difícil, não hesite em pedir ajuda.</p>
                          
                          <a href="tel:188" className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors">
                              <div className="flex flex-col">
                                  <span className="font-bold text-rose-700 text-lg">Ligar 188</span>
                                  <span className="text-xs text-rose-500">CVV - Centro de Valorização da Vida</span>
                              </div>
                              <Smartphone size={24} className="text-rose-500" />
                          </a>
                          
                          <div className="border-t border-slate-100 pt-4 mt-2">
                               <p className="text-xs text-slate-500 text-center mb-3">Contato da Clínica</p>
                               <a 
                                  href={`https://wa.me/${config.whatsapp || '551141163129'}`}
                                  target="_blank"
                                  className="w-full bg-green-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors font-medium"
                               >
                                   <MessageCircle size={18} /> Chamar no WhatsApp
                               </a>
                          </div>
                      </div>
                  </div>
              </div>
          )}
          
          {/* 3. CONTRATO */}
          {showContract && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-xl w-full max-w-sm overflow-hidden h-[80vh] flex flex-col"><div className="bg-violet-600 p-4 text-white"><h3 className="font-bold">Termos e Combinados</h3></div><div className="p-6 overflow-y-auto flex-1 whitespace-pre-wrap text-sm text-slate-700">{config.contractText || "Carregando termos..."}</div><div className="p-4 border-t"><Button onClick={handleAcceptContract} variant="success">Li e Aceito</Button></div></div></div>}

          {/* 4. PERFIL */}
          {showProfile && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-xl w-full max-w-sm"><h3 className="font-bold mb-4 text-slate-800">Alterar Senha</h3><input placeholder="Novo PIN" value={newPin} onChange={e=>setNewPin(e.target.value)} className="w-full p-3 border rounded mb-4 text-slate-900"/><Button onClick={handleChangePin}>Confirmar</Button><button onClick={()=>setShowProfile(false)} className="block w-full text-center mt-3 text-sm text-slate-400">Cancelar</button></div></div>}

          <a href={`https://wa.me/${config.whatsapp || '551141163129'}`} target="_blank" className="fixed bottom-6 right-6 bg-green-500 text-white p-3 rounded-full shadow-lg z-40"><MessageCircle size={28}/></a>
      </div>
  );
}