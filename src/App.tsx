import React, { useState, useEffect } from 'react';
import './styles/App.css';
import ImageUploader from './components/ImageUploader';
import ChatFeed from './components/ChatFeed';
import ImageDisplay from './components/ImageDisplay';
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
      error 
    },
    { 
      uploadImage: originalUploadImage,
      sendMessage, 
      downloadImage, 
      regenerateImage, 
      viewPreviousImage, 
      viewNextImage 
    }
  ] = useImageStyler();

  const [showUploader, setShowUploader] = useState<boolean>(false);

  const handleUpload = async (file: File) => {
    await originalUploadImage(file);
    setShowUploader(false);
  };
  
  const displayUploader = !uploadedImageInfo || showUploader;

  return (
    <div className="app">
      <header className="app-header">
        <h1>ScreenShot Stylizer</h1>
        <p>Upload an image and chat to stylize it using AI</p>
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
            <div className="content-container">
              <div className="chat-container">
                <ChatFeed 
                  messages={messageHistory} 
                  onSendMessage={sendMessage} 
                  isLoading={isLoading} 
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App; 