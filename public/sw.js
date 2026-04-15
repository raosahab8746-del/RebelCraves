// Handle push notifications from Firebase Cloud Messaging
self.addEventListener('push', function(event) {
  console.log('Service Worker - Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.notification?.body || data.body || 'New notification',
      icon: data.notification?.icon || '/favicon.ico',
      badge: data.notification?.badge || '/favicon.ico',
      vibrate: [100, 50, 100],
      tag: data.notification?.tag || 'notification',
      requireInteraction: true,
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        ...(data.data || {})
      }
    };
    
    const title = data.notification?.title || data.title || 'New Notification';
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Handle notification clicks - navigate and focus app
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event.notification);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.orderId 
    ? `/?path=order-tracking/${event.notification.data.orderId}`
    : '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If app is open, focus it
        if (client.url === '/' || client.url.includes(location.origin)) {
          client.focus();
          // Send message to app about the notification
          if (client.postMessage) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: event.notification.data
            });
          }
          return client;
        }
      }
      // If not, then open the target URL in a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification);
});
