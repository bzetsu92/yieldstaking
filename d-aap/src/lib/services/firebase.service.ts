import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';

import { publicEnv } from '../config/env';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function initializeFirebase(): FirebaseApp | null {
    if (app) {
        return app;
    }

        if (
            !publicEnv.FIREBASE_API_KEY ||
            !publicEnv.FIREBASE_AUTH_DOMAIN ||
            !publicEnv.FIREBASE_PROJECT_ID
        ) {
            return null;
        }

    try {
        const existingApps = getApps();
        if (existingApps.length > 0) {
            app = existingApps[0];
        } else {
            app = initializeApp({
                apiKey: publicEnv.FIREBASE_API_KEY,
                authDomain: publicEnv.FIREBASE_AUTH_DOMAIN,
                projectId: publicEnv.FIREBASE_PROJECT_ID,
                storageBucket: publicEnv.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: publicEnv.FIREBASE_MESSAGING_SENDER_ID,
                appId: publicEnv.FIREBASE_APP_ID,
            });
        }

        return app;
    } catch (error) {
        console.error('Error initializing Firebase:', process.env.NODE_ENV === 'development' ? error : (error as Error).message);
        return null;
    }
}

export async function initializeMessaging(): Promise<Messaging | null> {
    if (messaging) {
        return messaging;
    }

    const supported = await isSupported();
    if (!supported) {
        return null;
    }

    if (!app) {
        app = initializeFirebase();
        if (!app) {
            return null;
        }
    }

    try {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                    scope: '/',
                });
                
                if (registration.active) {
                    registration.active.postMessage({
                        type: 'FIREBASE_CONFIG',
                        config: {
                            apiKey: publicEnv.FIREBASE_API_KEY,
                            authDomain: publicEnv.FIREBASE_AUTH_DOMAIN,
                            projectId: publicEnv.FIREBASE_PROJECT_ID,
                            storageBucket: publicEnv.FIREBASE_STORAGE_BUCKET,
                            messagingSenderId: publicEnv.FIREBASE_MESSAGING_SENDER_ID,
                            appId: publicEnv.FIREBASE_APP_ID,
                        },
                    });
                } else if (registration.installing) {
                    registration.installing.addEventListener('statechange', () => {
                        if (registration.active) {
                            registration.active.postMessage({
                                type: 'FIREBASE_CONFIG',
                                config: {
                                    apiKey: publicEnv.FIREBASE_API_KEY,
                                    authDomain: publicEnv.FIREBASE_AUTH_DOMAIN,
                                    projectId: publicEnv.FIREBASE_PROJECT_ID,
                                    storageBucket: publicEnv.FIREBASE_STORAGE_BUCKET,
                                    messagingSenderId: publicEnv.FIREBASE_MESSAGING_SENDER_ID,
                                    appId: publicEnv.FIREBASE_APP_ID,
                                },
                            });
                        }
                    });
                }
            } catch {
                // Service Worker registration failed
            }
        }

        messaging = getMessaging(app);
        return messaging;
    } catch (error) {
        console.error('Error initializing Firebase Messaging:', process.env.NODE_ENV === 'development' ? error : (error as Error).message);
        return null;
    }
}

export async function getFcmToken(): Promise<string | null> {
    try {
        const messagingInstance = await initializeMessaging();
        if (!messagingInstance) {
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return null;
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
        const token = await getToken(messagingInstance, {
            vapidKey,
        });

        if (!token) {
            return null;
        }

        return token;
    } catch (error) {
        console.error('Error getting FCM token:', process.env.NODE_ENV === 'development' ? error : (error as Error).message);
        return null;
    }
}

export function onMessageListener(callback: (payload: MessagePayload) => void): () => void {
    let unsubscribe: (() => void) | null = null;
    let isCleanedUp = false;

    initializeMessaging()
        .then((messagingInstance) => {
            if (!messagingInstance || isCleanedUp) {
                return;
            }

            unsubscribe = onMessage(messagingInstance, (payload: any) => {
                if (!isCleanedUp) {
                    try {
                        callback(payload as MessagePayload);
                    } catch {
                        // Error in message callback
                    }
                }
            });
        })
        .catch(() => {
            // Error setting up message listener
        });

    return () => {
        isCleanedUp = true;
        if (unsubscribe) {
            try {
                unsubscribe();
            } catch {
                // Error unsubscribing from messages
            }
        }
    };
}

export interface MessagePayload {
    notification?: {
        title?: string;
        body?: string;
        image?: string;
    };
    data?: Record<string, string>;
}

