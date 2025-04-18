import { auth, db } from './JS/firebase.js';
import { get, ref } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// DOM Elements
const searchInput = document.querySelector('.search-bar input');
const searchButton = document.querySelector('.search-bar button');
const sortSelect = document.getElementById('sort-by');
const filterSelect = document.getElementById('filter-by');
const destinationGrid = document.querySelector('.destination-grid');
const getRecommendationsBtn = document.getElementById('getRecommendationsBtn');
const optionCards = document.querySelectorAll('.option-card');
const budgetSlider = document.getElementById('budget-slider');
const rangeValues = document.querySelector('.range-values');

// Global Variables
let destinations = [];
let filteredDestinations = [];
let userPreferences = {
    travelerType: null,
    budget: 300,
    travelCompanion: null
};

// Initialize the page
// document.addEventListener('DOMContentLoaded', () => {
//     fetchDestinations();
//     setupEventListeners();

//     // Button Elements
//     // const loginBtn = document.getElementById('login-btn');
//     // const signupBtn = document.getElementById('signup-btn');
//     // const logoutBtn = document.getElementById('logout-btn');

//     // Monitor authentication state
//     onAuthStateChanged(auth, (user) => {
//         if (user) {
//             // Logged in
//             loginBtn.style.display = 'none';
//             signupBtn.style.display = 'none';
//             logoutBtn.style.display = 'inline-block';
//         } else {
//             // Not logged in
//             loginBtn.style.display = 'inline-block';
//             signupBtn.style.display = 'inline-block';
//             logoutBtn.style.display = 'none';
//         }
//     });

//     // Logout functionality
//     if (logoutBtn) {
//         logoutBtn.addEventListener('click', () => {
//             signOut(auth).then(() => {
//                 console.log("User signed out");
//             }).catch((error) => {
//                 console.error("Error signing out:", error);
//             });
//         });
//     }
// });

// Fetch destinations from Firebase Realtime Database
async function fetchDestinations() {
    try {
        const snapshot = await get(ref(db, 'destinations'));
        destinations = [];
        snapshot.forEach((childSnapshot) => {
            destinations.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        filteredDestinations = [...destinations];
        renderDestinations(filteredDestinations);
    } catch (error) {
        console.error("Error fetching destinations: ", error);
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', filterDestinations);
    searchButton.addEventListener('click', filterDestinations);
    
    // Filter and sort
    sortSelect.addEventListener('change', filterDestinations);
    filterSelect.addEventListener('change', filterDestinations);
    
    // Survey options
    optionCards.forEach(card => {
        card.addEventListener('click', function() {
            const parentGrid = this.closest('.options-grid');
            parentGrid.querySelectorAll('.option-card').forEach(c => {
                c.classList.remove('active');
            });
            this.classList.add('active');
            
            const questionType = this.closest('.survey-step').querySelector('h3').textContent;
            const optionValue = this.querySelector('p').textContent;
            
            if (questionType.includes('What type of traveler are you?')) {
                userPreferences.travelerType = optionValue;
            } else if (questionType.includes('Who are you traveling with?')) {
                userPreferences.travelCompanion = optionValue;
            }
        });
    });
    
    // Budget slider
    budgetSlider.addEventListener('input', function() {
        userPreferences.budget = parseInt(this.value);
        rangeValues.firstElementChild.textContent = `$${this.value}`;
    });
    
    // Get recommendations button
    getRecommendationsBtn.addEventListener('click', handleSurveySubmission);
}

// Filter destinations based on search and filters
function filterDestinations() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;
    const sortValue = sortSelect.value;

    filteredDestinations = destinations.filter(dest => {
        const matchesSearch = dest.name.toLowerCase().includes(searchTerm) || 
                            dest.description.toLowerCase().includes(searchTerm) ||
                            dest.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        const matchesFilter = filterValue === 'All Destinations' || 
                            dest.tags.includes(filterValue);
        
        return matchesSearch && matchesFilter;
    });

    sortDestinations(sortValue);
    renderDestinations(filteredDestinations);
}

// Sort destinations based on selected option
function sortDestinations(sortBy) {
    switch(sortBy) {
        case 'Popularity':
            filteredDestinations.sort((a, b) => b.views - a.views);
            break;
        case 'Price (Low to High)':
            filteredDestinations.sort((a, b) => a.price - b.price);
            break;
        case 'Price (High to Low)':
            filteredDestinations.sort((a, b) => b.price - a.price);
            break;
        case 'Rating':
            filteredDestinations.sort((a, b) => b.rating - a.rating);
            break;
        default: // Recommended
            filteredDestinations.sort((a, b) => {
                const aScore = calculateRecommendationScore(a);
                const bScore = calculateRecommendationScore(b);
                return bScore - aScore;
            });
    }
}

// Calculate recommendation score based on user preferences
function calculateRecommendationScore(destination) {
    let score = 0;
    
    // Match traveler type
    if (userPreferences.travelerType && destination.tags.includes(userPreferences.travelerType)) {
        score += 30;
    }
    
    // Match travel companion
    if (userPreferences.travelCompanion && destination.tags.includes(userPreferences.travelCompanion)) {
        score += 20;
    }
    
    // Budget consideration
    const budgetDifference = Math.abs(destination.price - userPreferences.budget);
    score += Math.max(0, 50 - budgetDifference);
    
    // Add rating to the score
    score += destination.rating * 5;
    
    return score;
}

// Handle survey submission
function handleSurveySubmission(e) {
    e.preventDefault();
    
    // Filter destinations based on preferences
    filteredDestinations = destinations.filter(dest => {
        const matchesBudget = dest.price <= userPreferences.budget * 1.5;
        
        let matchesPreferences = true;
        if (userPreferences.travelerType) {
            matchesPreferences = dest.tags.includes(userPreferences.travelerType);
        }
        if (userPreferences.travelCompanion) {
            matchesPreferences = matchesPreferences && dest.tags.includes(userPreferences.travelCompanion);
        }
        
        return matchesBudget && matchesPreferences;
    });
    
    // Sort by recommendation score
    sortDestinations('Recommended');
    renderDestinations(filteredDestinations);
    
    // Scroll to recommendations section
    document.querySelector('.recommendations-section').scrollIntoView({ behavior: 'smooth' });
}

// Render destinations to the DOM
function renderDestinations(dests) {
    destinationGrid.innerHTML = '';
    
    if (dests.length === 0) {
        destinationGrid.innerHTML = '<p class="no-results">No destinations found matching your criteria.</p>';
        return;
    }

    dests.forEach(dest => {
        const destinationCard = document.createElement('div');
        destinationCard.className = 'destination-card';
        destinationCard.innerHTML = `
            <div class="destination-img">
                <img src="${dest.image}" alt="${dest.name}">
            </div>
            <div class="destination-info">
                <h3>${dest.name}</h3>
                <p>${dest.description}</p>
                <div class="destination-meta">
                    <span class="destination-price">$${dest.price}/day</span>
                    <span class="destination-rating">
                        <i class="fas fa-star"></i> ${dest.rating}
                    </span>
                </div>
            </div>
        `;
        destinationGrid.appendChild(destinationCard);
    });
}

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
