document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // Set gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#ADD8E6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);

    // Draw some clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    drawCloud(ctx, 100, 100, 60);
    drawCloud(ctx, 400, 150, 80);
    drawCloud(ctx, 250, 80, 70);

    // Draw raindrops
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 600;
        const y = Math.random() * 200 + 150;
        drawRaindrop(ctx, x, y);
    }

    // Add game title
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#00509e';
    ctx.textAlign = 'center';
    ctx.fillText('Weather Detective', 300, 300);

    // Add subtitle
    ctx.font = '20px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('Test Your Weather Knowledge!', 300, 340);

    // Helper function to draw a cloud
    function drawCloud(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.35, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
        ctx.arc(x + size * 0.7, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Helper function to draw a raindrop
    function drawRaindrop(ctx, x, y) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 20);
        ctx.stroke();
    }

    // Save the canvas as an image
    const link = document.createElement('a');
    link.download = 'weather-detective-preview.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});