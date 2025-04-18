// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCgcAJAQH3Ml0VesmBmCwbuGFZgGgdc4mE",
    authDomain: "adhyatri-51e42.firebaseapp.com",
    databaseURL: "https://adhyatri-51e42-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "adhyatri-51e42",
    storageBucket: "adhyatri-51e42.appspot.com",
    messagingSenderId: "512542274657",
    appId: "1:512542274657:web:89163ec23887d7f838e620",
    measurementId: "G-87LGL4MKBM"
};

// Initialize Firebase only once
let app;
if (!window.firebaseApp) {
    app = initializeApp(firebaseConfig);
    window.firebaseApp = app; // Store the initialized app to ensure it's used only once
} else {
    app = window.firebaseApp;
}

export function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#333';
    notification.style.color = '#fff';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}


const auth = getAuth(app);
const db = getDatabase(app);

// Export Firebase services
export { app, auth, db };
