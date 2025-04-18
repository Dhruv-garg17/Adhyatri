// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCgcAJAQH3Ml0VesmBmCwbuGFZgGgdc4mE",
    authDomain: "adhyatri-51e42.firebaseapp.com",
    databaseURL: "https://adhyatri-51e42-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "adhyatri-51e42",
    storageBucket: "adhyatri-51e42.firebasestorage.app",
    messagingSenderId: "512542274657",
    appId: "1:512542274657:web:89163ec23887d7f838e620",
    measurementId: "G-87LGL4MKBM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// DOM Elements
const elements = {
    destinationInput: document.getElementById('destination-select'),
    destinationList: document.getElementById('destination-list'),
    destinationPreview: document.getElementById('destination-preview'),
    destinationImage: document.getElementById('destination-image'),
    destinationName: document.getElementById('destination-name'),
    averageRating: document.getElementById('average-rating'),
    ratingCount: document.getElementById('rating-count'),
    starIcons: document.querySelectorAll('.star-rating i'),
    userRatingInput: document.getElementById('user-rating'),
    reviewTitleInput: document.getElementById('review-title'),
    reviewTextInput: document.getElementById('review-text'),
    tripDateInput: document.getElementById('trip-date'),
    tripTypeSelect: document.getElementById('trip-type'),
    submitReviewButton: document.getElementById('submit-review'),
    reviewsList: document.getElementById('reviews-list')
};

// Global Variables
let destinationMap = {};
let currentUser = null;

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
    setupAuthStateListener();
    fetchDestinations();
    initializeSearch();
    setupStarRating();
    setupFormSubmission();
});

// Set up authentication state listener
function setupAuthStateListener() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        console.log("Auth state:", user ? "User logged in" : "User logged out");
        elements.submitReviewButton.disabled = !user;
        
        // Refresh reviews when auth state changes
        const destId = elements.destinationInput.dataset.selectedId;
        if (destId) {
            fetchRecentReviews(destId);
        }
    });
}

// Fetch Destinations from Firebase
function fetchDestinations() {
    console.log("Fetching destinations from Firebase...");
    
    db.ref('/').once('value')
        .then(snapshot => {
            const data = snapshot.val();
            
            // Convert array structure to destination map
            destinationMap = {};
            for (let i = 0; i < 10; i++) {
                if (data && data[i]) {
                    const destKey = `dest-${i}`;
                    destinationMap[destKey] = data[i];
                    destinationMap[destKey].id = destKey;
                }
            }
            
            if (Object.keys(destinationMap).length === 0) {
                console.error("No valid destinations found");
            }
        })
        .catch(error => {
            console.error("Firebase error:", error);
        });
}

// Initialize Search Functionality
function initializeSearch() {
    const { destinationInput, destinationList } = elements;
    
    destinationInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 1) {
            destinationList.classList.add('hidden');
            return;
        }

        const results = Object.keys(destinationMap)
            .filter(id => {
                const dest = destinationMap[id];
                return dest && dest.name && dest.name.toLowerCase().includes(query);
            })
            .sort((a, b) => destinationMap[a].name.localeCompare(destinationMap[b].name));

        renderSearchResults(results);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!destinationInput.contains(e.target) && !destinationList.contains(e.target)) {
            destinationList.classList.add('hidden');
        }
    });
}

// Render Search Results
function renderSearchResults(results) {
    const { destinationList } = elements;
    
    destinationList.innerHTML = '';
    
    if (results.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No matching destinations found';
        li.className = 'no-results';
        destinationList.appendChild(li);
    } else {
        results.slice(0, 5).forEach(id => {
            const dest = destinationMap[id];
            const li = document.createElement('li');
            li.textContent = dest.name;
            li.dataset.id = id;
            li.addEventListener('click', () => selectDestination(id));
            destinationList.appendChild(li);
        });
    }
    
    destinationList.classList.remove('hidden');
}

// Handle Destination Selection
function selectDestination(id) {
    const { destinationInput, destinationList } = elements;
    const destination = destinationMap[id];
    
    if (!destination) return;

    destinationInput.value = destination.name;
    destinationInput.dataset.selectedId = id;
    destinationList.classList.add('hidden');
    
    updateDestinationPreview(id);
}

// Update Destination Preview
function updateDestinationPreview(id) {
    const { destinationPreview, destinationImage, destinationName } = elements;
    const destination = destinationMap[id];
    
    if (!destination) return;

    if (destination.images && destination.images.length > 0) {
        destinationImage.src = destination.images[0];
        destinationImage.alt = destination.name;
        destinationImage.style.display = 'block';
    } else {
        destinationImage.style.display = 'none';
    }
    
    destinationName.textContent = destination.name;
    destinationPreview.classList.remove('hidden');

    fetchDestinationRating(id);
    fetchRecentReviews(id);
}

// Fetch Destination Rating
function fetchDestinationRating(destId) {
    const { averageRating, ratingCount } = elements;
    
    db.ref(`reviews/${destId}`).once('value')
        .then(snapshot => {
            const reviews = snapshot.val();
            if (reviews) {
                const ratings = Object.values(reviews).map(r => r.rating);
                const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length);
                averageRating.textContent = avg.toFixed(1);
                ratingCount.textContent = `(${ratings.length} reviews)`;
            } else {
                averageRating.textContent = 'N/A';
                ratingCount.textContent = '(0 reviews)';
            }
        })
        .catch(error => {
            console.error("Error fetching ratings:", error);
        });
}

// Setup Star Rating
function setupStarRating() {
    const { starIcons, userRatingInput } = elements;
    
    starIcons.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            userRatingInput.value = rating;
            updateStarDisplay(rating);
        });
    });
}

// Update Star Display
function updateStarDisplay(rating) {
    const { starIcons } = elements;
    
    starIcons.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// Setup Form Submission
function setupFormSubmission() {
    elements.submitReviewButton.addEventListener('click', submitReview);
}
document.addEventListener('DOMContentLoaded', () => {
    setupAuthStateListener();
    fetchDestinations();
    initializeSearch();
    setupStarRating();
    
    // Fixed: Proper form submission setup
    elements.submitReviewButton.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        // submitReview();
    });
});

//show message 
// Function to show message anywhere on the page
function showMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`; // Add type to apply different styles
    document.body.appendChild(messageElement); // Add the message to the body

    // Optionally, remove the message after a few seconds
    setTimeout(() => {
        messageElement.remove();
    }, 5000); // Remove after 5 seconds
}


// Submit Review
async function submitReview() {
    if (!currentUser) {
        alert('Please sign in to submit a review.');
        return;
    }

    const {
        destinationInput,
        userRatingInput,
        reviewTitleInput,
        reviewTextInput,
        tripDateInput,
        tripTypeSelect,
        submitReviewButton
    } = elements;
    
    const destId = destinationInput.dataset.selectedId;
    const rating = parseInt(userRatingInput.value);
    const title = reviewTitleInput.value.trim();
    const text = reviewTextInput.value.trim();
    const tripDate = tripDateInput.value;
    const tripType = tripTypeSelect.value;

    if (!destId || rating === 0 || !title || !text || !tripDate) {
        showMessage('Please sign in to submit a review.', 'error');
        alert('Please fill in all required fields and select a destination.');
        return;
    }

    const originalText = submitReviewButton.textContent;
    submitReviewButton.disabled = true;
    submitReviewButton.textContent = 'Submitting...';

    try {
        const reviewData = {
            rating,
            title,
            text,
            tripDate,
            tripType,
            timestamp: Date.now(),
            destinationName: destinationInput.value,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Anonymous',
            userEmail: currentUser.email || '',
            reviewId: db.ref().child('reviews').push().key
        };

        await db.ref(`reviews/${destId}/${reviewData.reviewId}`).set(reviewData);
        
        alert('Review submitted successfully!');
        resetForm();
        fetchDestinationRating(destId);
        fetchRecentReviews(destId);
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Error submitting review. Please try again.');
    } finally {
        submitReviewButton.disabled = false;
        submitReviewButton.textContent = originalText;
    }
}

// Reset Form
function resetForm() {
    const {
        userRatingInput,
        reviewTitleInput,
        reviewTextInput,
        tripDateInput,
        tripTypeSelect,
        starIcons
    } = elements;
    
    userRatingInput.value = 0;
    reviewTitleInput.value = '';
    reviewTextInput.value = '';
    tripDateInput.value = '';
    tripTypeSelect.value = 'solo';
    updateStarDisplay(0);
}

// Fetch Recent Reviews
async function fetchRecentReviews(destId) {
    const { reviewsList } = elements;
    reviewsList.innerHTML = '<p>Loading reviews...</p>';

    try {
        const snapshot = await db.ref(`reviews/${destId}`).orderByChild('timestamp').limitToLast(50).once('value');
        const allReviews = snapshot.val() || {};
        
        const reviewsToShow = currentUser 
            ? Object.values(allReviews).filter(review => review.userId === currentUser.uid)
            : Object.values(allReviews);
        
        const sortedReviews = reviewsToShow.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

        reviewsList.innerHTML = '';
        
        if (sortedReviews.length === 0) {
            reviewsList.innerHTML = currentUser 
                ? '<p>You have no reviews for this destination yet</p>'
                : '<p>No reviews yet. Be the first to review!</p>';
        } else {
            sortedReviews.forEach(review => {
                const reviewElement = createReviewElement(review);
                if (currentUser && review.userId === currentUser.uid) {
                    addReviewActions(reviewElement, review, destId);
                }
                reviewsList.appendChild(reviewElement);
            });
        }
    } catch (error) {
        console.error("Error fetching reviews:", error);
        reviewsList.innerHTML = '<p class="error">Error loading reviews</p>';
    }
}

// Create Review Element
function createReviewElement(review) {
    const reviewDate = new Date(review.timestamp);
    const formattedDate = reviewDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const div = document.createElement('div');
    div.className = 'review-item';
    div.dataset.reviewId = review.reviewId;
    div.innerHTML = `
        <div class="review-header">
            <h3>${review.title}</h3>
        </div>
        <div class="review-meta">
            <span class="review-location">${review.destinationName}</span>
            <span class="review-author">By ${review.userName}</span>
            <span class="review-date">${formattedDate}</span>
        </div>
        <div class="star-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
        <p class="review-text">${review.text}</p>
        <div class="trip-details">
            <span>Trip Date: ${review.tripDate}</span>
            <span>Trip Type: ${review.tripType}</span>
        </div>
    `;
    return div;
}

// Add Edit/Delete buttons to user's reviews
function addReviewActions(reviewElement, review, destId) {
    const header = reviewElement.querySelector('.review-header');
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'review-actions';
    actionsDiv.innerHTML = `
        <button class="edit-review" data-id="${review.reviewId}">
            <i class="fas fa-edit"></i> Edit
        </button>
        <button class="delete-review" data-id="${review.reviewId}">
            <i class="fas fa-trash"></i> Delete
        </button>
    `;
    header.appendChild(actionsDiv);

    reviewElement.querySelector('.edit-review').addEventListener('click', () => editReview(review, destId));
    reviewElement.querySelector('.delete-review').addEventListener('click', () => deleteReview(review.reviewId, destId));
}

// Edit Review
function editReview(review, destId) {
    const {
        userRatingInput,
        reviewTitleInput,
        reviewTextInput,
        tripDateInput,
        tripTypeSelect,
        submitReviewButton,
        destinationInput
    } = elements;
    
    // Fill form with review data
    destinationInput.value = review.destinationName;
    destinationInput.dataset.selectedId = destId;
    userRatingInput.value = review.rating;
    reviewTitleInput.value = review.title;
    reviewTextInput.value = review.text;
    tripDateInput.value = review.tripDate;
    tripTypeSelect.value = review.tripType;
    updateStarDisplay(review.rating);
    
    // Change button to "Update Review"
    submitReviewButton.textContent = 'Update Review';
    submitReviewButton.onclick = async function() {
        await updateReview(review.reviewId, destId);
    };
    
    // Scroll to review form
    document.querySelector('.review-form').scrollIntoView({ behavior: 'smooth' });
}

// Update Review
async function updateReview(reviewId, destId) {
    const {
        userRatingInput,
        reviewTitleInput,
        reviewTextInput,
        tripDateInput,
        tripTypeSelect,
        submitReviewButton,
        destinationInput
    } = elements;
    
    const updatedReview = {
        rating: parseInt(userRatingInput.value),
        title: reviewTitleInput.value.trim(),
        text: reviewTextInput.value.trim(),
        tripDate: tripDateInput.value,
        tripType: tripTypeSelect.value,
        timestamp: Date.now(),
        destinationName: destinationInput.value,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userEmail: currentUser.email || ''
    };

    try {
        await db.ref(`reviews/${destId}/${reviewId}`).update(updatedReview);
        alert('Review updated successfully!');
        resetForm();
        fetchDestinationRating(destId);
        fetchRecentReviews(destId);
        
        // Reset button to original state
        submitReviewButton.textContent = 'Submit Review';
        submitReviewButton.onclick = submitReview;
    } catch (error) {
        console.error('Error updating review:', error);
        alert('Error updating review. Please try again.');
    }
}

// Delete Review
async function deleteReview(reviewId, destId) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
        await db.ref(`reviews/${destId}/${reviewId}`).remove();
        alert('Review deleted successfully!');
        fetchDestinationRating(destId);
        fetchRecentReviews(destId);
    } catch (error) {
        console.error('Error deleting review:', error);
        alert('Error deleting review. Please try again.');
    }
}