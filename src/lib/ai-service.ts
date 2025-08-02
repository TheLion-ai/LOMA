import { Platform } from "react-native";

// Types for AI service
export interface AIMessage {
  role: "user" | "assistant" | "system";
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

// Enhanced AI service interface with embedding capabilities
export interface EnhancedAIService extends AIService {
  generateEmbedding?(text: string): Promise<Float32Array>;
  searchSimilar?(
    query: string,
    documents: Array<{ id: string; content: string; embedding?: Float32Array }>
  ): Promise<Array<{ id: string; content: string; similarity: number }>>;
}

// Factory function to create the appropriate AI service
export async function createAIService(): Promise<EnhancedAIService> {
  if (Platform.OS === "web") {
    const { TransformersAIService } = await import("./transformers-ai-service");
    return new TransformersAIService();
  } else {
    // Use ExecuTorch for mobile platforms (production-ready)
    const { ExecuTorchAIService } = await import("./executorch-ai-service");
    return new ExecuTorchAIService();
  }
}
