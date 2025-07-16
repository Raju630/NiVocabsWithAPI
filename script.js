// script.js (Corrected with a single DOMContentLoaded listener)

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DROPDOWN & NAV MENU LOGIC ---
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownContainer = document.querySelector('.dropdown-container');
    const lessonsDropdownMenu = document.getElementById('lessonsDropdown');

    // Populate Dropdown Menu from config.js
    function populateDropdown() {
        if (!lessonsDropdownMenu || typeof AppConfig === 'undefined') return;
        lessonsDropdownMenu.innerHTML = '';
        AppConfig.lessons.forEach(lesson => {
            const link = document.createElement('a');
            link.href = `/lesson?id=${lesson.id}`;
            link.textContent = `Lesson ${lesson.id}: ${lesson.title}`;
            lessonsDropdownMenu.appendChild(link);
        });
    }

    // Dropdown Toggle Functionality
    if (dropdownToggle && dropdownContainer) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownContainer.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('open');
            }
        });
    }

    // Nav Menu (Hamburger) Toggle
    const menuToggle = document.getElementById('nav-menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links-container');
    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }

    // --- 2. SCROLL-TO-TOP FEATURE LOGIC ---
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 500) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- 3. SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
        });
    }

    // --- 4. FADE-IN ANIMATION LOGIC ---
    const faders = document.querySelectorAll('.fade-in-section');
    if (faders.length > 0) {
        const appearOnScroll = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    return;
                }
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.2 // Trigger when 20% of the element is visible
        });

        faders.forEach(fader => {
            appearOnScroll.observe(fader);
        });
    }

    // --- 5. INITIALIZE DROPDOWN ---
    // This is called last to make sure AppConfig is loaded
    populateDropdown();
});