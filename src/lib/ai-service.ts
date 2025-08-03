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
  /** Optional context to inject before the conversation */
  context?: string;
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

/**
 * Utility function to inject context into message history
 * @param messages Original conversation messages
 * @param context Context to inject
 * @returns Messages with context injected as system message
 */
export function injectContext(
  messages: AIMessage[],
  context?: string
): AIMessage[] {
  if (!context?.trim()) {
    return messages;
  }

  // Create a system message with the context
  const contextMessage: AIMessage = {
    role: "system",
    content: context,
  };

  // Insert context at the beginning, after any existing system messages
  const systemMessages = messages.filter((msg) => msg.role === "system");
  const nonSystemMessages = messages.filter((msg) => msg.role !== "system");

  return [...systemMessages, contextMessage, ...nonSystemMessages];
}

// Factory function to create the appropriate AI service
export async function createAIService(): Promise<AIService> {
  if (Platform.OS === "web") {
    const { TransformersAIService } = await import("./transformers-ai-service");
    return new TransformersAIService();
  } else {
    const { LlamaAIService } = await import("./llama-ai-service");
    return new LlamaAIService();
  }
}
