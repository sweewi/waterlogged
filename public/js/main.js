document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired.');

  const dataContainer = document.getElementById('data-container');
  if (!dataContainer) {
    console.warn('Warning: #data-container element not found. Skipping data fetch.');
  } else {
    fetch('/api/data')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(d => {
        dataContainer.innerHTML = `<pre>${JSON.stringify(d, null, 2)}</pre>`;
      })
      .catch(e => {
        console.error('Error fetching data:', e);
        dataContainer.innerHTML = '<p>Error fetching data. Please try again later.</p>';
      });
  }

  // Adjust main content margin dynamically
  const nav = document.querySelector('nav');
  const main = document.querySelector('main');
  if (nav && main) {
    const adjustMargin = () => {
      const navHeight = nav.offsetHeight;
      main.style.marginTop = `${navHeight}px`;
    };
    adjustMargin();
    window.addEventListener('resize', adjustMargin);
  }

  // Hamburger menu toggle
  const menuButton = document.getElementById('menu-button');
  const menu = document.getElementById('menu');
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      menu.classList.toggle('hidden');
      menu.style.display = menu.classList.contains('hidden') ? 'none' : 'block';
      menu.setAttribute('aria-hidden', menu.classList.contains('hidden'));
    });
  } else {
    console.error('Menu button or menu element not found.');
  }

  // Dark mode toggle
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      document.querySelectorAll('header, nav, .content-box').forEach(el => {
        el.classList.toggle('dark-mode');
      });
    });
  } else {
    console.error('Dark mode toggle button not found.');
  }

  // Weather data fetch
  const weatherContainer = document.getElementById('weather-container');
  if (weatherContainer) {
    fetch('/api/weather')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const weatherData = `
          <strong>Location:</strong> ${data.location}<br>
          <strong>Temperature:</strong> ${data.temperature}°F<br>
          <strong>Condition:</strong> ${data.condition}
        `;
        weatherContainer.innerHTML = weatherData;
      })
      .catch(error => {
        console.error('Error fetching weather data:', error);
        weatherContainer.innerHTML = '<p>Error loading weather data. Please try again later.</p>';
      });
  }

  // Modal functionality
  const modal = document.getElementById('team-modal');
  const modalImage = document.getElementById('modal-image');
  const modalName = document.getElementById('modal-name');
  const modalBlurb = document.getElementById('modal-blurb');
  const modalClose = document.getElementById('modal-close');

  if (modal && modalImage && modalName && modalBlurb && modalClose) {
    document.querySelectorAll('.team-box').forEach(box => {
      box.addEventListener('click', () => {
        console.log('Team box clicked:', box);
        const name = box.getAttribute('data-name');
        const blurb = box.getAttribute('data-blurb');
        const image = box.getAttribute('data-image');
        if (name && blurb && image) {
          console.log('Modal data:', { name, blurb, image });
          modalName.textContent = name;
          modalBlurb.textContent = blurb;
          modalImage.src = image;
          modalImage.alt = name;
          modal.style.display = 'flex';
          modal.style.visibility = 'visible'; // Ensure visibility
          modal.style.opacity = '1'; // Ensure opacity for visibility
          modal.style.justifyContent = 'center'; // Ensure proper alignment
          modal.style.alignItems = 'center';
        } else {
          console.error('Missing modal data attributes for:', box);
        }
      });
    });

    modalClose.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
});