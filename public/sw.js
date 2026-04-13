// Service Worker for Push Notifications

function parsePushData(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch {
    return {
      title: 'Nova notificação',
      message: event.data.text(),
    };
  }
}

self.addEventListener('push', function(event) {
  const data = parsePushData(event);

  const options = {
    body: data.message || data.body || 'Você recebeu uma atualização.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nova notificação', options),
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async function(clientList) {
      for (const client of clientList) {
        if (!client.url.includes(self.location.origin) || !('focus' in client)) {
          continue;
        }

        if ('navigate' in client) {
          await client.navigate(urlToOpen);
        }

        if ('focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
