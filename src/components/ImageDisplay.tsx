import React, { useState } from 'react';
import { ImageVersion } from '../models/Message';
import '../styles/ImageDisplay.css';

interface ImageDisplayProps {
  currentImageVersion: ImageVersion | null;
  originalImage: { dataUrl: string } | null;
  onDownload: () => void;
  onRegenerate: () => void;
  onPrevious: () => void;
  onNext: () => void;
  isLoading: boolean;
  currentImageIndex: number;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  currentImageVersion,
  originalImage,
  onDownload,
  onRegenerate,
  onPrevious,
  onNext,
  isLoading,
  currentImageIndex
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  
  const handleCompare = () => {
    setShowOriginal(!showOriginal);
  };
  
  // Determine the image URL to display
  const displayUrl = showOriginal 
    ? originalImage?.dataUrl 
    : currentImageVersion?.url;

  // Determine the alt text
  const altText = showOriginal 
    ? "Original uploaded image" 
    : currentImageVersion?.prompt 
      ? `Stylized image: ${currentImageVersion.prompt}` 
      : "Original uploaded image";

  // Determine if the current image is the original uploaded one
  const isOriginalImageSelected = currentImageIndex === 0;
    
  if (!displayUrl) return null;

  return (
    <div className="image-display">
      <div className="image-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Processing image...</p>
          </div>
        )}
        
        <img
          src={displayUrl}
          alt={altText}
          className={isLoading ? 'loading' : ''}
        />
      </div>

      <div className="image-controls">
        <div className="navigation-controls">
          <button
            onClick={onPrevious}
            disabled={isLoading || isOriginalImageSelected}
            title="Previous version"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <button
            onClick={handleCompare}
            disabled={isLoading || !originalImage || isOriginalImageSelected}
            title={showOriginal ? "Show current version" : "Compare original"}
            className={showOriginal ? 'active' : ''}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="2" x2="12" y2="22"></line>
              <path d="M17 12H3"></path>
              <path d="M21 12h-4"></path>
            </svg>
            {showOriginal ? "Showing original" : "Compare original"}
          </button>
          
          <button
            onClick={onNext}
            disabled={isLoading || !currentImageVersion}
            title="Next version"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div className="action-controls">
          <button
            className="regenerate-button"
            onClick={onRegenerate}
            disabled={isLoading || isOriginalImageSelected || !currentImageVersion}
            title="Generate a new version with the same prompt"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            Regenerate
          </button>

        <button
          className="download-button"
          onClick={onDownload}
            disabled={isLoading || !currentImageVersion}
          title="Download image"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download Image
        </button>
        </div>
      </div>
    </div>
  );
};

export default ImageDisplay; 