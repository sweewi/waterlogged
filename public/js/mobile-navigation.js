/**
 * Mobile navigation and touch gesture support
 */

document.addEventListener('DOMContentLoaded', () => {
  // Highlight current page in mobile navigation
  const currentPath = window.location.pathname;
  const mobileNavItems = document.querySelectorAll('.mobile-nav .nav-item');
  
  mobileNavItems.forEach(item => {
    const href = item.getAttribute('href');
    if (currentPath.endsWith(href) || 
        (currentPath.endsWith('/') && href === 'index.html')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Implement swipe gestures for content views
  const dashboardViews = document.querySelectorAll('.dashboard-view');
  const dashboardTabs = document.querySelectorAll('.dashboard-tab');
  
  if (dashboardViews.length > 0 && 'ontouchstart' in window) {
    // Store touch tracking information
    let touchStartX = 0;
    let touchEndX = 0;
    let currentViewIndex = 0;
    
    // Find the initially active view
    dashboardViews.forEach((view, index) => {
      if (view.classList.contains('active')) {
        currentViewIndex = index;
      }
    });
    
    // Add the necessary class for swipe gestures
    const dashboardMain = document.querySelector('.dashboard-main');
    dashboardMain.classList.add('swipe-area');
    
    // Event listeners for touch events
    dashboardMain.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    dashboardMain.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
    
    // Handle the swipe gesture
    function handleSwipe() {
      const swipeThreshold = 50; // Minimum distance for a swipe
      const swipeDistance = touchEndX - touchStartX;
      
      // Skip if the swipe wasn't significant enough
      if (Math.abs(swipeDistance) < swipeThreshold) return;
      
      // Calculate the next view index based on swipe direction
      let nextViewIndex = currentViewIndex;
      
      if (swipeDistance > 0) {
        // Swipe right - go to previous view
        nextViewIndex = Math.max(0, currentViewIndex - 1);
      } else {
        // Swipe left - go to next view
        nextViewIndex = Math.min(dashboardViews.length - 1, currentViewIndex + 1);
      }
      
      // If the index changed, show the new view
      if (nextViewIndex !== currentViewIndex) {
        // Update tab states
        dashboardTabs.forEach(tab => tab.classList.remove('active'));
        if (dashboardTabs[nextViewIndex]) {
          dashboardTabs[nextViewIndex].classList.add('active');
        }
        
        // Update view states
        dashboardViews.forEach(view => view.classList.remove('active'));
        if (dashboardViews[nextViewIndex]) {
          dashboardViews[nextViewIndex].classList.add('active');
          
          // Trigger a view change event for the dashboard.js logic
          const viewName = dashboardTabs[nextViewIndex].dataset.view;
          const viewChangeEvent = new CustomEvent('viewchange', {
            detail: { view: viewName }
          });
          document.dispatchEvent(viewChangeEvent);
          
          // Update current index
          currentViewIndex = nextViewIndex;
        }
      }
    }
  }
  
  // Handle auto-hiding navigation on scroll
  let lastScrollPosition = 0;
  const mobileNav = document.querySelector('.mobile-nav');
  
  if (mobileNav) {
    window.addEventListener('scroll', () => {
      const currentScrollPosition = window.pageYOffset;
      
      // Only apply on mobile screens
      if (window.innerWidth <= 768) {
        // If scrolling down and past threshold, hide nav
        if (currentScrollPosition > lastScrollPosition && currentScrollPosition > 150) {
          mobileNav.classList.add('hidden');
        } else {
          // If scrolling up or near top, show nav
          mobileNav.classList.remove('hidden');
        }
      }
      
      lastScrollPosition = currentScrollPosition;
    }, { passive: true });
  }
});