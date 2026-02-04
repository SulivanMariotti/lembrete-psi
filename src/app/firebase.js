import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

// Suas chaves de configuração
const firebaseConfig = {
  apiKey: "AIzaSyD91dy_t-HaFc77pxXiB1WhSmOoH9OPWL4",
  authDomain: "lembrete-psi.firebaseapp.com",
  projectId: "lembrete-psi",
  storageBucket: "lembrete-psi.firebasestorage.app",
  messagingSenderId: "832341424705",
  appId: "1:832341424705:web:04916a4cd4408aeb33e4c0"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados (Firestore)
const db = getFirestore(app);

// Inicializa o Sistema de Mensagens (Messaging)
// A lógica abaixo evita erros quando o site roda no "servidor" do Next.js
let messaging = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  }).catch((err) => {
    console.log('Firebase Messaging não suportado neste navegador ou erro ao iniciar:', err);
  });
}

export { db, messaging };