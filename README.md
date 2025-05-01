# ScreenShot Stylizer

An AI-powered image stylizer built with React, TypeScript, and OpenAI API.

## Features

- Upload and stylize images using OpenAI's AI image processing
- Interactive chat interface to describe styling preferences
- View history of image transformations
- Compare original and stylized images
- Generate custom logos with AI

## Technical Stack

- **Frontend**: React, TypeScript, CSS
- **Backend**: Node.js, Express
- **AI Integration**: OpenAI API (DALL-E 3 and GPT-4 Vision)
- **File Processing**: Express FileUpload

## Getting Started

### Prerequisites

- Node.js (16.x or higher)
- OpenAI API key

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/screenshot-stylizer.git
cd screenshot-stylizer
```

2. Install dependencies for both frontend and backend:
```
npm install
cd backend
npm install
cd ..
```

3. Create a `.env` file in the backend directory with your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

4. Start the development server:
```
npm run dev
```

This will start both the React frontend and Node.js backend concurrently.

## Usage

1. Upload an image via the drag-and-drop interface
2. Chat with the AI to describe how you want to stylize the image
3. View transformations and navigate through previous versions
4. Download the final result

## License

This project is licensed under the ISC License.

## Acknowledgments

- OpenAI for their powerful image generation and processing capabilities
- React team for the excellent frontend framework
- All open source contributors to the libraries used in this project 