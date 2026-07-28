self.addEventListener('push', function(event) {
  if (event.data) {
    let data;
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "System Alert", body: event.data.text() };
    }
    
    const options = {
      body: data.body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: data.data || { dateOfArrival: Date.now() },
      requireInteraction: true // Keeps the notification on screen until interacted with
    };
    
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Open the admin dashboard if it's not already open
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/admin/orders');
      }
    })
  );
});
