/**
 * main.js - Core UI functionality for WaterLogged
 * 
 * Handles UI components like modals, navigation menu, and dark mode toggle
 * Using module pattern for better organization
 */
import { safeSelect, initFeatureIfElementsExist } from './utils.js';

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Main application initialization function
 */
function initApp() {
  // Force light mode as default - remove any existing dark mode setting
  localStorage.removeItem('darkMode');
  document.body.classList.remove('dark-mode');
  
  // Initialize UI features conditionally based on available elements
  initTeamMemberModal();
  initMobileMenu();
  initDarkModeToggle();
  initPhotoGallery();
  
  // Set body class based on page
  const path = window.location.pathname;
  const pageName = path.split('/').pop().replace('.html', '') || 'index';
  document.body.classList.add(`page-${pageName}`);
}

/**
 * Team member modal popup functionality
 */
function initTeamMemberModal() {
  // Only initialize if required elements exist
  initFeatureIfElementsExist(() => {
    const modal = safeSelect('#team-modal');
    const modalImage = safeSelect('#modal-image', modal);
    const modalName = safeSelect('#modal-name', modal);
    const modalBlurb = safeSelect('#modal-blurb', modal);
    const modalClose = safeSelect('#modal-close', modal);
    
    if (!modal || !modalImage || !modalName || !modalBlurb || !modalClose) {
      return; // Exit if any required element is missing
    }
    
    // Function to show the modal with a smooth animation
    function openModal() {
      modal.style.display = 'flex';
      requestAnimationFrame(() => {
        modal.classList.add('active');
      });
    }
    
    // Function to hide the modal with a smooth animation
    function closeModal() {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300); // Wait for animation to finish (300ms)
    }
    
    // Handle clicks on team member boxes
    document.addEventListener('click', (e) => {
      const teamBox = e.target.closest('.team-box');
      if (teamBox) {
        // Get the team member's info from the box's data attributes
        const name = teamBox.getAttribute('data-name');
        const blurb = teamBox.getAttribute('data-blurb');
        const image = teamBox.getAttribute('data-image');
        
        // Update the modal with the team member's info
        modalName.textContent = name;
        modalBlurb.textContent = blurb;
        modalImage.src = image;
        modalImage.alt = name;
        
        // Show the modal
        openModal();
      }
    });
    
    // Close modal when the X button is clicked
    modalClose.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the click from triggering other events
      closeModal();
    });
    
    // Close modal when clicking the dark background
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Close modal when pressing ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display !== 'none') {
        closeModal();
      }
    });
  }, ['#team-modal']);
}

/**
 * Mobile menu (hamburger) functionality
 */
function initMobileMenu() {
  initFeatureIfElementsExist(() => {
    const menuButton = safeSelect('#menu-button');
    const menu = safeSelect('#menu');
    
    if (!menuButton || !menu) {
      return; // Exit if required elements are missing
    }
    
    // Ensure initial state of menu is consistent
    menu.classList.add('hidden');
    menu.style.display = 'none';
    menu.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    
    menuButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      
      // Toggle the menu visibility
      menu.classList.toggle('hidden');
      menu.style.display = menu.classList.contains('hidden') ? 'none' : 'block';
      // Update accessibility attribute
      menu.setAttribute('aria-hidden', menu.classList.contains('hidden'));
      // Toggle aria-expanded on the button for accessibility
      menuButton.setAttribute('aria-expanded', !menu.classList.contains('hidden'));
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== menuButton && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        menu.style.display = 'none';
        menu.setAttribute('aria-hidden', 'true');
        menuButton.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Make menu items close the menu when clicked
    const menuLinks = menu.querySelectorAll('a');
    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.add('hidden');
        menu.style.display = 'none';
        menu.setAttribute('aria-hidden', 'true');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }, ['#menu-button', '#menu']);
}

/**
 * Dark mode toggle functionality with localStorage persistence
 */
function initDarkModeToggle() {
  initFeatureIfElementsExist(() => {
    const darkModeToggle = safeSelect('#dark-mode-toggle');
    
    if (!darkModeToggle) {
      console.warn('Dark mode toggle button not found');
      // Create a temporary button if not found
      createDarkModeToggle();
      return;
    }
    
    // Make sure the button is visible and correctly positioned
    darkModeToggle.style.display = 'block';
    darkModeToggle.style.position = 'relative';
    darkModeToggle.style.zIndex = '1200';
    
    // Check for saved preference, but default to light mode
    const savedMode = localStorage.getItem('darkMode');
    
    // Create toggle UI elements if they don't exist
    ensureToggleElements(darkModeToggle);
    
    // Apply dark mode only if explicitly enabled in localStorage
    if (savedMode === 'enabled') {
      applyDarkMode(true);
      darkModeToggle.textContent = 'Light Mode';
    } else {
      // Default to light mode
      applyDarkMode(false);
      darkModeToggle.textContent = 'Dark Mode';
    }
    
    darkModeToggle.addEventListener('click', () => {
      // Toggle dark mode class on body and all relevant elements
      const isDarkMode = document.body.classList.contains('dark-mode');
      applyDarkMode(!isDarkMode);
      
      // Save preference to localStorage
      localStorage.setItem('darkMode', !isDarkMode ? 'enabled' : 'disabled');
      
      // Update button text
      darkModeToggle.textContent = !isDarkMode ? 'Light Mode' : 'Dark Mode';
    });
  }, ['#dark-mode-toggle']);
}

/**
 * Create dark mode toggle if it doesn't exist
 */
function createDarkModeToggle() {
  console.log('Creating dark mode toggle button');
  const nav = document.querySelector('nav');
  if (!nav) return;
  
  const darkModeToggle = document.createElement('button');
  darkModeToggle.id = 'dark-mode-toggle';
  darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
  darkModeToggle.setAttribute('aria-label', 'Toggle Dark Mode');
  
  // Apply basic styling
  darkModeToggle.style.display = 'block';
  darkModeToggle.style.position = 'absolute';
  darkModeToggle.style.right = '20px';
  darkModeToggle.style.top = '15px';
  darkModeToggle.style.zIndex = '1200';
  darkModeToggle.style.padding = '8px 12px';
  darkModeToggle.style.backgroundColor = '#00509e';
  darkModeToggle.style.color = 'white';
  darkModeToggle.style.border = 'none';
  darkModeToggle.style.borderRadius = '4px';
  darkModeToggle.style.cursor = 'pointer';
  
  nav.appendChild(darkModeToggle);
  
  // Initialize functionality
  darkModeToggle.addEventListener('click', () => {
    const isDarkMode = document.body.classList.contains('dark-mode');
    console.log('New toggle clicked, current dark mode:', isDarkMode);
    
    if (isDarkMode) {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
      darkModeToggle.textContent = 'Dark Mode';
    } else {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
      darkModeToggle.textContent = 'Light Mode';
    }
    
    // Also apply to other elements
    const elements = document.querySelectorAll('header, nav, .content-box, .team-box, .modal-content, #menu');
    elements.forEach(el => {
      if (isDarkMode) {
        el.classList.remove('dark-mode');
      } else {
        el.classList.add('dark-mode');
      }
    });
  });
}

/**
 * Ensure the dark mode toggle has the required child elements for styling
 */
function ensureToggleElements(toggleButton) {
  // Only add elements if they don't already exist
  if (!toggleButton.querySelector('.toggle-rays')) {
    // Create rays for the sun
    const rays = document.createElement('div');
    rays.className = 'toggle-rays';
    for (let i = 0; i < 8; i++) {
      const ray = document.createElement('div');
      ray.className = 'toggle-ray';
      rays.appendChild(ray);
    }
    toggleButton.appendChild(rays);
    
    // Create stars for the moon
    const stars = document.createElement('div');
    stars.className = 'toggle-stars';
    for (let i = 0; i < 4; i++) {
      const star = document.createElement('div');
      star.className = 'toggle-star';
      stars.appendChild(star);
    }
    toggleButton.appendChild(stars);
  }
}

/**
 * Apply dark mode to the entire document
 */
function applyDarkMode(isDark) {
  console.log('Applying dark mode:', isDark);
  
  // Apply to body
  if (isDark) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  
  // Apply to all relevant elements
  const elements = document.querySelectorAll('header, nav, .content-box, .team-box, .modal-content, #menu');
  elements.forEach(el => {
    if (isDark) {
      el.classList.add('dark-mode');
    } else {
      el.classList.remove('dark-mode');
    }
  });
  
  // Update button state
  const darkModeToggle = safeSelect('#dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.setAttribute('aria-pressed', isDark);
    darkModeToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }
}

/**
 * Photo gallery functionality 
 */
function initPhotoGallery() {
  initFeatureIfElementsExist(() => {
    const galleryImage = safeSelect('#gallery-image');
    const galleryImageSource = safeSelect('#gallery-image-source');
    const photoCaption = safeSelect('#photo-caption');
    const prevButton = safeSelect('#prev-button');
    const nextButton = safeSelect('#next-button');
    
    if (!galleryImage || !prevButton || !nextButton) {
      return; // Exit if required elements are missing
    }
    
    // Sample photo collection (replace with your actual photos)
    const photos = [
      { src: 'https://via.placeholder.com/600x400?text=Photo+1', webp: 'https://via.placeholder.com/600x400.webp?text=Photo+1', alt: 'Photo 1' },
      { src: 'https://via.placeholder.com/600x400?text=Photo+2', webp: 'https://via.placeholder.com/600x400.webp?text=Photo+2', alt: 'Photo 2' },
      { src: 'https://via.placeholder.com/600x400?text=Photo+3', webp: 'https://via.placeholder.com/600x400.webp?text=Photo+3', alt: 'Photo 3' },
      // Add more photos as needed
    ];
    
    let currentIndex = 0;
    
    // Update gallery display
    function updateGallery() {
      galleryImage.src = photos[currentIndex].src;
      galleryImage.alt = photos[currentIndex].alt;
      if (galleryImageSource) {
        galleryImageSource.srcset = photos[currentIndex].webp;
      }
      if (photoCaption) {
        photoCaption.textContent = `${photos[currentIndex].alt} of ${photos.length}`;
      }
    }
    
    // Next photo
    nextButton.addEventListener('click', function() {
      currentIndex = (currentIndex + 1) % photos.length;
      updateGallery();
    });
    
    // Previous photo
    prevButton.addEventListener('click', function() {
      currentIndex = (currentIndex - 1 + photos.length) % photos.length;
      updateGallery();
    });
    
    // Initialize gallery
    updateGallery();
  }, ['#gallery-image']);
}
