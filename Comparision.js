document.addEventListener("DOMContentLoaded", () => {
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
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // DOM Elements
    const compareBtn = document.getElementById("compare-btn");
    const comparisonResults = document.getElementById("comparison-results");
    const destinationSelectors = [
        document.getElementById("destination-1"),
        document.getElementById("destination-2"),
        document.getElementById("destination-3")
    ];

    // Check if required elements exist
    if (!compareBtn || !comparisonResults || destinationSelectors.some(el => !el)) {
        console.error("Required DOM elements not found");
        return;
    }

    // Global variable to store destinations
    let destinationsArray = [];

    // Load all destination names from Firebase
    function loadDestinations() {
        db.ref('/').once("value")
            .then(snapshot => {
                const data = snapshot.val();
                if (!data) {
                    console.log("No destination data found");
                    return;
                }

                // Convert array-like structure to proper array
                destinationsArray = Object.values(data).filter(item => item && item.name);
                
                // Populate dropdowns
                destinationsArray.forEach((dest, index) => {
                    destinationSelectors.forEach(select => {
                        const option = document.createElement("option");
                        option.value = index; // Using array index as value
                        option.textContent = dest.name;
                        select.appendChild(option);
                    });
                });
            })
            .catch(error => {
                console.error("Error loading destinations:", error);
                alert("Error loading destinations. Please try again.");
            });
    }

    // Compare selected destinations
    async function compareDestinations() {
        const selectedIndexes = destinationSelectors
            .map(select => select.value)
            .filter(val => val !== "")
            .map(Number); // Convert to numbers

        if (selectedIndexes.length < 2) {
            alert("Please select at least 2 destinations.");
            return;
        }

        comparisonResults.classList.remove("hidden");
        compareBtn.disabled = true;
        compareBtn.textContent = "Comparing...";

        try {
            // Get destination data using array indexes
            const destinationsData = selectedIndexes.map(index => {
                if (index >= 0 && index < destinationsArray.length) {
                    const dest = {...destinationsArray[index], id: index};
                    return dest;
                }
                throw new Error(`Destination index ${index} not found`);
            });
            
            // Get ratings for each destination
            const ratingsPromises = selectedIndexes.map(index => 
                db.ref(`reviews/${index}`).once("value")
            );
            const ratingsSnapshots = await Promise.all(ratingsPromises);
            
            // Calculate average ratings
            destinationsData.forEach((dest, index) => {
                const reviews = ratingsSnapshots[index].val();
                if (reviews) {
                    const ratings = Object.values(reviews).map(r => r.rating);
                    dest.averageRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
                    dest.reviewCount = ratings.length;
                } else {
                    dest.averageRating = "0.0";
                    dest.reviewCount = 0;
                }
            });

            renderComparison(destinationsData);
        } catch (error) {
            console.error("Comparison error:", error);
            alert("Error comparing destinations. Please try again.");
        } finally {
            compareBtn.disabled = false;
            compareBtn.textContent = "Compare Destinations";
        }
    }

    // Helper function to determine best time to visit from climate data
    function getBestSeason(climate) {
        if (!climate) return "N/A";
        
        const climateLower = climate.toLowerCase();
        if (climateLower.includes("warm") || climateLower.includes("summer")) {
            return "Spring or Fall (Mar-May, Sep-Nov)";
        } else if (climateLower.includes("cold") || climateLower.includes("winter")) {
            return "Summer months (Jun-Aug)";
        } else if (climateLower.includes("tropical") || climateLower.includes("monsoon")) {
            return "Dry season (Nov-Apr)";
        } else if (climateLower.includes("mild") || climateLower.includes("temperate")) {
            return "Year-round destination";
        }
        return climate; // fallback to original text
    }

    // Render comparison table
    function renderComparison(destinations) {
        // Clear previous content
        const sections = [
            "destination-headers",
            "basic-info",
            "cost-comparison",
            "ratings-comparison",
            "activities-comparison",
            "interests-comparison",
            "season-comparison",
            "duration-comparison",
            "reviews-comparison"
        ];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.innerHTML = "";
        });

        // Headers with Images
        const headersSection = document.getElementById("destination-headers");
        if (headersSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "destination-column";
                col.innerHTML = `
                    <h3>${dest.name}</h3>
                    ${dest.images && dest.images.length ? 
                        `<img src="${dest.images[0]}" alt="${dest.name}" class="compare-img">` : ''}
                `;
                headersSection.appendChild(col);
            });
        }

        // Basic Info
        const basicInfoSection = document.getElementById("basic-info");
        if (basicInfoSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "destination-column";
                col.innerHTML = `
                    <p><strong>Description:</strong> ${dest.description || "N/A"}</p>
                    <p><strong>Location:</strong> ${dest.location?.mapUrl ? 
                        `<a href="${dest.location.mapUrl}" target="_blank">View on Map</a>` : "N/A"}</p>
                    <p><strong>Travel Style:</strong> ${dest.travelStyle || "N/A"}</p>
                `;
                basicInfoSection.appendChild(col);
            });
        }

        // Cost Comparison
        const costSection = document.getElementById("cost-comparison");
        if (costSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "destination-column";
                col.innerHTML = `<p>${dest.budget || "N/A"}</p>`;
                costSection.appendChild(col);
            });
        }

        // Ratings Comparison
        const ratingsSection = document.getElementById("ratings-comparison");
        if (ratingsSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "destination-column";
                col.innerHTML = `
                    <div class="star-rating">
                        ${'★'.repeat(Math.round(dest.averageRating))}${'☆'.repeat(5 - Math.round(dest.averageRating))}
                    </div>
                    <p>${dest.averageRating} (${dest.reviewCount} reviews)</p>
                `;
                ratingsSection.appendChild(col);
            });
        }

        // Activities Comparison
        const activitiesSection = document.getElementById("activities-comparison");
        if (activitiesSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "destination-column";
                const activitiesHTML = (dest.activities || []).length > 0 
                    ? dest.activities.map(activity => `<span class="activity-tag">${activity}</span>`).join('')
                    : "<span class='activity-tag'>N/A</span>";
                col.innerHTML = `
                    <div class="tags-container">
                        ${activitiesHTML}
                    </div>
                `;
                activitiesSection.appendChild(col);
            });
        }

        // Interests Comparison
        const interestsSection = document.getElementById("interests-comparison");
        if (interestsSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "destination-column";
                const interestsHTML = (dest.interests || []).length > 0 
                    ? dest.interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('')
                    : "<span class='interest-tag'>N/A</span>";
                col.innerHTML = `
                    <div class="tags-container">
                        ${interestsHTML}
                    </div>
                `;
                interestsSection.appendChild(col);
            });
        }

        // Best Time to Visit (from climate data)
        const seasonSection = document.getElementById("season-comparison");
        if (seasonSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "destination-column";
                col.innerHTML = `
                    <p class="best-time">${getBestSeason(dest.climate)}</p>
                `;
                seasonSection.appendChild(col);
            });
        }

        // Duration Comparison
        const durationSection = document.getElementById("duration-comparison");
        if (durationSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "destination-column";
                col.innerHTML = `
                    <p class="duration-value">${dest.duration || "N/A"}</p>
                    <small>Recommended stay</small>
                `;
                durationSection.appendChild(col);
            });
        }

        // Recent Reviews
        const reviewsSection = document.getElementById("reviews-comparison");
        if (reviewsSection) {
            destinations.forEach(dest => {
                const col = document.createElement("div");
                col.className = "review-column";
                
                if (dest.reviewCount > 0) {
                    col.innerHTML = `<p class="reviews-title"><strong>Recent Reviews:</strong></p>`;
                    
                    // Get last 3 reviews
                    db.ref(`reviews/${dest.id}`).orderByChild("timestamp").limitToLast(3).once("value")
                        .then(snapshot => {
                            const reviews = snapshot.val();
                            if (reviews) {
                                Object.values(reviews).forEach(review => {
                                    const reviewDiv = document.createElement("div");
                                    reviewDiv.className = "review-item";
                                    reviewDiv.innerHTML = `
                                        <p class="review-text">"${review.text}"</p>
                                        <small class="review-meta">- ${review.userName || 'Anonymous'}, 
                                        ${new Date(review.timestamp).toLocaleDateString()}</small>
                                    `;
                                    col.appendChild(reviewDiv);
                                });
                            }
                        });
                } else {
                    col.innerHTML = "<p class='no-reviews'>No reviews yet.</p>";
                }
                
                reviewsSection.appendChild(col);
            });
        }
    }

    // Event listeners
    compareBtn.addEventListener("click", compareDestinations);
    
    // Initialize
    loadDestinations();
});