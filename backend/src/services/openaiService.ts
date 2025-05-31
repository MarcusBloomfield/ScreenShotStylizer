import OpenAI, { toFile } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { UploadedFile } from 'express-fileupload';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Check if API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY is not set in environment variables. OpenAI features will not work.');
}

interface ImageResponse {
  imageBase64: string;
  explanation: string;
}

// Helper to convert URL/base64 to a file for OpenAI
async function imageSourceToFile(imageSource: string | UploadedFile): Promise<any> {
  try {
    // Case 1: It's already an UploadedFile
    if (typeof imageSource !== 'string') {
      console.log('Using uploaded file directly');
      const imageStream = fs.createReadStream(imageSource.tempFilePath);
      return await toFile(imageStream, imageSource.name, { type: "image/png" });
    }
    
    // Case 2: It's a URL starting with http/https
    if (imageSource.startsWith('http')) {
      console.log('Converting URL to file');
      const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      const filename = `image_${Date.now()}.png`;
      
      // Create a temporary file
      const tempPath = path.join(__dirname, '../temp', filename);
      fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
      fs.writeFileSync(tempPath, buffer);
      
      const stream = fs.createReadStream(tempPath);
      const file = await toFile(stream, filename, { type: "image/png" });
      
      // Clean up
      fs.unlinkSync(tempPath);
      return file;
    }
    
    // Case 3: It's a base64 string
    if (imageSource.startsWith('data:image')) {
      console.log('Converting base64 to file');
      // Extract the base64 data
      const base64Data = imageSource.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `image_${Date.now()}.png`;
      
      // Create a temporary file
      const tempPath = path.join(__dirname, '../temp', filename);
      fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
      fs.writeFileSync(tempPath, buffer);
      
      const stream = fs.createReadStream(tempPath);
      const file = await toFile(stream, filename, { type: "image/png" });
      
      // Clean up
      fs.unlinkSync(tempPath);
      return file;
    }
    
    throw new Error('Unsupported image source format');
  } catch (error) {
    console.error('Error converting image source to file:', error);
    throw error;
  }
}

/**
 * Process an image with OpenAI GPT Image model to stylize it according to a prompt
 */
export const stylizeImageWithAI = async (
  imageSource: UploadedFile | string, // Now accepts either UploadedFile or URL/base64 string
  stylePrompt: string,
  previousVersionId: string | null = null // Not used but kept for API compatibility
): Promise<ImageResponse> => {
  let tempFilePath: string | null = null;
  
  try {
    console.log(`Stylizing image with style: "${stylePrompt}"`);

    // Prepare the image file for the API - handle both file uploads and string sources
    console.log('Preparing image for GPT Image edit...');
    const imageForApi = await imageSourceToFile(imageSource);

    // Call the GPT Image edit API
    console.log('Calling GPT Image edit API with prompt:', stylePrompt);
    const imageResponse = await openai.images.edit({
      model: "gpt-image-1",
      image: imageForApi,
      prompt: `${stylePrompt}. Make ONLY the specific changes mentioned in the prompt while meticulously preserving the original content, proportions, layout, composition, and style. Apply minimal edits - the result should look nearly identical to the original except for the requested changes. Maintain the highest quality of the original image, avoiding any stretching or distortion.`,
      quality: "high"
    });

    console.log('Received response from GPT Image edit API');
    
    // Check if we have a valid response with data
    if (!imageResponse.data || imageResponse.data.length === 0 || !imageResponse.data[0].b64_json) {
      console.error('Invalid response structure from GPT Image edit:', imageResponse);
      throw new Error('No image data received from GPT Image edit');
    }

    const generatedImageBase64 = imageResponse.data[0].b64_json;

    console.log('Successfully received edited image from GPT Image');
    return {
      imageBase64: `data:image/png;base64,${generatedImageBase64}`,
      explanation: `Image stylized using GPT Image in the style of '${stylePrompt}', preserving the original content.`
    };

  } catch (error) {
    console.error('Error in stylizeImageWithAI (GPT Image edit):', error);
    throw error; // Re-throw the error for the controller to handle
  } finally {
    // Clean up the temporary file, but only if it was a regular UploadedFile
    if (typeof imageSource !== 'string' && imageSource.tempFilePath) {
      try {
        fs.unlinkSync(imageSource.tempFilePath);
        console.log(`Cleaned up temporary file: ${imageSource.tempFilePath}`);
      } catch (unlinkErr) {
        console.warn(`Failed to clean up temporary file ${imageSource.tempFilePath}: ${unlinkErr}`);
      }
    }
  }
};
