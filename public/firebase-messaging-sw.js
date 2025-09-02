// public/firebase-messaging-sw.js

// Import and initialize the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.0/firebase-messaging-compat.js');

// Replace with your project's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC62YQWOwnMdz6-erPivgEcFufLoASM7OA",
    authDomain: "sas-project-12836.firebaseapp.com",
    projectId: "sas-project-12836",
    storageBucket: "sas-project-12836.firebasestorage.app",
    messagingSenderId: "9368285354",
    appId: "1:9368285354:web:15107e2e31d7a1f598e0d3"
};

firebase.initializeApp(firebaseConfig);

// Retrieve and initialize Firebase Messaging
const messaging = firebase.messaging();

// Optional: Handle incoming messages while the app is not in the foreground
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/firebase-logo.png' // Add an icon if you wish
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});