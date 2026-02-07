import { 
  getAuth, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink, 
  signOut 
} from "firebase/auth";
import { app, db } from '../app/firebase'; 
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const auth = getAuth(app);

const actionCodeSettings = {
  // A URL deve ser a URL onde seu site está hospedado
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

// 2. Verificar e Completar Login (SEM BLOQUEIO)
export const completeLoginWithLink = async () => {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    
    if (!email) {
      email = window.prompt('Por favor, confirme seu e-mail para finalizar o acesso:');
    }

    try {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      const user = result.user;

      // Tenta buscar dados pré-cadastrados, mas NÃO BLOQUEIA se não achar
      const whitelistRef = doc(db, "whitelisted_patients", user.email);
      const whitelistSnap = await getDoc(whitelistRef);

      let userData = {
        uid: user.uid,
        email: user.email,
        role: 'patient',
        lastLogin: serverTimestamp()
      };

      // Se houver pré-cadastro, puxamos os dados confiáveis
      if (whitelistSnap.exists()) {
        const whitelistData = whitelistSnap.data();
        userData.name = whitelistData.fullName;
        userData.phone = whitelistData.phone;
      }

      // Cria ou atualiza o usuário (mesmo sem whitelist)
      await setDoc(doc(db, "users", user.uid), userData, { merge: true });

      window.localStorage.removeItem('emailForSignIn');
      
      // Limpa a URL
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