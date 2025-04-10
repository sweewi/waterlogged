document.addEventListener('DOMContentLoaded', () => {
  const dataContainer = document.getElementById('data-container');
  if (!dataContainer) {
    console.error('Error: #data-container element not found.');
    return; // Exit early if the element is missing
  }

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
  const menuButton = document.getElementById('menu-button'); // This selects the button with the ID "menu-button".
  const menu = document.getElementById('menu'); // This selects the unordered list (menu) with the ID "menu".

  // Check if both elements exist
  if (menuButton && menu) {
    // Add a click event listener to the hamburger button
    menuButton.addEventListener('click', () => {
      // Toggle the "hidden" class on the menu
      const isHidden = menu.classList.toggle('hidden'); // Adds or removes the "hidden" class to show or hide the menu.

      // Update the "aria-hidden" attribute for accessibility
      menu.setAttribute('aria-hidden', isHidden); // Updates the "aria-hidden" attribute to reflect the visibility state of the menu.
    });
  } else {
    console.error('Error: Hamburger button or menu not found.'); // Logs an error if the button or menu is missing.
  }

  // Dark mode toggle
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      menu.classList.toggle('dark-mode');
    });
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