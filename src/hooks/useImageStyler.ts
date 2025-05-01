import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ImageVersion } from '../models/Message';
import { uploadImageService, stylizeImageService, resizeImageService, fillEmptySpaceService } from '../services/imageService';

// Define the backend URL (ideally from an environment variable)
const BACKEND_URL = 'http://localhost:3001';

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
  selectedWidth: number | null;
  selectedHeight: number | null;
}

interface ImageStylerActions {
  uploadImage: (file: File) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  downloadImage: () => void;
  regenerateImage: () => Promise<void>;
  viewPreviousImage: () => void;
  viewNextImage: () => void;
  updateImageDimensions: (width: number | null, height: number | null) => void;
  resizeCurrentImage: () => Promise<void>;
  fillEmptySpace: (fillPrompt: string) => Promise<void>;
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
    selectedWidth: null,
    selectedHeight: null,
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
      
      // Get current dimensions from state
      const { selectedWidth, selectedHeight } = state;
      
      // Process with AI using the current image and dimensions
      const result = await stylizeImageService(
        imageSource,
        content,
        selectedWidth ?? undefined,
        selectedHeight ?? undefined
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
  }, [state.uploadedImageInfo, state.currentImageIndex, state.currentImageVersion, state.selectedWidth, state.selectedHeight]);

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

      // Get current dimensions from state
      const { selectedWidth, selectedHeight } = state;
      
      // Process with AI using the current image, prompt, and dimensions
      const result = await stylizeImageService(
        imageSource,
        currentPrompt,
        selectedWidth ?? undefined,
        selectedHeight ?? undefined
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
  }, [state.uploadedImageInfo, state.currentImageVersion, state.currentImageIndex, state.selectedWidth, state.selectedHeight]);

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

  // Action to update dimensions
  const updateImageDimensions = useCallback((width: number | null, height: number | null) => {
    console.log('Updating dimensions to:', width, height);
    setState(prev => ({ 
      ...prev, 
      selectedWidth: width,
      selectedHeight: height
    }));
  }, []);

  // Action to resize the current image
  const resizeCurrentImage = useCallback(async () => {
    if (!state.currentImageVersion || !state.currentImageVersion.url || !state.selectedWidth || !state.selectedHeight) {
      console.error('Cannot resize: Missing current image or selected dimensions.');
      setState(prev => ({ ...prev, error: 'Select target dimensions before resizing.' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const { url: sourceUrl, prompt: sourcePrompt } = state.currentImageVersion;
    const { selectedWidth, selectedHeight } = state;
    
    try {
      const result = await resizeImageService(sourceUrl, selectedWidth, selectedHeight);
      
      // Construct the full URL for the new resized image
      const fullResizedUrl = `${BACKEND_URL}${result.imageUrl}`;
      
      // Create a new image version for the resized image
      const resizedImageVersion: ImageVersion = {
        id: uuidv4(),
        url: fullResizedUrl,
        timestamp: new Date(),
        prompt: sourcePrompt, // Keep the prompt from the original
        feedback: `Resized from original state.` // Add note about resize
      };
      
      // Add a message to chat history
      const resizeMessage: Message = {
        id: uuidv4(),
        content: `Image resized to ${selectedWidth}x${selectedHeight}.`,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      // Update state: Append resized image to history
      setState(prev => {
        const newHistory = [...prev.imageHistory, resizedImageVersion];
        return {
          ...prev,
          currentImageVersion: resizedImageVersion,
          imageHistory: newHistory,
          currentImageIndex: newHistory.length - 1,
          messageHistory: [...prev.messageHistory, resizeMessage],
          isLoading: false
        };
      });

    } catch (error) {
      console.error('Error resizing image:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to resize image';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
       // Add error message to chat
       const errorMessage: Message = {
        id: uuidv4(),
        content: `Sorry, I encountered an error resizing the image: ${errorMsg}`,
        sender: 'assistant',
        timestamp: new Date()
      };
      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, errorMessage]
      }));
    }
  }, [state.currentImageVersion, state.selectedWidth, state.selectedHeight]);

  // Add after other action functions
  const fillEmptySpace = useCallback(async (fillPrompt: string) => {
    if (!state.currentImageVersion) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Get the current image
      const imageSource = state.currentImageVersion.url;
      
      // Process with AI to fill empty space
      const result = await fillEmptySpaceService(imageSource, fillPrompt);
      
      // Create a new image version from the result
      const newImageVersion: ImageVersion = {
        id: uuidv4(),
        url: result.imageBase64, // Direct base64 data URL
        timestamp: new Date(),
        prompt: `Fill empty space: ${fillPrompt}`
      };
      
      // Create assistant response message
      const assistantMessage: Message = {
        id: uuidv4(),
        content: result.explanation || "I've filled the empty space in your image based on your request.",
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
        error: error instanceof Error ? error.message : 'Failed to fill empty space'
      }));
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I encountered an error filling the empty space. The image may not have any transparent areas.",
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setState(prev => ({
        ...prev,
        messageHistory: [...prev.messageHistory, errorMessage]
      }));
    }
  }, [state.currentImageVersion]);

  return [
    {
      uploadedImageInfo: state.uploadedImageInfo,
      currentImageVersion: state.currentImageVersion,
      imageHistory: state.imageHistory,
      currentImageIndex: state.currentImageIndex,
      messageHistory: state.messageHistory,
      isLoading: state.isLoading,
      error: state.error,
      selectedWidth: state.selectedWidth,
      selectedHeight: state.selectedHeight
    },
    {
      uploadImage,
      sendMessage,
      downloadImage,
      regenerateImage, 
      viewPreviousImage,
      viewNextImage,
      updateImageDimensions,
      resizeCurrentImage,
      fillEmptySpace
    }
  ];
}; 