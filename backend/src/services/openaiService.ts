import OpenAI, { toFile } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { UploadedFile } from 'express-fileupload';
import axios from 'axios';
import mime from 'mime-types';
import sharp from 'sharp';

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

/**
 * Generate a logo using OpenAI based on a text prompt
 */
export const generateLogoWithAI = async (
  prompt: string,
  style: string = 'modern'
): Promise<ImageResponse> => {
  try {
    console.log(`Generating logo with prompt: "${prompt}", style: ${style}`);
    // Create a detailed prompt for logo generation
    const fullPrompt = `Create a professional ${style} logo for: ${prompt}. 
      The logo should be clean, memorable, and work well at different sizes. 
      Use appropriate colors that match the brand's personality.
      Make it suitable for both digital and print use with a transparent background.`;

    console.log('Calling OpenAI images.generate with DALL-E 2');
    // Generate image with DALL-E 2
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      response_format: 'b64_json' // Request base64 directly if preferred over URL
    });

    console.log('Received response from OpenAI');
    // Check if we have a valid response with data
    if (!response.data || response.data.length === 0) {
      console.error('Invalid response structure from OpenAI:', response);
      throw new Error('No image data received from OpenAI');
    }

    let imageBase64 = '';
    const responseData = response.data[0];

    if (responseData.b64_json) {
      // If b64_json is available, use it
      console.log('Received base64 logo data.');
      imageBase64 = responseData.b64_json;
    } else if (responseData.url) {
      // Fallback or alternative: Handle URL if b64_json wasn't returned as expected
      console.log('Logo URL returned:', responseData.url);
       // For simplicity, we will return the URL directly.
      return {
        imageBase64: responseData.url,
        explanation: "Logo generated successfully (URL provided)."
      };
    }

    if (!imageBase64) {
       console.error('No b64_json or URL found in OpenAI logo response:', responseData);
      throw new Error('Failed to retrieve logo image data from OpenAI response.');
    }

    console.log('Generating explanation with GPT-4o-mini');
    // Get explanation from GPT
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a professional logo designer. Explain the design choices for the logo you just created based on the user's prompt and style preference."
        },
        { 
          role: "user", 
          content: `I asked for a logo based on this prompt: "${prompt}" in a ${style} style. Describe the generated logo, explaining the design choices, colors, and symbolism in relation to the request.`
        }
      ],
      max_tokens: 300,
    });

    const explanation = chatResponse.choices[0]?.message?.content?.trim() || "Logo generated successfully.";
    console.log('Successfully generated logo and explanation.');

    return {
      imageBase64: `data:image/png;base64,${imageBase64}`,
      explanation
    };
  } catch (error) {
    console.error('Error in generateLogoWithAI:', error);
    throw error;
  }
};

/**
 * Generate a detailed image prompt using OpenAI based on user input and optionally an image
 */
export const generateImagePromptWithAI = async (
  userInput: string,
  imageSource?: string // Optional URL or base64 string of the current image
): Promise<{ generatedPrompt: string }> => {
  try {
    console.log(`Generating image prompt based on input: "${userInput}" and potentially an image.`);

    // Construct the prompt messages for the chat model
    const systemMessage = `You are an AI assistant skilled at creating detailed, descriptive prompts for image generation models like DALL-E or Midjourney. Based on the user's simple input and potentially an accompanying image, generate a richer prompt that includes details about the subject, style, lighting, composition, and mood, incorporating relevant details observed from the image if provided. The prompt should be a single block of text. MAX 100 WORDS.`;
    
    // Prepare the user message content array
    const userMessageContent: Array<OpenAI.Chat.Completions.ChatCompletionContentPart> = [
      {
        type: "text",
        text: `Generate a prompt based on this idea: "${userInput}". ${imageSource ? 'Use the provided image as visual context.' : ''}`
      }
    ];

    // Add image if provided
    if (imageSource) {
      let imageInputUrl = imageSource; // Default to the provided source

      // Check if the imageSource is a local URL that needs converting
      if (imageSource.startsWith('http://localhost:') || imageSource.startsWith('/uploads/images/')) {
        console.log('Local image URL detected, converting to base64 data URL.');
        let localPath = '';
        try {
          // Construct the full local path to the image file
          if (imageSource.startsWith('http://localhost:')) {
            // Extract path after port number e.g., /uploads/images/file.png
            const urlPath = new URL(imageSource).pathname;
            // Assuming the backend server root matches the project root where /uploads is
            localPath = path.join(__dirname, '..', '..', urlPath);
          } else {
            // Assuming relative path from project root
            localPath = path.join(__dirname, '..', '..', imageSource);
          }
          
          console.log(`Attempting to read local image file from: ${localPath}`);

          // Check if file exists
          if (!fs.existsSync(localPath)) {
            console.error(`Local image file not found at: ${localPath}`);
            throw new Error(`Local image file not found: ${imageSource}`);
          }

          // Read the file and convert to base64
          const imageBuffer = fs.readFileSync(localPath);
          const base64Image = imageBuffer.toString('base64');
          const mimeType = mime.lookup(localPath) || 'image/png'; // Get MIME type or default
          imageInputUrl = `data:${mimeType};base64,${base64Image}`;
          console.log(`Converted local image to base64 data URL (type: ${mimeType}, length: ${imageInputUrl.length})`);

        } catch (fileError: any) {
          console.error(`Failed to read or convert local image file ${localPath}:`, fileError);
          // Don't throw here, maybe log and proceed without image? Or rethrow?
          // For now, let's log and proceed without the image context for prompt gen
          imageInputUrl = ''; // Clear the URL so it doesn't get added below
          // Assert that the first element is a text part before accessing .text
          const textPart = userMessageContent[0] as OpenAI.Chat.Completions.ChatCompletionContentPartText;
          textPart.text = `Generate a detailed image generation prompt based on this idea: "${userInput}". (Note: Could not load provided image context).`;
        }
      }

      // Ensure the image source is a valid URL (data URLs or public http(s) URLs)
      if (imageInputUrl.startsWith('data:image') || imageInputUrl.startsWith('https://')) {
         console.log('Adding image context to prompt generation:', imageInputUrl.substring(0, 60) + '...');
         userMessageContent.push({
          type: "image_url",
          image_url: { 
            url: imageInputUrl, 
            detail: "low"
          }
        });
      } else if (imageInputUrl.startsWith('http://') && !imageInputUrl.startsWith('http://localhost')) {
        // Allow non-localhost http URLs (might work, might not, depends on OpenAI policy/reachability)
        console.log('Adding potentially public HTTP image context:', imageInputUrl);
         userMessageContent.push({
          type: "image_url",
          image_url: { 
            url: imageInputUrl, 
            detail: "low"
          }
        });
      } else if (imageInputUrl) { // Only warn if we had an imageInputUrl but it wasn't valid/handled
        console.warn(`Invalid or local HTTP image source format provided: ${imageSource.substring(0, 60)}... Needs HTTPS URL or data URL, or failed local conversion.`);
      }
    }

    console.log('Calling OpenAI chat completion API (gpt-4o-mini) for prompt generation with context');
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessageContent } // Send combined text/image content
      ],
      max_tokens: 150, 
      temperature: 0.7
    });

    const generatedPrompt = chatResponse.choices[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      console.error('No prompt generated by the AI.');
      throw new Error('Failed to generate image prompt.');
    }

    console.log('Successfully generated image prompt:', generatedPrompt);
    return {
      generatedPrompt
    };

  } catch (error) {
    console.error('Error in generateImagePromptWithAI:', error);
    throw error;
  }
};

/**
 * Fill empty/transparent areas in an image while preserving the original content
 */
export const fillEmptySpaceWithAI = async (
  imageSource: UploadedFile | string,
  fillPrompt: string
): Promise<ImageResponse> => {
  try {
    console.log(`Filling empty space in image with prompt: "${fillPrompt}"`);

    // Prepare the image file for the API
    console.log('Preparing image for GPT Image edit with mask...');
    const imageForApi = await imageSourceToFile(imageSource);

    // Generate a mask from the image where transparent areas will be filled
    // For this to work, the image must have transparency
    const maskForApi = await generateMaskFromImage(imageSource);
    
    if (!maskForApi) {
      throw new Error('Could not generate mask from image. The image may not have transparent areas.');
    }

    // Call the GPT Image edit API with the image and mask
    // Always set size to 1024x1024 as requested
    console.log('Calling GPT Image edit API with mask and prompt:', fillPrompt);
    const imageResponse = await openai.images.edit({
      model: "gpt-image-1",
      image: imageForApi,
      mask: maskForApi,
      size: "1024x1024", // Fixed square output
      prompt: `Fill the transparent areas with ${fillPrompt}. Keep all existing content intact.`
    });

    console.log('Received response from GPT Image edit API');
    
    // Check if we have a valid response with data
    if (!imageResponse.data || imageResponse.data.length === 0 || !imageResponse.data[0].b64_json) {
      console.error('Invalid response structure from GPT Image edit:', imageResponse);
      throw new Error('No image data received from GPT Image edit');
    }

    const generatedImageBase64 = imageResponse.data[0].b64_json;

    console.log('Successfully received edited image from GPT Image (1024x1024)');
    return {
      imageBase64: `data:image/png;base64,${generatedImageBase64}`,
      explanation: `Empty space filled using GPT Image with "${fillPrompt}", resulting in a 1024x1024 square image.`
    };

  } catch (error) {
    console.error('Error in fillEmptySpaceWithAI:', error);
    throw error;
  }
};

/**
 * Helper function to generate a mask from an image where transparent areas will be filled
 * For OpenAI's inpainting: transparent areas in the mask (alpha=0) will be edited/filled,
 * while opaque areas (alpha=255) will be preserved
 */
async function generateMaskFromImage(imageSource: UploadedFile | string): Promise<any> {
  let tempFilePath: string | null = null;
  
  try {
    console.log('Generating mask from image for inpainting...');
    let inputBuffer: Buffer;
    
    // Get the image data as a buffer
    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:image')) {
        // Base64 data URL
        const base64Data = imageSource.split(',')[1];
        inputBuffer = Buffer.from(base64Data, 'base64');
      } else if (imageSource.startsWith('http')) {
        // URL
        const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
        inputBuffer = Buffer.from(response.data);
      } else {
        throw new Error('Unsupported image source format for mask generation');
      }
    } else {
      // Uploaded file
      inputBuffer = fs.readFileSync(imageSource.tempFilePath);
    }
    
    // Create a temporary file for the mask
    const filename = `mask_${Date.now()}.png`;
    const tempPath = path.join(__dirname, '../temp', filename);
    fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
    
    // We're directly using the original image as the mask
    // For OpenAI's inpainting, transparent areas in the mask will be filled
    // and opaque areas will be preserved
    fs.writeFileSync(tempPath, inputBuffer);
    
    const stream = fs.createReadStream(tempPath);
    const file = await toFile(stream, filename, { type: "image/png" });
    
    // Set to clean up temp file after function returns
    tempFilePath = tempPath;
    
    return file;
  } catch (error) {
    console.error('Error generating mask from image:', error);
    throw error;
  } finally {
    // Clean up any temporary files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Cleaned up temporary mask file: ${tempFilePath}`);
      } catch (err) {
        console.warn(`Failed to clean up temporary mask file: ${tempFilePath}`, err);
      }
    }
  }
} 