// Import Firebase modules

import { db, auth } from './JS/firebase.js'; 
import { ref, get,set, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";


// Global variables
let map;
let markers = [];
let destinations = [];
let currentDay = 1;
let tripDuration = 0;
let activities = {};
let currentUser = null;

// Initialize Firebase and load destinations when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
    initMap();
    loadDestinations();
    setupEventListeners();
    setupDateValidation();
    setupBudgetCalculation();
    
    // Check authentication state
   
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("User is signed in:", user.uid);
            // Load user's saved trips if they're signed in
            loadSavedTrips();
        } else {
            console.log("No user is signed in");
            currentUser = null;
            document.getElementById("load-trips-btn").disabled = true;
        }
    });
});

// Load destinations directly from Firebase root (array structure)

function loadDestinations() {
    const rootRef = ref(db); // Or ref(db, "destinations") if needed

    get(rootRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (typeof data === 'object') {
                destinations = Object.entries(data)
                    .filter(([key]) => !isNaN(parseInt(key)))
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([_, val]) => val);

                console.log("✅ Destinations loaded:", destinations);
                populateDestinationDropdown();
            }
        } else {
            console.log("⚠️ No data found at root");
        }
    }).catch((error) => {
        console.error("🔥 Error loading destinations:", error);
    });
}

// Populate the destination dropdown
function populateDestinationDropdown() {
    const select = document.getElementById("destination-select");
    select.innerHTML = '<option value="">Select a destination</option>';
    
    destinations.forEach((destination, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = destination.name;
        select.appendChild(option);
    });
}

// Initialize Leaflet map
function initMap() {
    map = L.map('map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Set up all event listeners
function setupEventListeners() {
    // Destination selection
    document.getElementById("destination-select").addEventListener("change", onDestinationChange);
    
    // Date selection
    document.getElementById("start-date").addEventListener("change", updateTripDuration);
    document.getElementById("end-date").addEventListener("change", updateTripDuration);
    
    // Itinerary navigation
    document.getElementById("prev-day").addEventListener("click", () => navigateDay(-1));
    document.getElementById("next-day").addEventListener("click", () => navigateDay(1));
    
    // Activity management
    document.getElementById("add-activity").addEventListener("click", showActivityModal);
    document.querySelector(".close-modal").addEventListener("click", hideActivityModal);
    document.getElementById("activity-form").addEventListener("submit", addActivity);
    
    // Trip management
    document.getElementById("save-trip").addEventListener("click", saveTrip);
    document.getElementById("share-trip").addEventListener("click", shareTrip);
    
    // Load saved trips
    document.getElementById("load-trips-btn").addEventListener("click", toggleTripHistory);
    document.getElementById("load-selected-trip").addEventListener("click", loadSelectedTrip);
    document.getElementById("delete-selected-trip").addEventListener("click", deleteSelectedTrip);
    
    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
        const modal = document.getElementById("activity-modal");
        if (event.target === modal) {
            hideActivityModal();
        }
    });
}

// Handle destination selection change
function onDestinationChange(event) {
    const destinationIndex = event.target.value;
    const destinationInfo = document.getElementById("destination-info");
    
    if (destinationIndex === "") {
        destinationInfo.classList.add("hidden");
        return;
    }
    
    const destination = destinations[destinationIndex];
    
    // Update destination info display
    document.getElementById("destination-name").textContent = destination.name;
    document.getElementById("destination-description").textContent = destination.description || "No description available";
    
    // Display pricing info if available
    const priceElement = document.getElementById("destination-price");
    if (destination.budget) {
        // Use budget as a price indicator
        switch(destination.budget) {
            case "budget":
                priceElement.textContent = "50-100";
                break;
            case "mid-range":
                priceElement.textContent = "100-200";
                break;
            case "luxury":
                priceElement.textContent = "200+";
                break;
            default:
                priceElement.textContent = "100"; // Default value
        }
    } else {
        priceElement.textContent = "100"; // Default value
    }
    
    // Set rating (if not available, set a default)
    document.getElementById("destination-rating").textContent = destination.rating || "4.5";
    
    // Set image (use first image from array if available)
    const imageUrl = destination.images && destination.images.length > 0 
        ? destination.images[0] 
        : "/images/placeholder.jpg";
    document.getElementById("destination-image").src = imageUrl;
    
    destinationInfo.classList.remove("hidden");
    
    // Update map with location data
    if (destination.location) {
        updateMap(destination);
    }
}

// Update map with destination location
function updateMap(destination) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add marker for destination
    if (destination.location && destination.location.latitude && destination.location.longitude) {
        const marker = L.marker([destination.location.latitude, destination.location.longitude])
            .addTo(map)
            .bindPopup(`<b>${destination.name}</b>`);
        
        markers.push(marker);
        map.setView([destination.location.latitude, destination.location.longitude], 12);
    }
}

// Validate dates and update trip duration
function setupDateValidation() {
    const startDateInput = document.getElementById("start-date");
    const endDateInput = document.getElementById("end-date");
    
    // Set minimum date to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    startDateInput.min = todayStr;
    endDateInput.min = todayStr;
    
    // Set default start date to today
    startDateInput.value = todayStr;
    
    // Set default end date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    endDateInput.value = tomorrow.toISOString().split('T')[0];
    
    // Initial calculation
    updateTripDuration();
}

// Update trip duration based on selected dates
function updateTripDuration() {
    const startDate = new Date(document.getElementById("start-date").value);
    const endDate = new Date(document.getElementById("end-date").value);
    const errorMsg = document.getElementById("date-error");
    
    // Validate dates
    if (endDate < startDate) {
        errorMsg.classList.remove("hidden");
        document.getElementById("calendar-preview").classList.add("hidden");
        return;
    }
    
    errorMsg.classList.add("hidden");
    
    // Calculate duration in days
    const diffTime = Math.abs(endDate - startDate);
    tripDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day
    
    // Update UI
    document.getElementById("trip-duration").textContent = tripDuration;
    document.getElementById("calendar-preview").classList.remove("hidden");
    document.getElementById("itinerary-container").classList.remove("hidden");
    
    // Update budget days
    document.getElementById("accommodation-nights").textContent = tripDuration - 1; // -1 because last day doesn't need accommodation
    document.getElementById("food-days").textContent = tripDuration;
    document.getElementById("activities-days").textContent = tripDuration;
    
    // Reset current day if necessary
    if (currentDay > tripDuration) {
        currentDay = 1;
    }
    
    // Initialize activities for all days
    for (let day = 1; day <= tripDuration; day++) {
        if (!activities[day]) {
            activities[day] = [];
        }
    }
    
    // Update itinerary display
    updateItineraryView();
    updateBudgetTotals();
}

// Navigate between days in the itinerary
function navigateDay(direction) {
    const newDay = currentDay + direction;
    
    if (newDay >= 1 && newDay <= tripDuration) {
        currentDay = newDay;
        updateItineraryView();
    }
}

// Update the itinerary view for the current day
function updateItineraryView() {
    // Update current day display
    document.getElementById("current-day").textContent = currentDay;
    
    // Update time slots
    const timeSlots = document.getElementById("time-slots");
    timeSlots.innerHTML = "";
    
    // Get activities for current day
    const dayActivities = activities[currentDay] || [];
    
    // Sort activities by time
    dayActivities.sort((a, b) => {
        return a.timeInMinutes - b.timeInMinutes;
    });
    
    // Create time slots from 6 AM to 10 PM
    for (let hour = 6; hour <= 22; hour++) {
        const timeSlot = document.createElement("div");
        timeSlot.className = "time-slot";
        
        const timeLabel = document.createElement("div");
        timeLabel.className = "time-label";
        timeLabel.textContent = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
        
        const slotContent = document.createElement("div");
        slotContent.className = "slot-content";
        
        // Check if we have activities in this hour
        const hourActivities = dayActivities.filter(activity => {
            const activityHour = Math.floor(activity.timeInMinutes / 60);
            return activityHour === hour;
        });
        
        if (hourActivities.length > 0) {
            hourActivities.forEach(activity => {
                const activityEl = createActivityElement(activity);
                slotContent.appendChild(activityEl);
            });
        }
        
        timeSlot.appendChild(timeLabel);
        timeSlot.appendChild(slotContent);
        timeSlots.appendChild(timeSlot);
    }
}

// Create activity element for the itinerary
function createActivityElement(activity) {
    const activityEl = document.createElement("div");
    activityEl.className = `activity-item ${activity.type}`;
    
    // Set icon based on activity type
    let icon = "fa-question";
    switch(activity.type) {
        case "attraction":
            icon = "fa-camera";
            break;
        case "restaurant":
            icon = "fa-utensils";
            break;
        case "transport":
            icon = "fa-car";
            break;
        case "accommodation":
            icon = "fa-bed";
            break;
        default:
            icon = "fa-calendar-check";
    }
    
    activityEl.innerHTML = `
        <div class="activity-header">
            <i class="fas ${icon}"></i>
            <h4>${activity.name}</h4>
            <div class="activity-time">${formatTime(activity.timeInMinutes)}</div>
        </div>
        <div class="activity-details">
            <div class="activity-duration">Duration: ${activity.duration} hour(s)</div>
            <div class="activity-cost">Cost: $${activity.cost}</div>
            ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
            ${activity.location ? `<div class="activity-location"><i class="fas fa-map-marker-alt"></i> ${activity.location}</div>` : ''}
        </div>
        <div class="activity-actions">
            <button class="btn-small edit-activity" data-id="${activity.id}"><i class="fas fa-edit"></i></button>
            <button class="btn-small delete-activity" data-id="${activity.id}"><i class="fas fa-trash"></i></button>
        </div>
    `;
    
    // Add event listeners for edit and delete buttons
    activityEl.querySelector(".edit-activity").addEventListener("click", () => editActivity(activity));
    activityEl.querySelector(".delete-activity").addEventListener("click", () => deleteActivity(activity.id));
    
    return activityEl;
}

// Format time from minutes to HH:MM AM/PM
function formatTime(timeInMinutes) {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    const period = hours < 12 ? 'AM' : 'PM';
    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${formattedHours}:${formattedMinutes} ${period}`;
}

// Show activity modal
function showActivityModal() {
    document.getElementById("activity-modal").classList.remove("hidden");
    document.getElementById("activity-form").reset();
}

// Hide activity modal
function hideActivityModal() {
    document.getElementById("activity-modal").classList.add("hidden");
}

// Add new activity
function addActivity(event) {
    event.preventDefault();
    
    const name = document.getElementById("activity-name").value;
    const type = document.getElementById("activity-type").value;
    const timeInput = document.getElementById("activity-time").value;
    const duration = parseInt(document.getElementById("activity-duration").value);
    const cost = parseFloat(document.getElementById("activity-cost").value);
    const notes = document.getElementById("activity-notes").value;
    const location = document.getElementById("activity-location").value;
    
    // Convert time input (HH:MM) to minutes since midnight
    const [hours, minutes] = timeInput.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    // Create activity object
    const activity = {
        id: Date.now().toString(), // Unique ID
        name,
        type,
        timeInMinutes,
        duration,
        cost,
        notes,
        location
    };
    
    // Add to activities for current day
    if (!activities[currentDay]) {
        activities[currentDay] = [];
    }
    
    activities[currentDay].push(activity);
    
    // Update UI
    updateItineraryView();
    hideActivityModal();
    updateBudgetTotals();
    
    // Add marker to map if location is provided
    if (location) {
        addActivityMarker(activity);
    }
}

// Add marker for activity on map
function addActivityMarker(activity) {
    // In a real application, you would use a geocoding service to convert the location to coordinates
    // For now, we'll use the destination coordinates with a slight offset
    const destinationIndex = document.getElementById("destination-select").value;
    const destination = destinations[destinationIndex];
    
    if (destination && destination.location && destination.location.latitude && destination.location.longitude) {
        // Add random offset to create different markers around the destination
        const latOffset = (Math.random() - 0.5) * 0.02;
        const lngOffset = (Math.random() - 0.5) * 0.02;
        
        const lat = destination.location.latitude + latOffset;
        const lng = destination.location.longitude + lngOffset;
        
        let icon = L.divIcon({
            className: `marker-icon ${activity.type}-icon`,
            html: getActivityIconHTML(activity.type),
            iconSize: [30, 30]
        });
        
        const marker = L.marker([lat, lng], { icon })
            .addTo(map)
            .bindPopup(`
                <b>${activity.name}</b><br>
                Day ${currentDay}, ${formatTime(activity.timeInMinutes)}<br>
                Duration: ${activity.duration} hour(s)<br>
                Cost: $${activity.cost}
            `);
        
        markers.push(marker);
    }
}

// Get HTML for activity marker icon
function getActivityIconHTML(type) {
    let iconClass = "fa-calendar-check";
    
    switch(type) {
        case "attraction":
            iconClass = "fa-camera";
            break;
        case "restaurant":
            iconClass = "fa-utensils";
            break;
        case "transport":
            iconClass = "fa-car";
            break;
        case "accommodation":
            iconClass = "fa-bed";
            break;
    }
    
    return `<i class="fas ${iconClass}"></i>`;
}

// Edit activity
function editActivity(activity) {
    // Populate form with activity data
    document.getElementById("activity-name").value = activity.name;
    document.getElementById("activity-type").value = activity.type;
    
    // Convert time from minutes to HH:MM format
    const hours = Math.floor(activity.timeInMinutes / 60).toString().padStart(2, '0');
    const minutes = (activity.timeInMinutes % 60).toString().padStart(2, '0');
    document.getElementById("activity-time").value = `${hours}:${minutes}`;
    
    document.getElementById("activity-duration").value = activity.duration;
    document.getElementById("activity-cost").value = activity.cost;
    document.getElementById("activity-notes").value = activity.notes;
    document.getElementById("activity-location").value = activity.location;
    
    // Remove old activity
    deleteActivity(activity.id);
    
    // Show modal to add updated activity
    showActivityModal();
}

// Delete activity
function deleteActivity(activityId) {
    // Find and remove activity from current day
    const dayActivities = activities[currentDay];
    if (dayActivities) {
        const index = dayActivities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            dayActivities.splice(index, 1);
            updateItineraryView();
            updateBudgetTotals();
        }
    }
}

// Setup budget calculation
function setupBudgetCalculation() {
    // Add event listeners to budget inputs
    document.getElementById("accommodation-cost").addEventListener("input", updateBudgetTotals);
    document.getElementById("food-cost").addEventListener("input", updateBudgetTotals);
    document.getElementById("activities-cost").addEventListener("input", updateBudgetTotals);
    document.getElementById("transportation-cost").addEventListener("input", updateBudgetTotals);
}

// Update budget totals
function updateBudgetTotals() {
    // Get input values
    const accommodationCost = parseFloat(document.getElementById("accommodation-cost").value) || 0;
    const foodCost = parseFloat(document.getElementById("food-cost").value) || 0;
    const activitiesCost = parseFloat(document.getElementById("activities-cost").value) || 0;
    const transportationCost = parseFloat(document.getElementById("transportation-cost").value) || 0;
    
    // Calculate totals based on trip duration
    const accommodationNights = tripDuration - 1; // Last day doesn't need accommodation
    const accommodationTotal = accommodationCost * accommodationNights;
    const foodTotal = foodCost * tripDuration;
    const activitiesTotal = activitiesCost * tripDuration;
    
    // Calculate activity costs from itinerary
    let plannedActivitiesCost = 0;
    for (const day in activities) {
        activities[day].forEach(activity => {
            plannedActivitiesCost += activity.cost;
        });
    }
    
    // Update UI
    document.getElementById("accommodation-total").textContent = accommodationTotal.toFixed(2);
    document.getElementById("food-total").textContent = foodTotal.toFixed(2);
    document.getElementById("activities-total").textContent = activitiesTotal.toFixed(2);
    
    // Calculate total cost
    const totalCost = accommodationTotal + foodTotal + activitiesTotal + transportationCost + plannedActivitiesCost;
    document.getElementById("total-cost").textContent = totalCost.toFixed(2);
}

// Save trip to Firebase
function saveTrip() {
    if (!currentUser) {
        alert("Please sign in to save your trip");
        return;
    }
    
    const destinationIndex = document.getElementById("destination-select").value;
    if (!destinationIndex) {
        alert("Please select a destination");
        return;
    }
    
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    
    if (!startDate || !endDate) {
        alert("Please select travel dates");
        return;
    }
    
    // Create trip object
    const trip = {
        destination: destinations[destinationIndex].name,
        destinationIndex,
        startDate,
        endDate,
        activities,
        budget: {
            accommodation: parseFloat(document.getElementById("accommodation-cost").value) || 0,
            food: parseFloat(document.getElementById("food-cost").value) || 0,
            activities: parseFloat(document.getElementById("activities-cost").value) || 0,
            transportation: parseFloat(document.getElementById("transportation-cost").value) || 0
        },
        createdAt: new Date().toISOString()
    };
    
    // Save to Firebase
    // const db = getDatabase();
    const tripId = `trip_${Date.now()}`;
    const tripRef = ref(db, `users/${currentUser.uid}/trips/${tripId}`);
    
    set(tripRef, trip)
        .then(() => {
            alert("Trip saved successfully!");
            loadSavedTrips(); // Refresh the saved trips list
        })
        .catch((error) => {
            console.error("Error saving trip:", error);
            alert("Failed to save trip. Please try again.");
        });
}

// Share trip
function shareTrip() {
    // In a real application, you would generate a shareable link or allow sharing via email/social media
    alert("Sharing functionality will be implemented in a future update.");
}

// Toggle trip history display
function toggleTripHistory() {
    const tripHistoryContainer = document.getElementById("trip-history-container");
    
    if (tripHistoryContainer.classList.contains("hidden")) {
        tripHistoryContainer.classList.remove("hidden");
        loadSavedTrips();
    } else {
        tripHistoryContainer.classList.add("hidden");
    }
}

// Load user's saved trips
function loadSavedTrips() {
    if (!currentUser) {
        return;
    }
    
    // const db = getDatabase();
    const tripsRef = ref(db, `users/${currentUser.uid}/trips`);
    
    get(tripsRef)
        .then((snapshot) => {
            const select = document.getElementById("saved-trips-select");
            select.innerHTML = '<option value="">Select a saved trip</option>';
            
            if (snapshot.exists()) {
                const trips = snapshot.val();
                
                Object.entries(trips).forEach(([tripId, trip]) => {
                    const option = document.createElement("option");
                    option.value = tripId;
                    option.textContent = `${trip.destination} (${trip.startDate} to ${trip.endDate})`;
                    select.appendChild(option);
                });
            } else {
                console.log("No saved trips found");
            }
        })
        .catch((error) => {
            console.error("Error loading saved trips:", error);
        });
}

// Load selected trip
function loadSelectedTrip() {
    const tripId = document.getElementById("saved-trips-select").value;
    
    if (!tripId) {
        alert("Please select a trip to load");
        return;
    }
    
    // const db = getDatabase();
    const tripRef = ref(db, `users/${currentUser.uid}/trips/${tripId}`);
    
    get(tripRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const trip = snapshot.val();
                
                // Populate UI with trip data
                document.getElementById("destination-select").value = trip.destinationIndex;
                document.getElementById("start-date").value = trip.startDate;
                document.getElementById("end-date").value = trip.endDate;
                
                // Trigger destination change event
                const event = new Event("change");
                document.getElementById("destination-select").dispatchEvent(event);
                
                // Update activities
                activities = trip.activities;
                
                // Update budget inputs
                document.getElementById("accommodation-cost").value = trip.budget.accommodation;
                document.getElementById("food-cost").value = trip.budget.food;
                document.getElementById("activities-cost").value = trip.budget.activities;
                document.getElementById("transportation-cost").value = trip.budget.transportation;
                
                // Update trip duration
                updateTripDuration();
                
                // Hide trip history
                document.getElementById("trip-history-container").classList.add("hidden");
                _
                alert("Trip loaded successfully!");
            } else {
                alert("Trip not found");
            }
        })
        .catch((error) => {
            console.error("Error loading trip:", error);
            alert("Failed to load trip. Please try again.");
        });
}

// Delete selected trip
function deleteSelectedTrip() {
    const tripId = document.getElementById("saved-trips-select").value;
    
    if (!tripId) {
        alert("Please select a trip to delete");
        return;
    }
    
    if (!confirm("Are you sure you want to delete this trip?")) {
        return;
    }
    
    // const db = getDatabase();
    const tripRef = ref(db, `users/${currentUser.uid}/trips/${tripId}`);
    
    remove(tripRef)
        .then(() => {
            alert("Trip deleted successfully!");
            loadSavedTrips(); // Refresh the saved trips list
        })
        .catch((error) => {
            console.error("Error deleting trip:", error);
            alert("Failed to delete trip. Please try again.");
        });
}