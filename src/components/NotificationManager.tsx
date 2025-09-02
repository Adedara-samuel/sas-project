/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// REPLACE THIS with your actual VAPID key
const vapidKey = 'BPtxpwfMuQvDIT86hI1w_X8e7-GnDFHNf-mxOp5R4J0eO5FRznQdN602NXJ65wzD1GpjJEo8ao_ERaxPEx9c4V8';

export function NotificationManager() {
    const { user, authChecked } = useStore();

    useEffect(() => {
        if (authChecked && user?.uid) {
            requestNotificationPermissionAndSaveToken();
        }
    }, [authChecked, user?.uid]);

    // Listen for messages while the app is in the foreground
    useEffect(() => {
        const messaging = getMessaging();
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received in foreground:', payload);
            alert(`New Notification: ${payload.notification?.title}`);
        });
        return () => unsubscribe();
    }, []);

    const requestNotificationPermissionAndSaveToken = async () => {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications.');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const messaging = getMessaging();
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken) {
                    console.log('FCM token obtained:', currentToken);
                    if (!user) {
                        console.error('User is null, cannot save FCM token.');
                        return;
                    }
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, { fcmToken: currentToken });
                    console.log('FCM token saved successfully!');
                } else {
                    console.log('No FCM token available. Requesting a new one.');
                }
            } else {
                console.log('Notification permission denied.');
            }
        } catch (error) {
            console.error('Error getting or saving token:', error);
        }
    };

    return null;
}