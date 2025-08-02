
import { TextEmbeddingPipeline } from 'react-native-transformers';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2-onnx';

export interface EmbeddingService {
  initialize(): Promise<void>;
  embed(text: string): Promise<Float32Array>;
}

export class TransformersEmbeddingService implements EmbeddingService {
  private pipeline: TextEmbeddingPipeline | null = null;

  async initialize(): Promise<void> {
    try {
      this.pipeline = await TextEmbeddingPipeline.init(MODEL_ID);
    } catch (error) {
      console.error('Failed to initialize embedding model:', error);
      throw error;
    }
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.pipeline) {
      throw new Error('Embedding service not initialized');
    }
    try {
      return await this.pipeline.embed(text);
    } catch (error) {
      console.error('Failed to create embeddings:', error);
      throw error;
    }
  }
}
