// Import necessary Firebase modules
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { app } from './firebase.js'; // Import the Firebase app initialized in your auth.js

// Initialize Firebase Authentication
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const googleLoginBtn = document.getElementById('googleLogin');
  
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
    
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
    
        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }
    
        const persistence = rememberMe
            ? browserLocalPersistence
            : browserSessionPersistence;
    
        // Set persistence before signing in
        setPersistence(auth, persistence)
            .then(() => {
                return signInWithEmailAndPassword(auth, email, password);
            })
            .then((userCredential) => {
                const user = userCredential.user;
                alert(`Welcome back, ${user.email}!`);
                window.location.href = 'index.html'; // Change to your app's dashboard URL
            })
            .catch((error) => {
                console.error("Login error:", error);
                alert("Login failed: " + error.message);
            });
    });
  
    googleLoginBtn.addEventListener('click', function () {
        const rememberMe = document.getElementById('rememberMe').checked;
        const provider = new GoogleAuthProvider();
    
        const persistence = rememberMe
            ? browserLocalPersistence
            : browserSessionPersistence;
    
        // Set persistence before signing in
        setPersistence(auth, persistence)
            .then(() => {
                return signInWithPopup(auth, provider);
            })
            .then((result) => {
                const user = result.user;
                alert(`Logged in Successfully as ${user.displayName}`);
                window.location.href = 'index.html'; // Change to your app's dashboard URL
            })
            .catch((error) => {
                console.error("Google login error:", error);
                alert("Google login failed: " + error.message);
            });
    });
});
