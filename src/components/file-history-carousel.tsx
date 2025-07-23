import { useState } from "react";
import { Commit } from "../types";
import { getVisibleCommits } from "../carousel-utils";
import { getCarouselSettings } from "../carousel-utils";
import { CarouselCard } from "./carousel-card";


export function FileHistoryCarousel({ commits, fileName }: { commits: Commit[]; fileName: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3);
  
    const nextSlide = () => {
      setCurrentIndex((prev) => (prev + 1) % commits.length);
    };
  
    const prevSlide = () => {
      setCurrentIndex((prev) => (prev - 1 + commits.length) % commits.length);
    };
  
    const goToSlide = (index: number) => {
      setCurrentIndex(index);
    };
  
    if (commits.length === 0) {
      return (
        <div className="carousel-loading">
          <div className="loading-spinner"></div>
          <p>Loading file history...</p>
        </div>
      );
    }
  
    const visibleCommits = getVisibleCommits(commits, currentIndex, cardsToShow);
    const settings = getCarouselSettings(cardsToShow);
  
    return (
      <div className="carousel-container">
        <div className="carousel-header">
          <div className="file-info">
            <h2>{fileName}</h2>
            <p>{commits.length} commits • Time travel through history</p>
          </div>
          
          <div className="carousel-controls">
            <div className="view-selector">
              <button 
                className={cardsToShow === 1 ? 'active' : ''}
                onClick={() => setCardsToShow(1)}
                title="Single card view"
              >
                1
              </button>
              <button 
                className={cardsToShow === 3 ? 'active' : ''}
                onClick={() => setCardsToShow(3)}
                title="Three card view"
              >
                3
              </button>
              <button 
                className={cardsToShow === 5 ? 'active' : ''}
                onClick={() => setCardsToShow(5)}
                title="Five card view"
              >
                5
              </button>
            </div>
          </div>
        </div>
  
        <div className="carousel-viewport" style={{ gap: settings.gap }}>
          <button className="carousel-nav prev" onClick={prevSlide} disabled={commits.length <= 1}>
            ‹
          </button>
          
          <div className="carousel-track">
            {visibleCommits.map(({ commit, index, position }) => (
              <div key={`${index}-${position}`} className={`carousel-slide ${position}`}>
                <CarouselCard 
                  commit={commit} 
                  index={index} 
                />
              </div>
            ))}
          </div>
          
          <button className="carousel-nav next" onClick={nextSlide} disabled={commits.length <= 1}>
            ›
          </button>
        </div>
        
        <div className="carousel-indicators">
          <div className="timeline-dots">
            {commits.slice(0, 15).map((_, index) => (
              <button
                key={index}
                className={`timeline-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                title={`Commit ${commits[index].hash.slice(0, 8)}`}
              />
            ))}
            {commits.length > 15 && (
              <span className="dots-overflow">+{commits.length - 15}</span>
            )}
          </div>
          
          <div className="commit-counter">
            {currentIndex + 1} of {commits.length}
          </div>
        </div>
      </div>
    );
  }
  