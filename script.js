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
     let deferredPrompt; // This will hold the install event
    const installButton = document.getElementById('pwa-install-button');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the default mini-infobar from appearing on mobile
        e.preventDefault();
        
        // Stash the event so it can be triggered later.
        deferredPrompt = e;

        // Start a timer. If the user is still here after 1 minute (60000ms),
        // show our custom install button.
        setTimeout(() => {
            if (installButton) {
                installButton.classList.add('show');
            }
        }, 60000); // 60,000 milliseconds = 1 minute
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            // Hide our custom button
            installButton.classList.remove('show');
            
            // Show the browser's install prompt.
            if (deferredPrompt) {
                deferredPrompt.prompt();
                
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('User accepted the PWA installation');
                } else {
                    console.log('User dismissed the PWA installation');
                }
                
                // We can't use the prompt again, so clear it.
                deferredPrompt = null;
            }
        });
    }

    // Optional: If the app is installed, hide the button forever.
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