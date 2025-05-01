import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fileUpload from 'express-fileupload';

// Routes
import imageRoutes from './routes/imageRoutes';
import openaiRoutes from './routes/openaiRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Define absolute paths for directories - fix the double backend path issue
const basePath = process.cwd();
console.log('Current working directory:', basePath);

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

console.log('Server root directory:', rootDir);
console.log('Uploads directory path:', uploadsDir);
console.log('Images directory path:', imagesDir);

// Ensure directories exist
[uploadsDir, imagesDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    console.log(`Directory exists: ${dir}`);
  }
});

// Middleware
app.use(cors());
// Increase payload size limit for JSON requests (e.g., base64 images)
app.use(express.json({ limit: '50mb' })); 
// Increase payload size limit for URL-encoded requests (optional but good practice)
app.use(express.urlencoded({ limit: '50mb', extended: true })); 
app.use(morgan('dev'));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // Keep file upload limit separate (10MB)
  useTempFiles: true,
  tempFileDir: tempDir,
  debug: process.env.NODE_ENV !== 'production'
}));

// Set up static files directory for uploaded images
// Serve the 'images' subdirectory directly under '/uploads/images'
app.use('/uploads/images', express.static(imagesDir)); 
console.log(`Serving static image files from: ${imagesDir} at /uploads/images`);

// Routes
app.use('/api/images', imageRoutes);
app.use('/api/openai', openaiRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(rootDir, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(rootDir, '../dist/index.html'));
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: true,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 