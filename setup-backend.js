const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create uploads directories
const setupDirectories = () => {
  console.log('Setting up upload directories...');
  
  const uploadsDir = path.join(__dirname, 'backend', 'uploads');
  const imagesDir = path.join(uploadsDir, 'images');
  const tempDir = path.join(uploadsDir, 'temp');
  
  [uploadsDir, imagesDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Create .env file
const setupEnvFile = (apiKey) => {
  const envPath = path.join(__dirname, 'backend', '.env');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('.env file already exists, checking for OPENAI_API_KEY...');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Only update if no API key is found
    if (!envContent.includes('OPENAI_API_KEY=')) {
      const newContent = `${envContent}\nOPENAI_API_KEY=${apiKey}`;
      fs.writeFileSync(envPath, newContent);
      console.log('Added OPENAI_API_KEY to existing .env file');
    } else {
      console.log('OPENAI_API_KEY already exists in .env file');
    }
  } else {
    // Create new .env file
    const envContent = `PORT=3001\nNODE_ENV=development\nOPENAI_API_KEY=${apiKey}`;
    fs.writeFileSync(envPath, envContent);
    console.log('Created new .env file with OPENAI_API_KEY');
  }
};

const installDependencies = () => {
  console.log('Installing backend dependencies...');
  
  try {
    process.chdir(path.join(__dirname, 'backend'));
    execSync('npm install', { stdio: 'inherit' });
    console.log('Successfully installed backend dependencies');
  } catch (error) {
    console.error('Failed to install dependencies:', error.message);
    process.exit(1);
  }
};

// Main setup function
const setupBackend = async () => {
  console.log('Starting backend setup for ScreenShot Stylizer...');
  
  setupDirectories();
  
  rl.question('Please enter your OpenAI API key: ', (apiKey) => {
    if (!apiKey) {
      console.log('No API key provided. You can add it later in the backend/.env file');
    } else {
      setupEnvFile(apiKey.trim());
    }
    
    installDependencies();
    
    console.log('\nBackend setup complete! You can now run the app with:');
    console.log('npm run dev');
    
    rl.close();
  });
};

// Run the setup
setupBackend(); 