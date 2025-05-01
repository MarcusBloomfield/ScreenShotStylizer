import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface StyleResponse {
  imageUrl: string;
  explanation: string;
}

interface PromptResponse {
  generatedPrompt: string;
}

interface ResizeResponse {
  imageUrl: string; // URL of the newly resized image
}

export const uploadImageService = async (file: File): Promise<{ imageId: string }> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post<{ imageId: string }>(`${API_URL}/images/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const stylizeImageService = async (
  image: File | string,
  prompt: string, 
  targetWidth?: number,
  targetHeight?: number
): Promise<StyleResponse> => {
  if (typeof image === 'string') {
    const payload: any = {
      imageData: image, 
      prompt,
    };
    if (targetWidth) payload.targetWidth = targetWidth;
    if (targetHeight) payload.targetHeight = targetHeight;

    const response = await axios.post<StyleResponse>(`${API_URL}/images/stylize`, payload);
    return response.data;
  } else {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('prompt', prompt);
    if (targetWidth) formData.append('targetWidth', targetWidth.toString());
    if (targetHeight) formData.append('targetHeight', targetHeight.toString());

  const response = await axios.post<StyleResponse>(`${API_URL}/images/stylize`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
  }
};

export const generateLogoService = async (
  prompt: string,
  style: string
): Promise<StyleResponse> => {
  const response = await axios.post<StyleResponse>(`${API_URL}/images/generate-logo`, {
    prompt,
    style
  });

  return response.data;
};

export const generatePromptService = async (
  inputText: string,
  imageUrl?: string // Optional URL of the current image
): Promise<PromptResponse> => {
  console.log('Calling generate prompt service with input:', inputText, 'and image:', imageUrl);
  const payload: { inputText: string; imageData?: string } = { inputText };
  if (imageUrl) {
    payload.imageData = imageUrl;
  }
  
  const response = await axios.post<PromptResponse>(`${API_URL}/openai/generate-prompt`, payload);
  console.log('Received generated prompt:', response.data);
  return response.data;
};

export const resizeImageService = async (
  imageUrl: string, // URL or base64 of the image to resize
  targetWidth: number,
  targetHeight: number
): Promise<ResizeResponse> => {
  console.log(`Calling resize service for image: ${imageUrl.substring(0,50)}... to ${targetWidth}x${targetHeight}`);
  const response = await axios.post<ResizeResponse>(`${API_URL}/images/resize`, {
    imageData: imageUrl, 
    targetWidth,
    targetHeight
  });
  console.log('Received resized image URL:', response.data.imageUrl);
  return response.data;
}; 