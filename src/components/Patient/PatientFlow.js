import React, { useState, useEffect } from 'react';
import { db, messaging } from '../../app/firebase';
import { collection, deleteDoc, updateDoc, doc, query, where, getDocs, onSnapshot, getDoc, addDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { Smartphone, Bell, User, LogOut, CheckCircle, Info, StickyNote, Trash2, Shield, ScrollText, FileSignature, X, MessageCircle, HeartPulse, LifeBuoy, Calendar, Activity, Loader2, Lightbulb, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { Button, Toast } from '../DesignSystem';
import { hashPin, formatPhone, getDayName } from '../../services/dataService';

// --- HELPER SEGURANÇA VISUAL (Evita Crash de Data) ---
const safeFormatDay = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '--';
    const parts = dateString.split('/');
    return parts[0] || '--';
};

const safeFormatMonth = (isoDate) => {
    if (!isoDate) return '';
    try {
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    } catch (e) {
        return '';
    }
};

// --- CONTEÚDO ESTÁTICO (Mantras e Cards) ---
const MANTRAS = [
  "A constância é um dos principais fatores de evolução terapêutica.",
  "Cada sessão conta.",
  "Estar presente também é uma forma de cuidado.",
  "Mesmo em dias difíceis, a presença importa.",
  "Seu processo merece seu tempo.",
  "A continuidade constrói resultados.",
  "Terapia é um compromisso com você mesmo."
];

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

export default function PatientFlow({ user, onLogout, globalConfig }) {
  const [view, setView] = useState('landing');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  const [myApps, setMyAppointments] = useState([]);
  const [myNotes, setMyNotes] = useState([]);
  const [showContract, setShowContract] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false); 
  const [showProfile, setShowProfile] = useState(false);
  const [newPin, setNewPin] = useState('');
  
  const [noteContent, setNoteContent] = useState('');
  const [dailyCard, setDailyCard] = useState(null);
  const [dailyMantra, setDailyMantra] = useState("");

  const config = globalConfig || {};
  const showToast = (msg, type) => setToast({ msg, type });

  // 1. Inicialização
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Mantra e Card (Protegidos)
    try {
        const today = new Date().toDateString();
        let mantraToShow = localStorage.getItem('psi_mantra_text');
        const savedMantraDate = localStorage.getItem('psi_mantra_date');
        
        if (savedMantraDate !== today || !mantraToShow) {
            mantraToShow = MANTRAS[Math.floor(Math.random() * MANTRAS.length)];
            localStorage.setItem('psi_mantra_date', today);
            localStorage.setItem('psi_mantra_text', mantraToShow);
        }
        setDailyMantra(mantraToShow);

        let cardToShow;
        const savedCardDate = localStorage.getItem('psi_daily_card_date');
        const savedCardId = localStorage.getItem('psi_daily_card_id');
        if (savedCardDate === today && savedCardId) {
            cardToShow = EDUCATION_CARDS.find(c => c.id === Number(savedCardId));
        }
        if (!cardToShow) {
            const randomIndex = Math.floor(Math.random() * EDUCATION_CARDS.length);
            cardToShow = EDUCATION_CARDS[randomIndex];
            localStorage.setItem('psi_daily_card_date', today);
            localStorage.setItem('psi_daily_card_id', cardToShow.id);
        }
        setDailyCard(cardToShow);
    } catch (e) {
        console.error("Erro localStorage:", e);
    }

    // Carregar Perfil
    const loadUserProfile = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userPhone = userData.phone; 
          setPhone(userPhone);

          fetchAgenda(userPhone);
          const unsubNotes = subscribeNotes(userPhone);
          
          if (!userData.acceptedTermsVersion || userData.acceptedTermsVersion < (config.contractVersion || 1)) {
              setShowContract(true);
          }

          updateDoc(userDocRef, { lastSeen: new Date() }).catch(console.error);
          setLoading(false);
          return () => unsubNotes();
        } else {
          showToast("Perfil não encontrado.", "error");
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro perfil:", error);
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user, config.contractVersion]);

  const fetchAgenda = async (rawPhone) => {
      if (!rawPhone) return;
      try {
          const q = query(collection(db, "appointments"), where("phone", "==", rawPhone));
          const snap = await getDocs(q);
          const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          const today = new Date().toISOString().split('T')[0];
          
          // BLINDAGEM: Filtra dados inválidos
          const validApps = apps.filter(a => {
              // Garante que isoDate e date existam e sejam strings válidas
              return a.isoDate && typeof a.isoDate === 'string' && a.date && a.isoDate >= today;
          });
          
          console.log("Agendamentos carregados:", validApps.length); // DEBUG
          setMyAppointments(validApps.sort((a,b) => a.isoDate.localeCompare(b.isoDate)));
      } catch (error) {
          console.error("Erro ao buscar agenda:", error);
          // Não quebra a aplicação, apenas mostra lista vazia
          setMyAppointments([]);
      }
  };

  const subscribeNotes = (rawPhone) => {
      if (!rawPhone) return () => {};
      const q = query(collection(db, "patient_notes"), where("phone", "==", rawPhone));
      return onSnapshot(q, (snap) => setMyNotes(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  };

  const handleAcceptContract = async () => {
      if(user) {
          await updateDoc(doc(db, "users", user.uid), { acceptedTermsVersion: config.contractVersion || 1 });
          setShowContract(false);
      }
  };
  
  const handleSaveNote = async () => {
      if(!noteContent.trim()) return;
      await addDoc(collection(db, "patient_notes"), { phone: phone, content: noteContent, createdAt: new Date() });
      setNoteContent('');
      showToast("Nota salva!");
  };

  const handleDeleteNote = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "patient_notes", id)); };
  
  const handleLogout = () => { 
    localStorage.removeItem('psi_user_phone'); 
    setPhone(''); 
    setView('landing'); 
    if (onLogout) onLogout();
  };

  const handleChangePin = async () => {
      showToast("Função em manutenção.", "error"); 
      setShowProfile(false);
  };

  const handleRequestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted' && messaging && user) {
        const token = await getToken(messaging, { vapidKey: 'BDYKoBDPNh4Q0SoSaY7oSXGz2fgVqGkJZWRgCMMeryqj-Jk7_csF0oJapZWhkSa9SEjgfYf6x3thWNZ4QttknZM' });
        if (token) {
            await updateDoc(doc(db, "users", user.uid), { pushToken: token });
            showToast("Lembretes ativados!");
        }
      }
    } catch (error) { console.error(error); }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 text-violet-600">
              <Loader2 className="w-8 h-8 animate-spin" />
          </div>
      );
  }

  // --- TELA INICIAL ---
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
                   
                   <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-left relative overflow-hidden">
                          <div className="flex items-center gap-2 mb-2 text-indigo-700">
                              <Sparkles size={16} />
                              <h4 className="font-bold text-xs uppercase tracking-wider">Para hoje</h4>
                          </div>
                          <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                              "{dailyMantra}"
                          </p>
                    </div>
                   
                   <div className="space-y-2">
                        <Button onClick={() => setView('dashboard')} icon={Smartphone} className="w-full py-4 text-lg">Acessar Meu Painel</Button>
                        <p className="text-[10px] text-slate-400">Funciona direto no navegador.</p>
                   </div>
                   
                   <div className="pt-3 border-t border-slate-100">
                        <button onClick={onLogout} className="text-xs text-slate-400 hover:text-red-500 underline flex items-center justify-center gap-1 mx-auto">
                            <LogOut size={12}/> Sair
                        </button>
                   </div>
               </div>
          </div>
      );
  }

  // --- DASHBOARD ---
  const nextApp = myApps[0];
  const recurrenceText = nextApp && nextApp.date ? `Toda ${getDayName(nextApp.date)} às ${nextApp.time}` : "Aguardando agendamento";

  return (
      <div className="min-h-screen bg-violet-50 p-4 flex flex-col">
          {toast.msg && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({})} />}
          
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                  <div className="bg-white p-1.5 rounded-full shadow-sm"><User className="text-violet-600 w-5 h-5"/></div>
                  <div><h2 className="font-bold text-slate-800 text-sm">Meu Espaço</h2></div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setShowLibrary(true)} className="bg-indigo-500 p-2 rounded-full text-white shadow hover:bg-indigo-600 transition" title="Biblioteca"><BookOpen size={16}/></button>
                 <button onClick={() => setShowContract(true)} className="bg-violet-100 p-2 rounded-full text-violet-600 shadow hover:bg-violet-200 transition"><ScrollText size={16}/></button>
                 <button onClick={() => setShowSOS(true)} className="bg-rose-500 p-2 rounded-full text-white shadow hover:bg-rose-600 transition"><LifeBuoy size={16}/></button>
                 <button onClick={() => setView('landing')} className="bg-white p-2 rounded-full text-slate-400 shadow hover:text-slate-600 transition" title="Voltar"><X size={16}/></button>
              </div>
          </div>

          {notificationPermission === 'default' && (
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                   <div className="bg-blue-100 p-1.5 rounded-full flex-shrink-0"><Bell size={16} className="text-blue-600" /></div>
                   <div>
                      <h4 className="font-bold text-blue-800 text-sm">Ativar Lembretes</h4>
                      <p className="text-xs text-blue-600 mt-1 leading-tight">Para receber os avisos das sessões.</p>
                   </div>
                </div>
                <Button onClick={handleRequestNotification} variant="primary" className="w-full text-xs py-2">Ativar Agora</Button>
             </div>
          )}

          <div className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-violet-500 mb-4 flex gap-3 items-center">
             <div className="bg-violet-100 p-1.5 rounded-full flex-shrink-0"><Activity size={16} className="text-violet-600" /></div>
             <div>
                <h4 className="font-bold text-slate-800 text-xs">O segredo é a constância</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Faltas podem interromper seu progresso.</p>
             </div>
          </div>

          {dailyCard && (
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4 relative overflow-hidden shadow-sm">
                  <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-1.5 text-indigo-700">
                          <Lightbulb size={14} />
                          <h4 className="font-bold text-xs uppercase tracking-wider">Reflexão do Dia</h4>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 mb-1 leading-snug">{dailyCard.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap mb-2 line-clamp-3">{dailyCard.content}</p>
                      <button onClick={() => setShowLibrary(true)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 group">Ler mais <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform"/></button>
                  </div>
                  <div className="absolute -right-3 -bottom-3 opacity-5 text-indigo-600"><BookOpen size={80}/></div>
              </div>
          )}

          {nextApp ? (
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-md p-4 mb-4 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-violet-100 text-[10px] font-medium uppercase tracking-wider mb-0.5">Seu Horário Fixo</p>
                    <h3 className="text-lg font-bold mb-1">{recurrenceText}</h3>
                    <div className="flex items-center gap-1.5 text-xs opacity-90"><User size={12}/> <span>{nextApp.professional || 'Psicoterapia'}</span></div>
                </div>
                <div className="absolute -right-6 -bottom-10 w-24 h-24 bg-white opacity-10 rounded-full"></div>
            </div>
          ) : (
             <div className="bg-white rounded-xl shadow-sm p-4 mb-4 text-center text-slate-500 border border-slate-200 text-xs"><Calendar className="mx-auto mb-1 opacity-20" size={24}/>Nenhum horário fixo identificado.</div>
          )}

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4 flex gap-2">
              <Info className="text-amber-600 w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 leading-relaxed">Este horário é válido como sessão semanal recorrente.</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm"><StickyNote size={16} className="text-violet-600"/> Anotações para a Terapia</h3>
             <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} className="w-full p-2 border rounded-lg text-xs mb-2 h-16 resize-none text-slate-900 focus:ring-1 focus:ring-violet-200 outline-none" placeholder="Lembrete para a sessão..." />
             <Button onClick={handleSaveNote} className="w-full text-xs py-2">Salvar</Button>
             {myNotes.length > 0 && (
                 <div className="mt-3 space-y-2">
                     {myNotes.slice(0, 3).map(n => (
                         <div key={n.id} className="bg-slate-50 p-2 rounded border border-slate-100 text-xs text-slate-700 flex justify-between relative group">
                             <span className="whitespace-pre-wrap line-clamp-2">{n.content}</span>
                             <button onClick={() => handleDeleteNote(n.id)} className="text-slate-300 hover:text-red-500 pl-2"><Trash2 size={12}/></button>
                         </div>
                     ))}
                 </div>
             )}
          </div>

          <div className="flex-1 overflow-y-auto pb-4">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-xs uppercase text-slate-500"><Calendar size={14}/> Datas Confirmadas</h3>
              {myApps.length > 0 ? (
                  <div className="space-y-2">
                      {myApps.map(app => (
                          <div key={app.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                              <div className="bg-slate-100 text-slate-600 w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                                  <span className="font-bold text-xs">{safeFormatDay(app.date)}</span>
                                  <span className="text-[8px] uppercase">{safeFormatMonth(app.isoDate)}</span>
                              </div>
                              <div>
                                  <p className="font-bold text-slate-700 text-xs">Sessão Agendada</p>
                                  <p className="text-[10px] text-slate-500">{app.date} às {app.time}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-2 text-slate-400 text-[10px]">Nenhuma data específica carregada.</div>
              )}
          </div>

          {showLibrary && (
              <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                      <div className="bg-indigo-600 p-3 text-white flex justify-between items-center">
                          <h3 className="font-bold flex items-center gap-2 text-sm"><BookOpen size={18}/> Biblioteca Terapêutica</h3>
                          <button onClick={() => setShowLibrary(false)}><X size={18} className="hover:text-indigo-200"/></button>
                      </div>
                      <div className="p-3 overflow-y-auto space-y-3 bg-slate-50 flex-1">
                          {EDUCATION_CARDS.map((card, index) => (
                              <div key={card.id} className={`p-4 rounded-xl border shadow-sm ${index % 2 === 0 ? 'bg-white border-slate-200' : 'bg-indigo-50 border-indigo-100'}`}>
                                  <h4 className="font-bold text-indigo-700 mb-1 text-sm">{card.title}</h4>
                                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{card.content}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {showSOS && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
                      <div className="bg-rose-500 p-3 text-white flex justify-between items-center">
                          <h3 className="font-bold flex items-center gap-2 text-sm"><LifeBuoy size={18}/> Apoio Emocional</h3>
                          <button onClick={() => setShowSOS(false)}><X size={18} className="hover:text-rose-100"/></button>
                      </div>
                      <div className="p-5 space-y-3">
                          <p className="text-xs text-slate-600 text-center mb-2">Se você está passando por um momento difícil, não hesite em pedir ajuda.</p>
                          <a href="tel:188" className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors">
                              <div className="flex flex-col"><span className="font-bold text-rose-700 text-sm">Ligar 188</span><span className="text-[10px] text-rose-500">CVV - Centro de Valorização da Vida</span></div><Smartphone size={20} className="text-rose-500" />
                          </a>
                          <div className="border-t border-slate-100 pt-3 mt-1">
                               <p className="text-[10px] text-slate-500 text-center mb-2">Contato da Clínica</p>
                               <a href={`https://wa.me/${config.whatsapp || '551141163129'}`} target="_blank" className="w-full bg-green-500 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors text-sm font-medium">
                                   <MessageCircle size={16} /> Chamar no WhatsApp
                               </a>
                          </div>
                      </div>
                  </div>
              </div>
          )}
          
          {showContract && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-xl w-full max-w-sm overflow-hidden h-[80vh] flex flex-col"><div className="bg-violet-600 p-3 text-white"><h3 className="font-bold text-sm">Termos e Combinados</h3></div><div className="p-5 overflow-y-auto flex-1 whitespace-pre-wrap text-xs text-slate-700 leading-relaxed">{config.contractText || "Carregando termos..."}</div><div className="p-3 border-t"><Button onClick={handleAcceptContract} variant="success" className="text-sm py-2">Li e Aceito</Button></div></div></div>}

          {showProfile && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white p-5 rounded-xl w-full max-w-sm"><h3 className="font-bold mb-3 text-slate-800 text-sm">Alterar Senha</h3><input placeholder="Novo PIN" value={newPin} onChange={e=>setNewPin(e.target.value)} className="w-full p-2.5 border rounded mb-3 text-slate-900 text-sm"/><Button onClick={handleChangePin} className="text-sm py-2">Confirmar</Button><button onClick={()=>setShowProfile(false)} className="block w-full text-center mt-2 text-xs text-slate-400">Cancelar</button></div></div>}

          <a href={`https://wa.me/${config.whatsapp || '551141163129'}`} target="_blank" className="fixed bottom-6 right-6 bg-green-500 text-white p-3 rounded-full shadow-lg z-40"><MessageCircle size={28}/></a>
      </div>
  );
}