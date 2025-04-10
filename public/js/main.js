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
});