import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ImageVersion } from '../models/Message';
import { uploadImageService, stylizeImageService} from '../services/imageService';

// Define the backend URL (ideally from an environment variable)
const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ImageFile {
  file: File;
  dataUrl: string;
  fileName: string;
}

interface ImageStylerState {
  uploadedImageInfo: ImageFile | null;
  currentImageVersion: ImageVersion | null;
  imageHistory: ImageVersion[];
  currentImageIndex: number;
  messageHistory: Message[];
  isLoading: boolean;
  error: string | null;
}

interface ImageStylerActions {
  uploadImage: (file: File) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  downloadImage: () => void;
  regenerateImage: () => Promise<void>;
  viewPreviousImage: () => void;
  viewNextImage: () => void;
}

export const useImageStyler = (): [ImageStylerState, ImageStylerActions] => {
  const [state, setState] = useState<ImageStylerState>({
    uploadedImageInfo: null,
    currentImageVersion: null,
    imageHistory: [],
    currentImageIndex: -1,
    messageHistory: [],
    isLoading: false,
    error: null,
  });

  const uploadImage = useCallback(async (file: File) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null
    }));
    
    try {
      // Read file as data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload image to backend
      const uploadedImageData = await uploadImageService(file);
      
      // Create the ImageVersion for the newly uploaded original image
      const originalImageVersion: ImageVersion = {
        id: uuidv4(),
        url: dataUrl,
        timestamp: new Date(),
        prompt: undefined // Mark as original
      };
      
      // Add a system message indicating a new image upload
      const newUploadMessage: Message = {
        id: uuidv4(),
        content: `New image uploaded: ${file.name}. You can now describe how you want to stylize it.`,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setState(prev => {
        // Append the new original image to the end of the existing history
        const newHistory = [...prev.imageHistory, originalImageVersion];
        return {
        ...prev,
          uploadedImageInfo: { // Update the primary uploaded info
          file,
          dataUrl,
          fileName: file.name
        },
          imageHistory: newHistory, // Append to existing history
          currentImageIndex: newHistory.length - 1, // Set index to the new image
          currentImageVersion: originalImageVersion, // Display the new image
          // Keep existing message history and add the new upload notification
          messageHistory: [...prev.messageHistory, newUploadMessage], 
        isLoading: false
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to upload image'
      }));
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!state.uploadedImageInfo) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        content,
        sender: 'user',
        timestamp: new Date()
      };
      
      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, userMessage]
      }));
      
      // Get the source image 
      let imageSource: File | string;
      if (state.currentImageIndex === 0 && state.uploadedImageInfo) {
        imageSource = state.uploadedImageInfo.file;
      } else if (state.currentImageVersion?.url) {
        imageSource = state.currentImageVersion.url;
      } else if (state.uploadedImageInfo) { // Fallback safety
        imageSource = state.uploadedImageInfo.file;
      } else {
        throw new Error("No valid image source found for stylization.");
      }
      
      
      // Process with AI using the current image and dimensions
      const result = await stylizeImageService(
        imageSource,
        content,
      );

      // Construct the full URL
      const fullImageUrl = `${BACKEND_URL}${result.imageUrl}`; 
      
      // Create styled image version
      const newImageVersion: ImageVersion = {
        id: uuidv4(),
        url: fullImageUrl,
        timestamp: new Date(),
        prompt: content
      };
      
      // Create assistant response - without imageUrl
      const assistantMessage: Message = {
        id: uuidv4(),
        content: result.explanation || "I've stylized your image based on your request.",
        sender: 'assistant',
        timestamp: new Date()
      };
      
      // Update state with new data
      setState(prev => {
        // Append new version to the end of the full history
        const newHistory = [...prev.imageHistory, newImageVersion];
        return {
          ...prev,
          currentImageVersion: newImageVersion,
          imageHistory: newHistory,
          currentImageIndex: newHistory.length - 1, // Point to the newest image
          messageHistory: [...prev.messageHistory, assistantMessage],
          isLoading: false
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to process your request'
      }));
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I encountered an error processing your request. Please try again.",
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, errorMessage]
      }));
    }
  }, [state.uploadedImageInfo, state.currentImageIndex, state.currentImageVersion]);

  // Regenerate function
  const regenerateImage = useCallback(async () => {
    if (!state.uploadedImageInfo || !state.currentImageVersion || state.currentImageIndex === 0) return;
    
    const currentPrompt = state.currentImageVersion.prompt;
    if (!currentPrompt) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Get the source image
      let imageSource: File | string;
      if (state.currentImageVersion?.url) {
        imageSource = state.currentImageVersion.url;
      } else if (state.uploadedImageInfo) { // Fallback safety
         imageSource = state.uploadedImageInfo.file;
      } else {
        throw new Error("No valid image source found for regeneration.");
      }

      
      // Process with AI using the current image, prompt, and dimensions
      const result = await stylizeImageService(
        imageSource,
        currentPrompt
      );

      // Construct the full URL
      const fullImageUrl = `${BACKEND_URL}${result.imageUrl}`; 
      
      // Create styled image version
      const newImageVersion: ImageVersion = {
        id: uuidv4(),
        url: fullImageUrl,
        timestamp: new Date(),
        prompt: currentPrompt
      };
      
      // Create assistant response - without imageUrl
      const assistantMessage: Message = {
        id: uuidv4(),
        content: result.explanation || "I've regenerated a new version with the same style.",
        sender: 'assistant',
        timestamp: new Date()
      };
      
      // Update state with new data
      setState(prev => {
        // Append new version to the end of the full history
        const newHistory = [...prev.imageHistory, newImageVersion];
        return {
          ...prev,
          currentImageVersion: newImageVersion, // Display the new image
          imageHistory: newHistory,
          currentImageIndex: newHistory.length - 1, // Point to the new image
          messageHistory: [...prev.messageHistory, assistantMessage],
          isLoading: false
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate image'
      }));
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I encountered an error regenerating the image. Please try again.",
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, errorMessage]
      }));
    }
  }, [state.uploadedImageInfo, state.currentImageVersion, state.currentImageIndex]);

  const downloadImage = useCallback(() => {
    if (!state.currentImageVersion) return;
    
    const a = document.createElement('a');
    a.href = state.currentImageVersion.url;
    
    const promptPart = state.currentImageVersion.prompt 
      ? state.currentImageVersion.prompt.replace(/\\s+/g, '_').substring(0, 30)
      : 'original';
    const timestamp = state.currentImageVersion.timestamp.getTime();
    a.download = `stylized_${promptPart}_${timestamp}.png`; 
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [state.currentImageVersion]);

  const viewPreviousImage = useCallback(() => {
    setState(prev => {
      if (prev.currentImageIndex > 0) {
      const newIndex = prev.currentImageIndex - 1;
      return {
        ...prev,
        currentImageIndex: newIndex,
          currentImageVersion: prev.imageHistory[newIndex]
      };
      }
      return prev;
    });
  }, []);

  const viewNextImage = useCallback(() => {
    setState(prev => {
      if (prev.currentImageIndex < prev.imageHistory.length - 1) {
      const newIndex = prev.currentImageIndex + 1;
      return {
        ...prev,
        currentImageIndex: newIndex,
          currentImageVersion: prev.imageHistory[newIndex]
      };
      }
      return prev;
    });
  }, []);

  return [
    {
      uploadedImageInfo: state.uploadedImageInfo,
      currentImageVersion: state.currentImageVersion,
      imageHistory: state.imageHistory,
      currentImageIndex: state.currentImageIndex,
      messageHistory: state.messageHistory,
      isLoading: state.isLoading,
      error: state.error,
    },
    {
      uploadImage,
      sendMessage,
      downloadImage,
      regenerateImage, 
      viewPreviousImage,
      viewNextImage,
    }
  ];
}; 