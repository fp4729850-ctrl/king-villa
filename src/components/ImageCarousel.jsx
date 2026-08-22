import React, { useState } from 'react';

function ImageCarousel({ images, altText }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return <img src="https://via.placeholder.com/1000" alt={altText} className="room-image" />;
  }

  if (images.length === 1) {
    return <img src={images[0]} alt={altText} className="room-image" />;
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className="carousel-container">
      <img src={images[currentIndex]} alt={`${altText} ${currentIndex + 1}`} className="room-image" />
      
      <button className="carousel-btn left-btn" onClick={prevSlide}>
        &#10094;
      </button>
      <button className="carousel-btn right-btn" onClick={nextSlide}>
        &#10095;
      </button>

      <div className="carousel-dots">
        {images.map((_, idx) => (
          <span 
            key={idx} 
            className={`dot ${currentIndex === idx ? 'active' : ''}`}
            onClick={() => setCurrentIndex(idx)}
          ></span>
        ))}
      </div>
    </div>
  );
}

export default ImageCarousel;
