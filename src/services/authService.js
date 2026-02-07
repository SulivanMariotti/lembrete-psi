import { getAuth, signOut } from "firebase/auth";
import { app, db } from '../app/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const auth = getAuth(app);

// --- MODO DESENVOLVIMENTO: Login Direto sem E-mail ---
export const devLogin = async (email) => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Gera um UID falso mas consistente baseado no e-mail (base64)
    // Assim, sempre que entrar com o mesmo e-mail, terá o mesmo ID e dados
    // btoa converte string para base64, pegamos os primeiros 20 chars para simular um UID do Firebase
    const fakeUid = btoa(cleanEmail).substring(0, 20); 

    // Verifica se está na Whitelist (Pré-cadastro) para puxar dados
    const whitelistRef = doc(db, "whitelisted_patients", cleanEmail);
    const whitelistSnap = await getDoc(whitelistRef);

    let userData = {
      uid: fakeUid,
      email: cleanEmail,
      role: 'patient',
      lastLogin: serverTimestamp()
    };

    // Se estiver na whitelist, puxa os dados corretos
    if (whitelistSnap.exists()) {
      const whitelistData = whitelistSnap.data();
      userData.name = whitelistData.fullName;
      userData.phone = whitelistData.phone;
    }

    // Salva/Atualiza o usuário no banco de dados "users"
    // Isso é fundamental para que o PatientFlow.js encontre o perfil
    await setDoc(doc(db, "users", fakeUid), userData, { merge: true });

    // Retorna um objeto que imita o objeto 'user' do Firebase Auth
    return { 
      success: true, 
      user: { 
        uid: fakeUid, 
        email: cleanEmail, 
        displayName: userData.name || '' 
      } 
    };

  } catch (error) {
    console.error("Erro no login dev:", error);
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
    // Apenas limpa localmente, já que não há sessão real do Firebase neste modo
    return true; 
};

// Funções antigas mantidas como placeholders para não quebrar outros imports, se houver
export const sendMagicLink = async () => { return { success: false, error: "Modo DEV ativado" }; };
export const completeLoginWithLink = async () => { return { success: false }; };