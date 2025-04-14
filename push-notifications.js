// Generate a unique device ID
function generateDeviceId() {
    // Get existing device ID from localStorage or generate a new one
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

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

            // Get device ID
            const deviceId = generateDeviceId();

            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.VAPID_PUBLIC_KEY
            });

            // Send subscription to server with device ID
            await fetch('/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription,
                    deviceId
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
