/**
 * Embedding Service using ExecuTorch React Native
 * 
 * Provides text embedding functionality using the ALL_MINILM_L6_V2 model
 * for generating vector representations of text for semantic search.
 */

import React from 'react';
import {
  useTextEmbeddings,
  ALL_MINILM_L6_V2,
  ALL_MINILM_L6_V2_TOKENIZER,
} from 'react-native-executorch';

/**
 * React hook for using the ExecuTorch text embeddings model
 * This hook should be used within React components that need embedding functionality
 */
export function useEmbeddingModel() {
  const model = useTextEmbeddings({
    modelSource: ALL_MINILM_L6_V2,
    tokenizerSource: ALL_MINILM_L6_V2_TOKENIZER,
  });

  // Add some debugging information
  React.useEffect(() => {
    if (model.error) {
      console.error('Embedding model error:', model.error);
    }
    if (model.isReady) {
      console.log('Embedding model is ready for use');
    }
  }, [model.error, model.isReady]);

  return model;
}

/**
 * Queued embedding service that handles concurrent requests
 */
class QueuedEmbeddingService {
  private queue: Array<{
    text: string;
    resolve: (embedding: number[]) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;
  private model: ReturnType<typeof useTextEmbeddings> | null = null;

  setModel(model: ReturnType<typeof useTextEmbeddings>) {
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.queue.push({ text, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || !this.model || !this.model.isReady || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { text, resolve, reject } = this.queue.shift()!;

      try {
        // Wait if the model is currently generating
        while (this.model.isGenerating) {
          console.log('Model is generating, waiting...');
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`Generating embedding for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        const embedding = await this.model.forward(text);
        
        if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Generated embedding is invalid or empty');
        }

        console.log(`Generated embedding with ${embedding.length} dimensions`);
        resolve(embedding);
      } catch (error) {
        console.error('Failed to generate embedding:', error);
        reject(new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    this.isProcessing = false;
  }
}

// Global instance
export const queuedEmbeddingService = new QueuedEmbeddingService();

/**
 * Hook that provides a queued embedding service
 */
export function useQueuedEmbeddingService() {
  const model = useEmbeddingModel();

  React.useEffect(() => {
    if (model.isReady) {
      queuedEmbeddingService.setModel(model);
    }
  }, [model.isReady]);

  return {
    generateEmbedding: (text: string) => queuedEmbeddingService.generateEmbedding(text),
    isReady: model.isReady,
    error: model.error,
    isGenerating: model.isGenerating,
    downloadProgress: model.downloadProgress
  };
}

/**
 * Utility function to generate embeddings using the provided model
 * @param model - The embedding model from useEmbeddingModel hook
 * @param text - The text to generate an embedding for
 * @returns Promise that resolves to the embedding vector
 */
export async function generateEmbedding(
  model: ReturnType<typeof useTextEmbeddings>,
  text: string
): Promise<number[]> {
  if (!model.isReady) {
    throw new Error('Embedding model is not ready');
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Text input is required and must be a string');
  }

  try {
    console.log(`Generating embedding for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    const embedding = await model.forward(text);
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Generated embedding is invalid or empty');
    }

    console.log(`Generated embedding with ${embedding.length} dimensions`);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Utility function to generate embeddings for multiple texts
 * @param model - The embedding model from useEmbeddingModel hook
 * @param texts - Array of texts to generate embeddings for
 * @returns Promise that resolves to an array of embedding vectors
 */
export async function generateEmbeddings(
  model: ReturnType<typeof useTextEmbeddings>,
  texts: string[]
): Promise<number[][]> {
  if (!model.isReady) {
    throw new Error('Embedding model is not ready');
  }

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts array is required and must be non-empty');
  }

  try {
    console.log(`Generating embeddings for ${texts.length} texts`);
    
    const embeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text || typeof text !== 'string') {
        throw new Error(`Invalid text at index ${i}: must be a non-empty string`);
      }
      
      const embedding = await generateEmbedding(model, text);
      embeddings.push(embedding);
    }

    console.log(`Generated ${embeddings.length} embeddings successfully`);
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`);
  }
} 