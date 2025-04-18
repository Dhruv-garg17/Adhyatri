// navbar.js
import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

export function initializeNavbar() {
    const userActions = document.querySelector('.user-actions');
    console.log(userActions);
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in - show profile circle
            userActions.innerHTML = `
                <div class="user-profile">
                    <div class="profile-circle">
                        ${user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div class="profile-dropdown">
                        <a href="./Profile.html" class="dropdown-item">My Profile</a>
                        <a href="#" class="dropdown-item">My Trips</a>
                        <a href="#" id="signOutBtn" class="dropdown-item">Sign Out</a>
                    </div>
                </div>
            `;
            
            // Add sign out functionality
            document.getElementById('signOutBtn')?.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await signOut(auth);
                    window.location.reload();
                } catch (error) {
                    console.error("Error signing out: ", error);
                }
            });
            
            // Toggle dropdown menu
            const profileCircle = document.querySelector('.profile-circle');
            const dropdown = document.querySelector('.profile-dropdown');
            
            profileCircle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdown.classList.remove('show');
            });
        } else {
            // User is signed out - show login/signup buttons
            userActions.innerHTML = `
                <a href="login.html" class="btn btn-outline">Login</a>
                <a href="signup.html" class="btn">Sign Up</a>
            `;
        }
    });
}