import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';
import axios from 'axios';
import { stylizeImageWithAI, generateLogoWithAI } from '../services/openaiService';

// Define absolute paths for directories - fix the double backend path issue
const basePath = process.cwd();
console.log('ImageController - Current working directory:', basePath);

// Make sure we're in the right directory
let rootDir;
if (basePath.endsWith('backend\\backend')) {
  // We're in a nested backend directory, adjust path
  rootDir = path.resolve(basePath, '../../backend');
} else if (basePath.endsWith('backend')) {
  // We're in the correct backend directory
  rootDir = basePath;
} else {
  // We're in the project root, use the backend directory
  rootDir = path.resolve(basePath, 'backend');
}

const uploadsDir = path.join(rootDir, 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const tempDir = path.join(uploadsDir, 'temp');

console.log('ImageController - Root directory:', rootDir);
console.log('ImageController - Uploads directory:', uploadsDir);
console.log('ImageController - Images directory:', imagesDir);

// Ensure directories exist
[uploadsDir, imagesDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`ImageController - Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    console.log(`ImageController - Directory exists: ${dir}`);
    // Log the contents of the directory
    try {
      const files = fs.readdirSync(dir);
      console.log(`ImageController - Files in ${dir}:`, files);
    } catch (error) {
      console.error(`ImageController - Error reading directory ${dir}:`, error);
    }
  }
});

/**
 * Upload an image to the server
 */
export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No image was uploaded' });
    }

    const imageFile = req.files.image as UploadedFile;
    
    // Validate file type
    if (!imageFile.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Please upload a valid image file' });
    }
    
    // Generate a unique filename
    const imageId = uuidv4();
    const fileExtension = path.extname(imageFile.name);
    const fileName = `${imageId}${fileExtension}`;
    const filePath = path.join(imagesDir, fileName);

    console.log('ImageController - Saving uploaded image to:', filePath);

    // Move the file from temp to permanent location
    await imageFile.mv(filePath);
    
    // Verify the file was saved
    if (fs.existsSync(filePath)) {
      console.log('ImageController - File saved successfully at:', filePath);
    } else {
      console.error('ImageController - File was not saved at:', filePath);
    }

    // Return the image ID and URL
    res.status(200).json({ 
      imageId, 
      imageUrl: `/uploads/images/${fileName}`
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      message: 'Error uploading image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Process and save image from OpenAI (either URL or base64)
 */
const saveImageFromResult = async (imageData: string): Promise<string> => {
  const imageId = uuidv4();
  const fileName = `${imageId}.png`;
  const filePath = path.join(imagesDir, fileName);

  console.log('ImageController - Saving processed image to:', filePath);

  try {
    // Check if it's a URL or base64 data
    if (imageData.startsWith('http')) {
      // It's a URL, download the image
      console.log('ImageController - Downloading image from URL:', imageData);
      const response = await axios.get(imageData, { responseType: 'arraybuffer' });
      fs.writeFileSync(filePath, Buffer.from(response.data), 'binary');
    } else {
      // It's a base64 string, remove the data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
    }

    // Verify the file was saved
    if (fs.existsSync(filePath)) {
      console.log('ImageController - File saved successfully at:', filePath);
      const stats = fs.statSync(filePath);
      console.log('ImageController - File size:', stats.size, 'bytes');
    } else {
      console.error('ImageController - File was not saved at:', filePath);
    }
    
    return `/uploads/images/${fileName}`;
  } catch (error) {
    console.error('ImageController - Error saving image:', error);
    throw error;
  }
};

/**
 * Stylize an uploaded image with OpenAI
 */
export const stylizeImage = async (req: Request, res: Response) => {
  try {
    // Check if request includes prompt
    if (!req.body.prompt) {
      return res.status(400).json({ message: 'No prompt was provided' });
    }

    const prompt = req.body.prompt;
    const previousVersionId = req.body.previousVersionId || null;
    
    let imageSource;
    
    // Option 1: Image provided as file upload
    if (req.files && req.files.image) {
      console.log('ImageController - Using uploaded file');
      imageSource = req.files.image as UploadedFile;
    } 
    // Option 2: Image provided as URL or base64 in request body
    else if (req.body.imageData) {
      console.log('ImageController - Using provided image data from body');
      imageSource = req.body.imageData;
    } 
    else {
      return res.status(400).json({ message: 'No image was provided (neither as file upload nor as URL/base64)' });
    }

    // Process the image with OpenAI
    const result = await stylizeImageWithAI(imageSource, prompt, previousVersionId);
    
    // Save the resulting image (handles both URL and base64)
    const imageUrl = await saveImageFromResult(result.imageBase64);

    console.log('ImageController - Image URL to return:', imageUrl);

    // Return the processed image data
    res.status(200).json({
      imageUrl,
      explanation: result.explanation
    });

  } catch (error) {
    console.error('Error stylizing image:', error);
    res.status(500).json({ 
      message: 'Error stylizing image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Generate a logo with OpenAI
 */
export const generateLogo = async (req: Request, res: Response) => {
  try {
    const { prompt, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'No prompt was provided' });
    }

    // Generate logo with OpenAI
    const result = await generateLogoWithAI(prompt, style || 'modern');
    
    // Save the resulting image (handles both URL and base64)
    const imageUrl = await saveImageFromResult(result.imageBase64);

    console.log('ImageController - Logo URL to return:', imageUrl);

    // Return the processed image data
    res.status(200).json({
      imageUrl,
      explanation: result.explanation
    });

  } catch (error) {
    console.error('Error generating logo:', error);
    res.status(500).json({ 
      message: 'Error generating logo',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 