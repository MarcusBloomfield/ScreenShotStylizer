import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'OpenAI service is running',
    models: ['DALL-E 3', 'GPT-4 Vision'] 
  });
});

export default router; 