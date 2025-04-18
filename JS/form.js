import { auth, db } from './firebase.js';
import { ref, set } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('travelForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to update your travel profile.");
            return;
        }

        const userId = user.uid;

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const travelStyle = document.querySelector('input[name="travelStyle"]:checked')?.value || "";
        const budget = document.getElementById('budget').value;

        const interests = Array.from(document.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value);
        const activities = Array.from(document.querySelectorAll('input[name="activities"]:checked')).map(cb => cb.value);
        const climate = document.getElementById('climate').value;
        const duration = document.getElementById('duration').value;
        const specialRequests = document.getElementById('specialRequests').value.trim();

        const profileData = {
            name,
            email,
            travelStyle,
            budget,
            interests,
            activities,
            climate,
            duration,
            specialRequests
        };

        try {
            await set(ref(db, `users/${userId}/profile`), profileData);
            // showNotification("Profile updated successfully!");
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error saving data:", error);
            alert("Failed to save profile. Please try again.");
        }
    });
});
