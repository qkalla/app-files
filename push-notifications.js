// Check if browser supports service workers and push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
    window.addEventListener('load', async () => {
        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');

            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permission not granted for notifications');
            }

            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.VAPID_PUBLIC_KEY
            });

            // Get the current user's ID (you need to implement this based on your auth system)
            const userId = getCurrentUserId(); // Implement this function based on your auth system

            // Send subscription to server with user ID
            await fetch('/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}` // Add your auth token
                },
                body: JSON.stringify({
                    subscription,
                    userId
                })
            });

            console.log('Push notification subscription successful');
        } catch (error) {
            console.error('Error setting up push notifications:', error);
        }
    });
}

// Helper function to get current user ID (implement based on your auth system)
function getCurrentUserId() {
    // Example: Get from localStorage or your auth state
    return localStorage.getItem('userId');
}

// Helper function to get auth token (implement based on your auth system)
function getAuthToken() {
    // Example: Get from localStorage or your auth state
    return localStorage.getItem('authToken');
} 