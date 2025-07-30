import { Platform } from 'react-native';

// Types for AI service
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopWords?: string[];
  onToken?: (token: string) => void;
}

export interface AICompletionResult {
  text: string;
  finishReason?: string;
}

export interface AIService {
  initialize(): Promise<void>;
  isReady(): boolean;
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  cleanup(): Promise<void>;
}

// Factory function to create the appropriate AI service
export async function createAIService(): Promise<AIService> {
  if (Platform.OS === 'web') {
    const { TransformersAIService } = await import('./transformers-ai-service');
    return new TransformersAIService();
  } else {
    const { LlamaAIService } = await import('./llama-ai-service');
    return new LlamaAIService();
  }
}