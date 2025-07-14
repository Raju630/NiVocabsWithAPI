// script.js
document.addEventListener('DOMContentLoaded', () => {
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownContainer = document.querySelector('.dropdown-container');
    const lessonsDropdownMenu = document.getElementById('lessonsDropdown');

    // --- Populate Dropdown Menu from config.js ---
    function populateDropdown() {
        if (!lessonsDropdownMenu) return;
        lessonsDropdownMenu.innerHTML = '';
        AppConfig.lessons.forEach(lesson => {
            const link = document.createElement('a');
            link.href = `/lesson?id=${lesson.id}`;
            link.textContent = `Lesson ${lesson.id}: ${lesson.title}`;
            lessonsDropdownMenu.appendChild(link);
        });
    }

    // --- Dropdown Toggle Functionality ---
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
    const menuToggle = document.getElementById('nav-menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links-container');
    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
        });
    }
    
    // ===============================================
    // === NEW SCROLL-TO-TOP FEATURE LOGIC ===========
    // ===============================================
    const scrollToTopBtn = document.getElementById('scroll-to-top');

    if (scrollToTopBtn) {
        // Show or hide the button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 200) { // Show button after scrolling 200px
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });

        // Handle the click event to scroll to the top
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // For a smooth scrolling animation
            });
        });
    }
    // === END OF NEW FEATURE ========================
    // At the end of script.js
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
    populateDropdown();
});