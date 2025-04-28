// Photo Gallery Script for Waterlogged

// Wait for the page to fully load 
window.onload = function() {
  console.log('Window loaded - gallery script running');

  // Get all the gallery elements
  const galleryImage = document.getElementById('gallery-image');
  const photoCaption = document.getElementById('photo-caption');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  
  // Log element detection for debugging
  console.log('Elements found:', 
    galleryImage ? 'Image ✓' : 'Image ✗', 
    photoCaption ? 'Caption ✓' : 'Caption ✗',
    prevButton ? 'Prev ✓' : 'Prev ✗', 
    nextButton ? 'Next ✓' : 'Next ✗'
  );

  // Our gallery photos collection - using jpg files which have been confirmed to exist
  const galleryPhotos = [
    { src: 'images/photo1.JPG', alt: 'Rain gauge installation', caption: 'Our first rain gauge installation at Boston College campus.' },
    { src: 'images/photo2.JPG', alt: 'Weather station setup', caption: 'Setting up a Waterlogged station on a rooftop for optimal data collection.' },
    { src: 'images/photo3.JPG', alt: 'Team working on prototype', caption: 'The engineering team testing our latest prototype design.' },
    { src: 'images/photo4.JPG', alt: 'Field testing', caption: 'Field testing the rain gauge during a rainy day in Boston.' },
    { src: 'images/photo5.JPG', alt: 'Data collection system', caption: 'Close-up of our data collection and transmission system.' },
    { src: 'images/photo6.JPG', alt: 'Community installation', caption: 'Community members helping with a new installation site.' },
    { src: 'images/photo7.jpg', alt: 'Rainfall monitoring', caption: 'Monitoring localized rainfall patterns across the network.' },
    { src: 'images/photo8.jpg', alt: 'Team presentation', caption: 'Presenting Waterlogged results at the science fair.' }
  ];

  let currentPhotoIndex = 0;
  
  // Update gallery with current photo information
  function updateGallery() {
    if (!galleryImage || !photoCaption) {
      console.error('Gallery elements missing - cannot update');
      return;
    }
    
    const currentPhoto = galleryPhotos[currentPhotoIndex];
    console.log('Setting image:', currentPhoto.src);
    
    galleryImage.src = currentPhoto.src;
    galleryImage.alt = currentPhoto.alt;
    photoCaption.innerHTML = `<strong>${currentPhotoIndex + 1}/${galleryPhotos.length}:</strong> ${currentPhoto.caption}`;
    
    // Image error handling
    galleryImage.onerror = function() {
      console.error('Failed to load image:', currentPhoto.src);
      this.src = 'https://via.placeholder.com/800x600?text=Image+Not+Found';
    };
  }

  // Function to go to previous photo
  function goToPrevious() {
    currentPhotoIndex = (currentPhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
    updateGallery();
    console.log('Previous clicked, now showing photo', currentPhotoIndex + 1);
  }

  // Function to go to next photo
  function goToNext() {
    currentPhotoIndex = (currentPhotoIndex + 1) % galleryPhotos.length;
    updateGallery();
    console.log('Next clicked, now showing photo', currentPhotoIndex + 1);
  }

  // Set up direct onclick handlers (more reliable than addEventListener in some cases)
  if (prevButton) {
    prevButton.onclick = goToPrevious;
    console.log('Previous button handler attached');
  }

  if (nextButton) {
    nextButton.onclick = goToNext;
    console.log('Next button handler attached');
  }

  // Add keyboard navigation
  document.onkeydown = function(e) {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  // Initialize gallery with first photo
  updateGallery();
  console.log('Gallery initialization complete');
}