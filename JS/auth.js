// auth.js
import { auth } from './firebase.js'; // Importing the already initialized auth from firebase.js
import { GoogleAuthProvider, sendPasswordResetEmail, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Password Reset Function
export function sendPasswordReset(email) {
    return sendPasswordResetEmail(auth, email)
        .then(() => {
            return { success: true, message: "Password reset email sent!" };
        })
        .catch(error => {
            return { success: false, message: error.message };
        });
}

// Auth Guard Example
export function initAuthGuard() {
    onAuthStateChanged(auth, (user) => {
        const protectedPages = ['plantrip.html', 'comparison.html']; // Add all protected pages
        const currentPage = window.location.pathname.split('/').pop().toLowerCase();
        
        if (!user && protectedPages.includes(currentPage)) {
            // Only redirect if on a protected page and not logged in
            window.location.href = 'login.html';
        }
    });
}

// ✅ New: Create User Function
export function createUser(email, password, displayName) {
    return createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            return updateProfile(user, { displayName: displayName }).then(() => {
                return { success: true, user };
            });
        })
        .catch((error) => {
            return { success: false, message: error.message };
        });
}

export { GoogleAuthProvider };
