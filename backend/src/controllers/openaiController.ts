import { Request, Response } from 'express';
import { generateImagePromptWithAI, fillEmptySpaceWithAI } from '../services/openaiService';

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

/**
 * Fill empty/transparent spaces in an image
 */
export const fillEmptySpaceController = async (req: Request, res: Response) => {
  try {
    const { imageData, fillPrompt } = req.body;

    if (!imageData) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    if (!fillPrompt) {
      return res.status(400).json({ message: 'No fill prompt provided' });
    }

    const result = await fillEmptySpaceWithAI(imageData, fillPrompt);

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in fillEmptySpaceController:', error);
    res.status(500).json({ 
      message: 'Error filling empty space in image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 