document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes("about.html")) {
        console.log("About page loaded.");
        
        // Animation for stats counting
        const statCards = document.querySelectorAll('.stat-card h3');
        const stats = [500, 10000, 95, 24];
        const durations = [2000, 2500, 1500, 1000];
        
        statCards.forEach((card, index) => {
            const target = stats[index];
            const duration = durations[index];
            const increment = target / (duration / 16);
            let current = 0;
            
            const updateCount = () => {
                current += increment;
                if (current < target) {
                    card.textContent = Math.floor(current) + (index === 2 ? '%' : index === 3 ? '/7' : '+');
                    requestAnimationFrame(updateCount);
                } else {
                    card.textContent = target + (index === 2 ? '%' : index === 3 ? '/7' : '+');
                }
            };
            
            updateCount();
        });
        
        // Add hover effects to feature cards
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                const icon = card.querySelector('i');
                icon.style.transform = 'scale(1.1)';
            });
            
            card.addEventListener('mouseleave', () => {
                const icon = card.querySelector('i');
                icon.style.transform = 'scale(1)';
            });
        });
    }
});