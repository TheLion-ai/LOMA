/**
 * Web-specific Embedding Service
 * 
 * Provides mock embedding functionality for web platform
 * since react-native-executorch is not available on web.
 */

import React from 'react';

// Mock implementation for web
const mockEmbeddingModel = {
  isReady: true,
  isGenerating: false,
  error: null,
  downloadProgress: 100,
  forward: async (text: string): Promise<number[]> => {
    // Return a mock embedding vector for web
    console.warn('Using mock embedding service on web platform');
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    return new Array(384).fill(0).map(() => Math.random() - 0.5);
  }
};

/**
 * React hook for using the mock text embeddings model on web
 */
export function useEmbeddingModel() {
  const [model] = React.useState(mockEmbeddingModel);

  React.useEffect(() => {
    console.log('Mock embedding model is ready for use on web');
  }, []);

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
  private model: typeof mockEmbeddingModel = mockEmbeddingModel;

  setModel(model: typeof mockEmbeddingModel) {
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
        console.log(`Generating mock embedding for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`); 
        const embedding = await this.model.forward(text);
        
        if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Generated embedding is invalid or empty');
        }

        console.log(`Generated mock embedding with ${embedding.length} dimensions`);
        resolve(embedding);
      } catch (error) {
        console.error('Failed to generate mock embedding:', error);
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
 */
export async function generateEmbedding(
  model: typeof mockEmbeddingModel,
  text: string
): Promise<number[]> {
  if (!model.isReady) {
    throw new Error('Embedding model is not ready');
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Text input is required and must be a string');
  }

  try {
    console.log(`Generating mock embedding for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`); 
    
    const embedding = await model.forward(text);
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Generated embedding is invalid or empty');
    }

    console.log(`Generated mock embedding with ${embedding.length} dimensions`);
    return embedding;
  } catch (error) {
    console.error('Error generating mock embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Utility function to generate embeddings for multiple texts
 */
export async function generateEmbeddings(
  model: typeof mockEmbeddingModel,
  texts: string[]
): Promise<number[][]> {
  if (!model.isReady) {
    throw new Error('Embedding model is not ready');
  }

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts array is required and must be non-empty');
  }

  try {
    console.log(`Generating mock embeddings for ${texts.length} texts`);
    
    const embeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text || typeof text !== 'string') {
        throw new Error(`Invalid text at index ${i}: must be a non-empty string`);
      }
      
      const embedding = await generateEmbedding(model, text);
      embeddings.push(embedding);
    }

    console.log(`Generated ${embeddings.length} mock embeddings successfully`);
    return embeddings;
  } catch (error) {
    console.error('Error generating mock embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`);
  }
}