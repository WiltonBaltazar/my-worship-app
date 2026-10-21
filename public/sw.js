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
      notificationId: data.id || null,
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

  const url = new URL(event.notification.data?.url || '/dashboard', self.location.origin);
  const notificationId = event.notification.data?.notificationId;

  if (notificationId) {
    url.searchParams.set('wora_notification_id', notificationId);
  }

  const urlToOpen = url.href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async function(clientList) {
      const client = clientList.find(function(c) {
        return c.url.startsWith(self.location.origin) && 'focus' in c;
      });

      if (client) {
        // Focus first: it must happen while the click still counts as a user gesture.
        const focused = await client.focus().catch(function() { return client; });
        const target = focused || client;

        // client.navigate() rejects for clients this worker does not control
        // (e.g. opened before the worker activated), so fall back to asking the
        // app to route in place.
        try {
          if ('navigate' in target) {
            const navigated = await target.navigate(urlToOpen);
            if (navigated) return navigated;
          }
        } catch (error) {
          // fall through to postMessage
        }

        target.postMessage({ type: 'wora:navigate', url: urlToOpen });
        return target;
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
