// Service Worker Atualizado - Versão Simples (Sem Links Externos)
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

  const notificationTitle = payload.notification?.title || 'Lembrete Psi';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova mensagem recebida.',
    icon: '/icon.png'
    // Removemos a lógica de data { click_url } para simplificar
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 2. Quando o usuário CLICA na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('Notificação clicada!');
  
  event.notification.close();

  // URL fixa do site principal (sem links externos para WhatsApp por enquanto)
  const urlToOpen = 'https://agenda.msgflow.app.br';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Tenta focar se já estiver aberto
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});