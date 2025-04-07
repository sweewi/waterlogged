document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/data')
      .then(response => response.json())
      .then(data => {
        const container = document.getElementById('data-container');
        container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        const container = document.getElementById('data-container');
        container.innerHTML = `<p>Error fetching data. Please try again later.</p>`;
      });
  });