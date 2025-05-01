import { Request, Response } from 'express';
import { generateImagePromptWithAI } from '../services/openaiService';

/**
 * Generate an image prompt based on user input
 */
export const generateImagePromptController = async (req: Request, res: Response) => {
  try {
    const { inputText, imageData } = req.body;

    if (!inputText) {
      return res.status(400).json({ message: 'No input text provided' });
    }

    const result = await generateImagePromptWithAI(inputText, imageData);

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in generateImagePromptController:', error);
    res.status(500).json({ 
      message: 'Error generating image prompt',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 