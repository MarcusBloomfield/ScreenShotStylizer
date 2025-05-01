import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import '../styles/ImageUploader.css';

interface ImageUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, isLoading }) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      
      // Validate file type
      if (!file.type.match('image.*')) {
        setError('Please upload an image file (PNG, JPG, JPEG, etc.)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size exceeds the 10MB limit');
        return;
      }
      
      setError(null);
      await onUpload(file);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    disabled: isLoading,
    multiple: false
  });

  return (
    <div className="image-uploader">
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
      >
        <input {...getInputProps()} />
        
        {isLoading ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Processing image...</p>
          </div>
        ) : (
          <>
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <h3>Upload an image to stylize</h3>
            <p>{isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to select'}</p>
            <p className="file-types">Supports: PNG, JPG, JPEG, GIF, WEBP</p>
          </>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default ImageUploader; 