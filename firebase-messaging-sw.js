// Service Worker — Lembrete Psi (anti-duplicação + compat)
// - Se payload.notification existir (webpush notification), NÃO chama showNotification (evita 2x)
// - Se NÃO existir, usa payload.data.title/body e mostra manualmente (DATA-ONLY)
// - Usa "tag" (dedupeKey) para colapsar duplicatas no Android/Chrome

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyD91dy_t-HaFc77pxXiB1WhSmOoH9OPWL4",
  projectId: "lembrete-psi",
  messagingSenderId: "832341424705",
  appId: "1:832341424705:web:04916a4cd4408aeb33e4c0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  try {
    // 1) Se o navegador já vai mostrar (notification payload), NÃO duplicar via SW.
    if (payload && payload.notification && (payload.notification.title || payload.notification.body)) {
      return;
    }

    // 2) DATA-ONLY
    const data = (payload && payload.data) ? payload.data : {};
    const notificationTitle = data.title || '💜 Permittá • Lembrete Psi';
    const notificationBody = data.body || 'Nova mensagem recebida.';

    const tag = data.dedupeKey || (
      data.appointmentId && data.reminderType ? `${data.appointmentId}:${data.reminderType}` : undefined
    );

    const clickUrl = data.click_url || 'https://agenda.msgflow.app.br';

    const notificationOptions = {
      body: notificationBody,
      icon: '/icon.png',
      tag,
      renotify: false,
      data: { click_url: clickUrl }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  } catch (e) {
    console.error('SW showNotification error:', e);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = (event.notification && event.notification.data && event.notification.data.click_url)
    ? event.notification.data.click_url
    : 'https://agenda.msgflow.app.br';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
