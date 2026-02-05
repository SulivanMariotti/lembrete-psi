// Service Worker Atualizado - Versão Final de Correção de Links (v3)
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyD91dy_t-HaFc77pxXiB1WhSmOoH9OPWL4",
  projectId: "lembrete-psi",
  messagingSenderId: "832341424705",
  appId: "1:832341424705:web:04916a4cd4408aeb33e4c0"
});

const messaging = firebase.messaging();

// 1. Quando a mensagem chega (Background)
messaging.onBackgroundMessage((payload) => {
  console.log('Notificação recebida:', payload);

  // Tenta encontrar o link em vários lugares possíveis da mensagem
  const link = payload.fcmOptions?.link || payload.data?.link || 'https://agenda.msgflow.app.br';

  const notificationTitle = payload.notification?.title || 'Lembrete Psi';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova mensagem recebida.',
    icon: '/icon.png',
    // Guardamos o link explicitamente nos dados da notificação
    data: {
      click_url: link
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 2. Quando o usuário CLICA na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('Notificação clicada!');
  
  event.notification.close();

  // Recupera o link. Se falhar, usa o site principal como segurança.
  let linkParaAbrir = event.notification.data?.click_url;
  if (!linkParaAbrir) {
      linkParaAbrir = 'https://agenda.msgflow.app.br';
  }

  // Abertura direta (Mais compatível com links externos como WhatsApp em Mobile)
  event.waitUntil(
    clients.openWindow(linkParaAbrir)
  );
});