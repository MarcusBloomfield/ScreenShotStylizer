import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';
import axios from 'axios';
import sharp from 'sharp';
import { stylizeImageWithAI } from '../services/openaiService';

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
 * Process and save image from OpenAI (handles base64 or URL), potentially resizing.
 */
const saveImageFromResult = async (
  imageData: string, 
  targetWidth?: number, 
  targetHeight?: number
): Promise<string> => {
  const imageId = uuidv4();
  const fileName = `${imageId}.png`;
  const filePath = path.join(imagesDir, fileName);

  console.log(`ImageController:saveImageFromResult - Saving processed image to: ${filePath} (Target size: ${targetWidth}x${targetHeight})`);

  try {
    let imageBuffer: Buffer;

    if (imageData.startsWith('http')) {
      const response = await axios.get(imageData, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(response.data);
    } else {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    }

    if (targetWidth && targetHeight) {
      console.log(`ImageController:saveImageFromResult - Resizing image to ${targetWidth}x${targetHeight}`);
      imageBuffer = await sharp(imageBuffer)
        .resize(targetWidth, targetHeight, {
          fit: 'fill'
        })
        .png() 
        .toBuffer();
    } else {
      imageBuffer = await sharp(imageBuffer).png().toBuffer();
    }

    fs.writeFileSync(filePath, imageBuffer);

    if (fs.existsSync(filePath)) {
      console.log('ImageController:saveImageFromResult - File saved successfully at:', filePath);
    } else {
      console.error('ImageController:saveImageFromResult - File was not saved at:', filePath);
    }
    
    return `/uploads/images/${fileName}`;
  } catch (error) {
    console.error('ImageController:saveImageFromResult - Error saving/resizing image:', error);
    throw error;
  }
};

/**
 * Stylize an image with OpenAI
 */
export const stylizeImage = async (req: Request, res: Response) => {
  try {
    const { prompt, imageData, targetWidth, targetHeight } = req.body;
    const imageFile = (req.files && req.files.image) ? req.files.image as UploadedFile : null;

    // Validate prompt
    if (!prompt) {
      return res.status(400).json({ message: 'No prompt was provided' });
    }

    let imageSource: UploadedFile | string;
    
    // Determine image source
    if (imageFile) {
      console.log('ImageController - Using uploaded file for stylize');
      imageSource = imageFile;
    } else if (imageData) {
      console.log('ImageController - Using provided image data from body for stylize');
      imageSource = imageData;
    } else {
      return res.status(400).json({ message: 'No image source provided (file or data)' });
    }

    // Convert target dimensions to numbers if they exist
    const width = targetWidth ? parseInt(targetWidth as string, 10) : undefined;
    const height = targetHeight ? parseInt(targetHeight as string, 10) : undefined;

    // Process the image with OpenAI (this returns base64)
    const result = await stylizeImageWithAI(imageSource, prompt);
    
    // Save the resulting image, resizing if dimensions were provided
    const imageUrl = await saveImageFromResult(result.imageBase64, width, height);

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