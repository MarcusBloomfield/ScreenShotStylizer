import express from 'express';
import { uploadImage, stylizeImage, generateLogo, resizeImageController } from '../controllers/imageController';

const router = express.Router();

/**
 * @route   POST /api/images/upload
 * @desc    Upload an image
 * @access  Public
 */
router.post('/upload', uploadImage);

/**
 * @route   POST /api/images/stylize
 * @desc    Stylize an image using OpenAI
 * @access  Public
 */
router.post('/stylize', stylizeImage);

/**
 * @route   POST /api/images/generate-logo
 * @desc    Generate a logo using OpenAI
 * @access  Public
 */
router.post('/generate-logo', generateLogo);

/**
 * @route   POST /api/images/resize
 * @desc    Resize an image
 * @access  Public
 */
router.post('/resize', resizeImageController);

export default router; 