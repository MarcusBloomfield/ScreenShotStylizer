import React, { useState, useEffect } from 'react';
import './styles/App.css';
import ImageUploader from './components/ImageUploader';
import ChatFeed from './components/ChatFeed';
import ImageDisplay from './components/ImageDisplay';
import PropertiesPanel from './components/PropertiesPanel';
import { Message } from './models/Message';
import { useImageStyler } from './hooks/useImageStyler';

const App: React.FC = () => {
  const [
    { 
      uploadedImageInfo,
      currentImageVersion,
      currentImageIndex,
      messageHistory, 
      isLoading, 
      error,
      selectedWidth,
      selectedHeight
    },
    { 
      uploadImage: originalUploadImage,
      sendMessage, 
      downloadImage, 
      regenerateImage, 
      viewPreviousImage, 
      viewNextImage, 
      updateImageDimensions,
      resizeCurrentImage,
      fillEmptySpace
    }
  ] = useImageStyler();

  // State for dark mode - initialize from localStorage or default to system preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    // Default to system preference if available
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // State to control showing the uploader after initial upload
  const [showUploader, setShowUploader] = useState<boolean>(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
  };

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a preference
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    
    // Add event listener with compatibility check
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    return undefined;
  }, []);

  const handleUpload = async (file: File) => {
    await originalUploadImage(file);
    setShowUploader(false);
  };
  
  const displayUploader = !uploadedImageInfo || showUploader;

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      <header className="app-header">
        <div className="header-content">
          <h1>ScreenShot Stylizer</h1>
          <p>Upload an image and chat to stylize it using AI</p>
        </div>
        {/* Dark Mode Toggle Button */}
        <button onClick={toggleDarkMode} className="theme-toggle-button" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          {isDarkMode ? (
            // Moon Icon
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          ) : (
            // Sun Icon
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          )}
        </button>
      </header>

      <main className="app-main">
        {error && <div className="error-banner">{error}</div>}

        {displayUploader ? (
          <div className="upload-container">
            {uploadedImageInfo && showUploader && (
              <button 
                onClick={() => setShowUploader(false)} 
                className="cancel-upload-button"
                disabled={isLoading}
              >
                Cancel Upload
              </button>
            )}
            <ImageUploader onUpload={handleUpload} isLoading={isLoading} />
          </div>
        ) : (
          <div className="content-container-wrapper">
            <div className="new-upload-button-container">
              <button 
                onClick={() => setShowUploader(true)} 
                className="new-upload-button"
                disabled={isLoading}
              >
                Upload New Image
              </button>
            </div>
            <div className="main-content-area">
              <div className="chat-container">
                <ChatFeed 
                  messages={messageHistory} 
                  onSendMessage={sendMessage} 
                  isLoading={isLoading} 
                  currentImageVersion={currentImageVersion}
                />
              </div>
              <div className="image-container">
                <ImageDisplay 
                  currentImageVersion={currentImageVersion}
                  originalImage={uploadedImageInfo}
                  onDownload={downloadImage}
                  onRegenerate={regenerateImage}
                  onPrevious={viewPreviousImage}
                  onNext={viewNextImage}
                  isLoading={isLoading}
                  currentImageIndex={currentImageIndex}
                />
              </div>
              <PropertiesPanel 
                selectedWidth={selectedWidth}
                selectedHeight={selectedHeight}
                onDimensionsChange={updateImageDimensions}
                onResizeNow={resizeCurrentImage}
                onFillEmptySpace={fillEmptySpace}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App; 