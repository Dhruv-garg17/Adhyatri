import { auth } from './JS/firebase.js';
import {GoogleAuthProvider, createUser } from './JS/auth.js';


document.addEventListener('DOMContentLoaded', function () {
    const signupForm = document.getElementById('signupForm');
    const passwordField = document.getElementById('signupPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    const passwordMessage = document.getElementById('passwordMessage');
    const confirmPasswordMessage = document.getElementById('confirmPasswordMessage');
    const googleBtn = document.getElementById('googleSignup');

    function validatePassword() {
        const password = passwordField.value;
        if (password.length < 8) {
            passwordField.classList.add('invalid');
            passwordField.classList.remove('valid');
            passwordMessage.textContent = 'Password must be at least 8 characters long';
            return false;
        } else {
            passwordField.classList.add('valid');
            passwordField.classList.remove('invalid');
            passwordMessage.textContent = '';
            return true;
        }
    }

    function validateConfirmPassword() {
        const password = passwordField.value;
        const confirmPassword = confirmPasswordField.value;
        if (password !== confirmPassword) {
            confirmPasswordField.classList.add('invalid');
            confirmPasswordField.classList.remove('valid');
            confirmPasswordMessage.textContent = 'Passwords do not match';
            return false;
        } else {
            confirmPasswordField.classList.add('valid');
            confirmPasswordField.classList.remove('invalid');
            confirmPasswordMessage.textContent = '';
            return true;
        }
    }

    passwordField.addEventListener('input', validatePassword);
    confirmPasswordField.addEventListener('input', validateConfirmPassword);

    signupForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = passwordField.value;

        if (!validatePassword() || !validateConfirmPassword()) {
            alert('Please fix the errors in the form.');
            return;
        }

        createUser(email, password, name)
            .then((result) => {
                if (result.success) {
                    alert('Sign up successful! Welcome to Adhyatri');
                    window.location.href = 'form.html';
                } else {
                    alert('Error: ' + result.message);
                }
            });
    });

    googleBtn.addEventListener('click', function () {
        // Google Sign-In
        import('https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js').then(({ signInWithPopup }) => {
            signInWithPopup(auth, GoogleAuthProvider)
                .then(() => {
                    alert('Sign up successful with Google!');
                    window.location.href = 'form.html';
                })
                .catch((error) => {
                    alert('Error: ' + error.message);
                });
        });
    });
});
