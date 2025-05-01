export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  imageUrl?: string;
}

export interface ImageVersion {
  id: string;
  url: string;
  timestamp: Date;
  prompt?: string;
  feedback?: string;
} 