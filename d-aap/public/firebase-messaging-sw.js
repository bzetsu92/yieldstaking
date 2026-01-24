importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

let firebaseApp = null;
let messaging = null;

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FIREBASE_CONFIG') {
        const firebaseConfig = event.data.config;
        initializeFirebase(firebaseConfig);
    }
});

function initializeFirebase(firebaseConfig) {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        console.error('[firebase-messaging-sw.js] Firebase config not provided');
        return;
    }

    try {
        if (!firebaseApp) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
        }
        
        if (!messaging) {
            messaging = firebase.messaging();

            messaging.onBackgroundMessage((payload) => {
                try {
                    const notificationTitle = payload.notification?.title || 'New Notification';
                    const notificationOptions = {
                        body: payload.notification?.body || '',
                        icon: payload.notification?.icon || '/favicon.ico',
                        badge: '/favicon.ico',
                        tag: payload.data?.notificationId || 'notification',
                        data: payload.data || {},
                        requireInteraction: false,
                        silent: false,
                    };

                    return self.registration.showNotification(notificationTitle, notificationOptions);
                } catch (error) {
                    console.error('[firebase-messaging-sw.js] Error showing notification:', error);
                }
            });
        }
    } catch (error) {
        console.error('[firebase-messaging-sw.js] Error initializing Firebase:', error);
    }
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const notificationId = data.notificationId;
    
    // Build URL based on notification data
    let urlToOpen = '/';
    if (notificationId) {
        urlToOpen = `/notifications`;
    } else if (data.eventId) {
        urlToOpen = `/events/${data.eventId}`;
    } else if (data.ticketId) {
        urlToOpen = `/tickets/${data.ticketId}`;
    } else if (data.url) {
        urlToOpen = data.url;
    }

    event.waitUntil(
        clients
            .matchAll({
                type: 'window',
                includeUncontrolled: true,
            })
            .then((clientList) => {
                // Try to find and focus existing window
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Try to focus any open window
                if (clientList.length > 0 && 'focus' in clientList[0]) {
                    return clientList[0].focus();
                }
                
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
            .catch((error) => {
                console.error('[firebase-messaging-sw.js] Error handling notification click:', error);
            }),
    );
});

