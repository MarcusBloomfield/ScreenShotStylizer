import express from 'express';
import { generateImagePromptController, fillEmptySpaceController } from '../controllers/openaiController';

const router = express.Router();

// Route to generate a detailed image prompt
router.post('/generate-prompt', generateImagePromptController);

// Route to fill empty/transparent spaces in an image
router.post('/fill-empty-space', fillEmptySpaceController);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'OpenAI service is running',
    models: ['DALL-E 3', 'GPT-4 Vision', 'GPT Image Editor'] 
  });
});

export default router; 