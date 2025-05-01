import express from 'express';
import { generateImagePromptController } from '../controllers/openaiController';

const router = express.Router();

// Route to generate a detailed image prompt
router.post('/generate-prompt', generateImagePromptController);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'OpenAI service is running',
    models: ['DALL-E 3', 'GPT-4 Vision'] 
  });
});

export default router; 