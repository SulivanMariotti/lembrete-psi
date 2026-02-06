import { 
  getAuth, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink, 
  signOut 
} from "firebase/auth";
import { app, db } from '../app/firebase'; // Certifique-se que o caminho para firebase.js está correto
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const auth = getAuth(app);

// Configuração do Magic Link
const actionCodeSettings = {
  // A URL deve ser a URL onde seu site está hospedado (localhost ou vercel)
  url: typeof window !== 'undefined' ? window.location.href : '', 
  handleCodeInApp: true,
};

// 1. Enviar o Link
export const sendMagicLink = async (email) => {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    return { success: true };
  } catch (error) {
    console.error("Erro ao enviar link:", error);
    return { success: false, error: error.message };
  }
};

// 2. Verificar e Completar Login
export const completeLoginWithLink = async () => {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    
    if (!email) {
      email = window.prompt('Por favor, confirme seu e-mail para finalizar o acesso:');
    }

    try {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      const user = result.user;

      // --- VALIDAÇÃO DE WHITELIST ---
      // Verifica se o e-mail existe na coleção de pré-cadastro
      const whitelistRef = doc(db, "whitelisted_patients", user.email);
      const whitelistSnap = await getDoc(whitelistRef);

      if (!whitelistSnap.exists()) {
        // Se não estiver na lista, desloga e erro
        await signOut(auth);
        throw new Error("E-mail não cadastrado pela clínica. Entre em contato com a recepção.");
      }

      // Se estiver na lista, cria/atualiza o perfil real do usuário
      const whitelistData = whitelistSnap.data();
      
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: whitelistData.fullName,
        phone: whitelistData.phone, // Usa o telefone limpo do admin
        role: 'patient',
        lastLogin: serverTimestamp()
      }, { merge: true });

      window.localStorage.removeItem('emailForSignIn');
      
      // Limpa a URL para não tentar logar de novo ao recarregar
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return { success: true, user };

    } catch (error) {
      console.error("Erro no login:", error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Link inválido ou expirado." };
};

export const logoutUser = () => signOut(auth);