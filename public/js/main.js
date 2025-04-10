document.addEventListener('DOMContentLoaded', () => {
  // Modal functionality
  const modal = document.getElementById('team-modal');
  const modalImage = document.getElementById('modal-image');
  const modalName = document.getElementById('modal-name');
  const modalBlurb = document.getElementById('modal-blurb');
  const modalClose = document.getElementById('modal-close');

  function openModal() {
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  }

  function closeModal() {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }

  // Event delegation for team boxes
  document.addEventListener('click', (e) => {
    const teamBox = e.target.closest('.team-box');
    if (teamBox) {
      const name = teamBox.getAttribute('data-name');
      const blurb = teamBox.getAttribute('data-blurb');
      const image = teamBox.getAttribute('data-image');

      modalName.textContent = name;
      modalBlurb.textContent = blurb;
      modalImage.src = image;
      modalImage.alt = name;

      openModal();
    }
  });

  // Close modal when clicking close button
  modalClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Hamburger menu functionality
  const menuButton = document.getElementById('menu-button');
  const menu = document.getElementById('menu');
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      menu.classList.toggle('hidden');
      menu.style.display = menu.classList.contains('hidden') ? 'none' : 'block';
      menu.setAttribute('aria-hidden', menu.classList.contains('hidden'));
    });
  }

  // Dark mode toggle functionality
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      document.querySelectorAll('header, nav, .content-box, .team-box, .modal-content').forEach(el => {
        el.classList.toggle('dark-mode');
      });
    });
  }
});
