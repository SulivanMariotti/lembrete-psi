import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

// Suas chaves (Mantidas do histórico anterior)
const firebaseConfig = {
  apiKey: "AIzaSyD91dy_t-HaFc77pxXiB1WhSmOoH9OPWL4",
  authDomain: "lembrete-psi.firebaseapp.com",
  projectId: "lembrete-psi",
  storageBucket: "lembrete-psi.firebasestorage.app",
  messagingSenderId: "832341424705",
  appId: "1:832341424705:web:04916a4cd4408aeb33e4c0"
};

// Inicializa o App Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados
const db = getFirestore(app);

// Inicializa o Sistema de Mensagens (apenas no navegador)
let messaging;

if (typeof window !== "undefined") {
  isSupported().then((isSupported) => {
    if (isSupported) {
      messaging = getMessaging(app);
    }
  }).catch((err) => {
    console.log('Firebase Messaging não suportado neste navegador', err);
  });
}

// CORREÇÃO: Exportar 'app' também, pois é usado pelo authService e page.js
export { app, db, messaging };