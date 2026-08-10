function scrollVideos(direction) {
    const container = document.getElementById('videoCarousel');
    const scrollAmount = 350; // Width of one card + gap

    if (direction === 'left') {
        container.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    } else {
        container.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }
}

function scrollAchievements(direction) {
    const container = document.getElementById('achievementCarousel');
    const scrollAmount = 350;

    if (direction === 'left') {
        container.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    } else {
        container.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }
}

// Auto-Scroll for Achievements
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('achievementCarousel');
    if (!container) return;

    let autoScrollInterval;
    const scrollAmount = 350; // Standard scroll step

    function startAutoScroll() {
        // Clear any existing interval to prevent duplicates
        if (autoScrollInterval) clearInterval(autoScrollInterval);

        autoScrollInterval = setInterval(() => {
            // Check if we are close to the end
            // scrollWidth - clientWidth = maxScrollLeft
            const maxScrollLeft = container.scrollWidth - container.clientWidth;

            // Loop back if at the end (with small tolerance)
            if (container.scrollLeft >= maxScrollLeft - 10) {
                container.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }, 1000); // 1 second interval as requested
    }

    function stopAutoScroll() {
        clearInterval(autoScrollInterval);
    }

    // Start auto-scroll
    startAutoScroll();

    // Pause on interactions
    const wrapper = container.parentElement; // The carousel-wrapper
    if (wrapper) {
        wrapper.addEventListener('mouseenter', stopAutoScroll);
        wrapper.addEventListener('mouseleave', startAutoScroll);

        // Touch support for mobile (pause on touch)
        wrapper.addEventListener('touchstart', stopAutoScroll);
        wrapper.addEventListener('touchend', () => {
            // Resume after a delay on mobile to allow reading
            setTimeout(startAutoScroll, 2000);
        });
    }
});
