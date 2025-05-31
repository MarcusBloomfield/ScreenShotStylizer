import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface StyleResponse {
  imageUrl: string;
  explanation: string;
}

interface PromptResponse {
  generatedPrompt: string;
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
