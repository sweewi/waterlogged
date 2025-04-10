// Wait for the page to fully load before running any code
document.addEventListener('DOMContentLoaded', () => {
  // Get all the elements needed for the team member modal popup
  const modal = document.getElementById('team-modal');
  const modalImage = document.getElementById('modal-image');
  const modalName = document.getElementById('modal-name');
  const modalBlurb = document.getElementById('modal-blurb');
  const modalClose = document.getElementById('modal-close');

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

  // Mobile menu (hamburger) functionality
  const menuButton = document.getElementById('menu-button');
  const menu = document.getElementById('menu');
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      // Toggle the menu visibility
      menu.classList.toggle('hidden');
      menu.style.display = menu.classList.contains('hidden') ? 'none' : 'block';
      // Update accessibility attribute
      menu.setAttribute('aria-hidden', menu.classList.contains('hidden'));
    });
  }

  // Dark mode toggle functionality
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      // Toggle dark mode class on body and all relevant elements
      document.body.classList.toggle('dark-mode');
      document.querySelectorAll('header, nav, .content-box, .team-box, .modal-content').forEach(el => {
        el.classList.toggle('dark-mode');
      });
    });
  }
});
