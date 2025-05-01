import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface StyleResponse {
  imageUrl: string;
  explanation: string;
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
  previousVersionId: string | null = null
): Promise<StyleResponse> => {
  if (typeof image === 'string') {
    const response = await axios.post<StyleResponse>(`${API_URL}/images/stylize`, {
      imageData: image,
      prompt,
      previousVersionId: previousVersionId || undefined
    });
    return response.data;
  } else {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('prompt', prompt);
    
    if (previousVersionId) {
      formData.append('previousVersionId', previousVersionId);
    }

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