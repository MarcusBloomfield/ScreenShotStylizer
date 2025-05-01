import React, { useState, useRef, useEffect } from 'react';
import { Message, ImageVersion } from '../models/Message';
import { generatePromptService } from '../services/imageService'; // Assuming service is in imageService
import '../styles/ChatFeed.css';

interface ChatFeedProps {
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  currentImageVersion: ImageVersion | null;
}

const ChatFeed: React.FC<ChatFeedProps> = ({ messages, onSendMessage, isLoading, currentImageVersion }) => {
  const [input, setInput] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false); // New state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const message = input.trim();
    setInput('');
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    await onSendMessage(message);
  };

  const handleGeneratePrompt = async () => {
    if (!input.trim() || isLoading || isGeneratingPrompt) return;
    
    const currentInput = input.trim();
    // Get the URL of the currently displayed image, if available
    const imageUrl = currentImageVersion?.url;
    
    setIsGeneratingPrompt(true);
    
    try {
      // Pass both text and image URL to the service
      const response = await generatePromptService(currentInput, imageUrl);
      setInput(response.generatedPrompt); // Update input with generated prompt
      // Focus and resize textarea after updating input
      if (inputRef.current) {
        inputRef.current.focus();
        // Trigger resize calculation
        setTimeout(() => {
          if (inputRef.current) {
             inputRef.current.style.height = 'auto';
             inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
          }
        }, 0);
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      // Maybe show an error message to the user?
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-feed">
      <div className="messages-container">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              <p>{message.content}</p>
              {message.imageUrl && (
                <div className="message-image">
                  <img src={message.imageUrl} alt="Stylized image" />
                </div>
              )}
            </div>
            <div className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe how you'd like to stylize the image..."
          rows={1}
          disabled={isLoading || isGeneratingPrompt} // Disable while generating prompt too
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        {/* Generate Prompt Button */}
        <button 
          type="button" // Important: Prevent form submission
          onClick={handleGeneratePrompt}
          disabled={isLoading || isGeneratingPrompt || !input.trim()}
          className={`generate-prompt-button ${isGeneratingPrompt ? 'loading' : ''}`}
          title="Generate a more detailed prompt from your text"
        >
          {isGeneratingPrompt ? (
            <div className="spinner-small"></div>
          ) : (
            '✨' // Simple sparkle emoji for the button
          )}
        </button>
        {/* Send Button */}
        <button 
          type="submit" 
          disabled={isLoading || isGeneratingPrompt || !input.trim()} // Disable while generating prompt
          className={isLoading ? 'loading' : ''}
        >
          {isLoading ? (
            <div className="spinner-small"></div>
          ) : (
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatFeed; 