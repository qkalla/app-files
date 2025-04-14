self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        data: {
            orderId: data.orderId,
            status: data.status
        },
        actions: [
            {
                action: 'view',
                title: 'View Order'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'view') {
        // Open the order details page
        const orderId = event.notification.data.orderId;
        event.waitUntil(
            clients.openWindow(`/order/${orderId}`)
        );
    }
});
  