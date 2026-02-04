/* Este arquivo DEVE ficar na pasta 'public'
  Ele é responsável por receber as notificações quando o site está fechado.
*/

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Suas chaves do Firebase (Copiadas das suas imagens anteriores)
firebase.initializeApp({
  apiKey: "AIzaSyD91dy_t-HaFc77pxXiB1WhSmOoH9OPWL4",
  projectId: "lembrete-psi",
  messagingSenderId: "832341424705",
  appId: "1:832341424705:web:04916a4cd4408aeb33e4c0"
});

// Inicializa o recebimento de mensagens em background
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Notificação recebida em background:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png' // Se tiver um ícone na pasta public, ele usa
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});