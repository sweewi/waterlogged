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
  // Initialize UI features conditionally based on available elements
  initTeamMemberModal();
  initMobileMenu();
  initDarkModeToggle();
  
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
    
    menuButton.addEventListener('click', () => {
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
  }, ['#menu-button', '#menu']);
}

/**
 * Dark mode toggle functionality with localStorage persistence
 */
function initDarkModeToggle() {
  initFeatureIfElementsExist(() => {
    const darkModeToggle = safeSelect('#dark-mode-toggle');
    
    // Check for saved preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    
    // Apply initial dark mode if saved or based on system preference
    if (savedMode === 'true' || (savedMode === null && prefersDarkMode)) {
      applyDarkMode(true);
    }
    
    darkModeToggle.addEventListener('click', () => {
      // Toggle dark mode class on body and all relevant elements
      const isDarkMode = document.body.classList.contains('dark-mode');
      applyDarkMode(!isDarkMode);
      
      // Save preference to localStorage
      localStorage.setItem('darkMode', !isDarkMode);
    });
    
    // Function to apply dark mode
    function applyDarkMode(isDark) {
      // Apply to body
      if (isDark) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      
      // Apply to all relevant elements
      const elements = document.querySelectorAll('header, nav, .content-box, .team-box, .modal-content');
      elements.forEach(el => {
        if (isDark) {
          el.classList.add('dark-mode');
        } else {
          el.classList.remove('dark-mode');
        }
      });
      
      // Update button text/icon for accessibility
      darkModeToggle.setAttribute('aria-pressed', isDark);
      darkModeToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }, ['#dark-mode-toggle']);
}
