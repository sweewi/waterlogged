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
    console.log('Menu button and menu found. Adding event listener.');
    menuButton.addEventListener('click', () => {
      console.log('Menu button clicked.');
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
    console.log('Dark mode toggle button found. Adding event listener.');
    darkModeToggle.addEventListener('click', () => {
      console.log('Dark mode toggle clicked.');
      document.body.classList.toggle('dark-mode');
      menu.classList.toggle('dark-mode');
      console.log('Dark mode toggled.');
    });
    console.log('Event listener for dark-mode-toggle attached successfully.');
  } else {
    console.error('Error: Dark mode toggle button not found.');
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
});