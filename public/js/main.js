document.addEventListener('DOMContentLoaded', () => {
  const dataContainer = document.getElementById('data-container');
  if (!dataContainer) {
    console.error('Error: #data-container element not found.');
    return;
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
});