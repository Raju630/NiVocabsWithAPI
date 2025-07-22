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

     let newWorker;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                // A new service worker is installing.
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    // Has the new worker finished installing? If so,
                    // it's waiting to activate.
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Show the "new version" notification
                        const notification = document.getElementById('update-notification');
                        if (notification) {
                            notification.classList.add('show');
                        }
                    }
                });
            });
        });

        const reloadButton = document.getElementById('reload-button');
        if (reloadButton) {
            reloadButton.addEventListener('click', () => {
                // When the user clicks "Refresh", send a message to the new
                // service worker telling it to activate.
                newWorker.postMessage({ action: 'skipWaiting' });
            });
        }
        
        // This listens for the 'controllerchange' event, which happens
        // after the new worker has taken control.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // The new worker has activated! Reload the page to use the new assets.
            window.location.reload();
        });
    }
        // In script.js, inside the 'DOMContentLoaded' event listener

        // --- NEW: PWA Install Prompt Logic (with disappearing button) ---
let deferredPrompt;
const installButton = document.getElementById('pwa-install-button');

// --- NEW PART 1: Create the audio object once at the start ---
const installPopupSound = new Audio('/popup-sound.mp3');
installPopupSound.volume = 1; // Set volume to 50% to be subtle

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    setTimeout(() => {
        if (installButton) {
            installButton.classList.add('show');

            // --- NEW PART 2: Play the sound when the button appears ---
            // We use a .catch() to prevent errors if the user hasn't interacted
            // with the page yet, which is a browser security requirement for audio.
            installPopupSound.play().catch(error => {
                console.log("Audio play was prevented by browser:", error);
            });
            // --- END NEW PART 2 ---

            setTimeout(() => {
                installButton.classList.remove('show');
            }, 15000); 
        }
    }, 30000); 
});

        if (installButton) {
            installButton.addEventListener('click', async () => {
                // We don't need to hide the button on click anymore because it might have
                // already been hidden by the timer. Checking for deferredPrompt is enough.
                
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        console.log('User accepted the PWA installation');
                        // Hide the button permanently if they install
                        installButton.style.display = 'none';
                    } else {
                        console.log('User dismissed the PWA installation');
                    }
                    deferredPrompt = null;
                }
            });
        }

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            if (installButton) {
                installButton.style.display = 'none';
            }
            deferredPrompt = null;
        });
    // --- 5. INITIALIZE DROPDOWN ---
    // This is called last to make sure AppConfig is loaded
    populateDropdown();
});