import { auth, db } from './JS/firebase.js';
import { get, ref } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// DOM Elements
const surveyContainer = document.querySelector('.survey-container');
const recommendationsSection = document.querySelector('.recommendations-section');
const destinationGrid = document.querySelector('.destination-grid');
const getRecommendationsBtn = document.getElementById('getRecommendationsBtn');
const optionCards = document.querySelectorAll('.option-card');
const filterSelect = document.getElementById('filter-by');
const mapContainer = document.querySelector('.map-container');
const trendingSlider = document.querySelector('.trending-slider');

// Global Variables
let destinations = [];
let filteredDestinations = [];
let userPreferences = {
    travelerType: null,
    duration: null,
    climate: null,
    budget: null,
    travelCompanion: null
};

// Initialize the page
async function initializePage() {
    await fetchDestinations();
    setupEventListeners();
    loadTrendingLocations();
    
    // Only show survey section initially
    surveyContainer.style.display = 'block';
    recommendationsSection.style.display = 'none';
}

// Fetch destinations from Firebase
async function fetchDestinations() {
    try {
        const snapshot = await get(ref(db, '/'));
        destinations = [];
        
        snapshot.forEach((childSnapshot) => {
            const dest = childSnapshot.val();
            if (dest && dest.name) {
                destinations.push({
                    id: childSnapshot.key,
                    ...dest
                });
            }
        });
        
        filteredDestinations = [...destinations];
        console.log('Successfully fetched destinations:', destinations);
    } catch (error) {
        console.error("Error fetching destinations: ", error);
    }
}

// Load trending locations (7-8 random destinations)
function loadTrendingLocations() {
    if (destinations.length === 0) return;

    // Shuffle array and get first 8 elements
    const shuffled = [...destinations].sort(() => 0.5 - Math.random());
    const trendingDestinations = shuffled.slice(0, 8);

    renderTrendingLocations(trendingDestinations);
}

// Render trending locations with proper image handling
function renderTrendingLocations(dests) {
    trendingSlider.innerHTML = '';

    dests.forEach(dest => {
        const col = document.createElement("div");
        col.className = "destination-card trending-card";

        col.innerHTML = `
            <h3>${dest.name}</h3>
            ${dest.images && dest.images.length ? 
                `<img src="${dest.images[0]}" alt="${dest.name}" class="compare-img" 
                    onerror="this.src='https://placehold.co/300x200?text=Image+Unavailable'">` : 
                `<img src="https://placehold.co/300x200?text=No+Image" alt="No image" class="compare-img">`}
            <p>${dest.description || 'No description available'}</p>
            <div class="destination-meta">
                <span class="destination-budget">${dest.budget || 'Budget not specified'}</span>
                <span class="destination-rating">
                    <i class="fas fa-star"></i> ${dest.rating || 'N/A'}
                </span>
            </div>
            ${dest.activities && dest.activities.length > 0 ? `
            <div class="activities-container">
                ${dest.activities.map(activity => `<span class="activity-tag">${activity}</span>`).join(' ')}
            </div>
            ` : ''}
        `;
        trendingSlider.appendChild(col);
    });
}



// Initialize map with a random recommended location
function initializeMap() {
    if (filteredDestinations.length === 0) return;

    // Get a random destination from recommendations
    const randomIndex = Math.floor(Math.random() * filteredDestinations.length);
    const location = filteredDestinations[randomIndex].location;

    if (!location || !location.latitude || !location.longitude) {
        mapContainer.innerHTML = '<p>Map data not available for this destination</p>';
        return;
    }

    // Clear previous map
    mapContainer.innerHTML = '<div id="map" style="height: 100%; width: 100%;"></div>';
    
    // Initialize Leaflet map
    const map = L.map('map').setView([location.latitude, location.longitude], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([location.latitude, location.longitude]).addTo(map)
        .bindPopup(`<b>${filteredDestinations[randomIndex].name}</b>`)
        .openPopup();
}

// Handle survey option selection
function handleOptionSelection(card, questionType) {
    const parentGrid = card.closest('.options-grid');
    parentGrid.querySelectorAll('.option-card').forEach(c => {
        c.classList.remove('selected');
    });
    card.classList.add('selected');
    
    switch(questionType) {
        case 'traveler':
            userPreferences.travelerType = card.querySelector('p').textContent.toLowerCase();
            break;
        case 'duration':
            userPreferences.duration = card.querySelector('label').textContent.toLowerCase();
            break;
        case 'climate':
            userPreferences.climate = card.querySelector('label').textContent.toLowerCase();
            break;
        case 'budget':
            userPreferences.budget = card.querySelector('p').textContent.toLowerCase();
            break;
        case 'companion':
            userPreferences.travelCompanion = card.querySelector('p').textContent.toLowerCase();
            break;
    }
}

// Calculate recommendation score
function calculateRecommendationScore(destination) {
    let score = 0;
    
    if (userPreferences.travelerType && destination.travelStyle) {
        if (destination.travelStyle.includes(userPreferences.travelerType)) score += 30;
    }
    
    if (userPreferences.travelCompanion && destination.travelStyle) {
        if (destination.travelStyle.includes(userPreferences.travelCompanion)) score += 20;
    }
    
    if (userPreferences.climate && destination.climate) {
        if (destination.climate.toLowerCase() === userPreferences.climate) score += 20;
    }
    
    if (userPreferences.duration && destination.duration) {
        if (destination.duration.toLowerCase() === userPreferences.duration) score += 15;
    }
    
    if (userPreferences.budget && destination.budget) {
        if (destination.budget.toLowerCase() === userPreferences.budget) score += 25;
    }
    
    return score;
}

// Filter and sort destinations
function filterAndSortDestinations() {
    // Filter based on preferences
    filteredDestinations = destinations.filter(dest => {
        let matches = true;
        
        if (userPreferences.travelerType && dest.travelStyle) {
            matches = matches && dest.travelStyle.includes(userPreferences.travelerType);
        }
        
        if (userPreferences.travelCompanion && dest.travelStyle) {
            matches = matches && dest.travelStyle.includes(userPreferences.travelCompanion);
        }
        
        if (userPreferences.climate && dest.climate) {
            matches = matches && (dest.climate.toLowerCase() === userPreferences.climate);
        }
        
        if (userPreferences.duration && dest.duration) {
            matches = matches && (dest.duration.toLowerCase() === userPreferences.duration);
        }
        
        if (userPreferences.budget && dest.budget) {
            matches = matches && (dest.budget.toLowerCase() === userPreferences.budget);
        }
        
        return matches;
    });
    
    // Sort by recommendation score
    filteredDestinations.sort((a, b) => {
        return calculateRecommendationScore(b) - calculateRecommendationScore(a);
    });
}

// Handle survey submission
function handleSurveySubmission(e) {
    e.preventDefault();
    
    filterAndSortDestinations();
    renderDestinations(filteredDestinations);
    initializeMap();
    
    // Hide survey questions but keep the container visible
    const surveySteps = document.querySelectorAll('.survey-step');
    surveySteps.forEach(step => {
        step.style.display = 'none';
    });
    
    // Show recommendations section
    recommendationsSection.style.display = 'block';
    
    // Add "Modify Preferences" button if it doesn't exist
    if (!document.querySelector('.back-to-survey')) {
        const backToSurvey = document.createElement('button');
        backToSurvey.className = 'btn back-to-survey';
        backToSurvey.textContent = 'Modify Preferences';
        backToSurvey.addEventListener('click', () => {
            surveySteps.forEach(step => {
                step.style.display = 'block';
            });
            recommendationsSection.style.display = 'none';
        });
        surveyContainer.appendChild(backToSurvey);
    }
    
    // Scroll to recommendations
    recommendationsSection.scrollIntoView({ behavior: 'smooth' });
}

// Filter destinations based on activity type
function filterDestinations() {
    const filterValue = filterSelect.value.toLowerCase();
    
    if (filterValue === 'all') {
        filteredDestinations = [...destinations];
    } else {
        filteredDestinations = destinations.filter(dest => {
            const interestsMatch = dest.interests && dest.interests.some(i => i.toLowerCase().includes(filterValue));
            const activitiesMatch = dest.activities && dest.activities.some(a => a.toLowerCase().includes(filterValue));
            return interestsMatch || activitiesMatch;
        });
    }
    
    renderDestinations(filteredDestinations);
}

// Render destinations in grid with proper image and activity handling
// Render destinations in grid with proper image and activity handling
function renderDestinations(dests) {
    destinationGrid.innerHTML = ''; // Clear previous content

    if (dests.length === 0) {
        destinationGrid.innerHTML = '<p class="no-results">No destinations found matching your criteria.</p>';
        return;
    }

    dests.forEach(dest => {
        const col = document.createElement("div");
        col.className = "destination-card recommended-card"; // Added a class for styling

        col.innerHTML = `
            <h3>${dest.name || 'Unnamed Destination'}</h3>
            ${dest.images && dest.images.length ? 
                `<img src="${dest.images[0]}" alt="${dest.name}" class="compare-img"
                    onerror="this.src='https://placehold.co/300x200?text=Image+Unavailable'">` : 
                `<img src="https://placehold.co/300x200?text=No+Image" alt="No image" class="compare-img">`}
            <p>${dest.description || 'No description available'}</p>
            <div class="destination-meta">
                <span class="destination-budget">${dest.budget ? dest.budget.charAt(0).toUpperCase() + dest.budget.slice(1) : 'Budget not specified'}</span>
                <span class="destination-rating">
                    <i class="fas fa-star"></i> ${dest.rating || 'N/A'}
                </span>
            </div>
            ${dest.activities && dest.activities.length > 0 ? `
            <div class="activities-container">
                ${dest.activities.map(activity => `<span class="activity-tag">${activity}</span>`).join(' ')}
            </div>
            ` : ''}
        `;
        destinationGrid.appendChild(col);
    });
}



// Set up event listeners
function setupEventListeners() {
    // Option cards for survey
    if (optionCards) {
        optionCards.forEach(card => {
            let questionType = '';
            const questionText = card.closest('.survey-step')?.querySelector('h3')?.textContent;
            
            if (questionText.includes('type of traveler')) questionType = 'traveler';
            else if (questionText.includes('duration of stay')) questionType = 'duration';
            else if (questionText.includes('preferred climate')) questionType = 'climate';
            else if (questionText.includes('travel budget')) questionType = 'budget';
            else if (questionText.includes('traveling with')) questionType = 'companion';
            
            if (questionType) {
                card.addEventListener('click', () => handleOptionSelection(card, questionType));
            }
        });
    }

    // Filter select
    if (filterSelect) {
        filterSelect.addEventListener('change', filterDestinations);
    }

    // Survey submission button
    if (getRecommendationsBtn) {
        getRecommendationsBtn.addEventListener('click', handleSurveySubmission);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initializePage);