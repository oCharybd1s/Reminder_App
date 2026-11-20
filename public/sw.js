self.addEventListener('push', (e) => {
  const { title = 'Pengingat', body = '' } = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'daily' }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((ws) => (ws[0] ? ws[0].focus() : clients.openWindow('/')))
  );
});
