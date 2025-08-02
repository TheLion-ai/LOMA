/**
 * Production-ready vector search service
 * Integrates AI embeddings with database storage for semantic search capabilities
 */

import { Platform } from "react-native";
import { EnhancedAIService, createAIService } from "./ai-service";
import {
  getTursoDBService,
  TursoDBService,
  DocumentSearchResult,
  QASearchResult,
} from "./turso-db-service";

/**
 * Search options for vector search
 */
export interface VectorSearchOptions {
  /** The search query text */
  query: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Search type: 'documents', 'qa', or 'both' */
  searchType?: "documents" | "qa" | "both";
}

/**
 * Combined search result
 */
export interface CombinedSearchResult {
  type: "document" | "qa";
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata?: any;
}

/**
 * Vector search service for semantic search capabilities
 * Combines AI embeddings with database storage
 */
export class VectorSearchService {
  private aiService: EnhancedAIService | null = null;
  private dbService: TursoDBService;
  private isInitialized = false;
  private isInitializing = false;

  constructor() {
    this.dbService = getTursoDBService();
  }

  /**
   * Initializes the vector search service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    // Skip initialization on web platform if database is not available
    if (Platform.OS === "web") {
      console.warn(
        "⚠️ Vector search service has limited functionality on web platform"
      );
      this.isInitialized = true;
      return;
    }

    this.isInitializing = true;

    try {
      console.log("🔄 Initializing vector search service...");

      // Initialize AI service with embedding capabilities
      console.log("🤖 Initializing AI service...");
      this.aiService = await createAIService();
      await this.aiService.initialize();

      // Initialize database service
      console.log("📊 Initializing database service...");
      await this.dbService.initialize();

      this.isInitialized = true;
      console.log("✅ Vector search service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize vector search service:", error);
      this.isInitialized = false;
      throw new Error(`Vector search initialization failed: ${error.message}`);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Checks if the service is ready for use
   */
  isReady(): boolean {
    if (Platform.OS === "web") {
      return this.isInitialized;
    }

    return (
      this.isInitialized &&
      this.aiService !== null &&
      this.aiService.isReady() &&
      this.dbService.isReady()
    );
  }

  /**
   * Performs semantic search across documents and Q&A pairs
   */
  async search(options: VectorSearchOptions): Promise<CombinedSearchResult[]> {
    if (!this.isReady()) {
      throw new Error(
        "Vector search service not ready. Call initialize() first."
      );
    }

    if (!options.query || options.query.trim().length === 0) {
      throw new Error("Search query is required");
    }

    // On web platform, return empty results
    if (Platform.OS === "web") {
      console.warn("⚠️ Vector search not available on web platform");
      return [];
    }

    try {
      console.log(`🔍 Performing vector search for: "${options.query}"`);

      const searchType = options.searchType || "both";
      const limit = options.limit || 5;
      const threshold = options.threshold || 0.7;

      const results: CombinedSearchResult[] = [];

      // Search documents if requested
      if (searchType === "documents" || searchType === "both") {
        try {
          const documentResults = await this.dbService.searchMedicalDocuments({
            query: options.query,
            limit: searchType === "both" ? Math.ceil(limit / 2) : limit,
            threshold,
          });

          for (const result of documentResults) {
            results.push({
              type: "document",
              id: result.document.id,
              title: result.document.title,
              content: result.document.content,
              similarity: result.similarity,
              metadata: {
                year: result.document.year,
                specialty: result.document.specialty,
                created_at: result.document.created_at,
              },
            });
          }
        } catch (error) {
          console.warn("Warning: Document search failed:", error);
        }
      }

      // Search Q&A pairs if requested
      if (searchType === "qa" || searchType === "both") {
        try {
          const qaResults = await this.dbService.searchMedicalQA({
            query: options.query,
            limit: searchType === "both" ? Math.ceil(limit / 2) : limit,
            threshold,
          });

          for (const result of qaResults) {
            results.push({
              type: "qa",
              id: result.qa.id,
              title: result.qa.question,
              content: result.qa.answer,
              similarity: result.similarity,
              metadata: {
                document_id: result.qa.document_id,
              },
            });
          }
        } catch (error) {
          console.warn("Warning: Q&A search failed:", error);
        }
      }

      // Sort combined results by similarity
      results.sort((a, b) => b.similarity - a.similarity);

      // Limit final results
      const finalResults = results.slice(0, limit);

      console.log(`✅ Found ${finalResults.length} relevant results`);
      return finalResults;
    } catch (error) {
      console.error("❌ Error in vector search:", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  /**
   * Adds a new document with automatic embedding generation
   */
  async addDocument(document: {
    id: string;
    title: string;
    content: string;
    year?: number;
    specialty?: string;
  }): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Vector search service not ready");
    }

    if (Platform.OS === "web") {
      throw new Error("Adding documents not supported on web platform");
    }

    if (!this.aiService || !this.aiService.generateEmbedding) {
      throw new Error("AI service not available for embedding generation");
    }

    try {
      console.log(`📝 Adding document: ${document.title}`);

      // Generate embedding for the document content
      const embedding = await this.aiService.generateEmbedding(
        document.content
      );

      // Add to database
      await this.dbService.addMedicalDocument({
        id: document.id,
        title: document.title,
        content: document.content,
        vector: Array.from(embedding),
        created_at: new Date().toISOString(),
        year: document.year,
        specialty: document.specialty,
      });

      console.log(`✅ Document added successfully: ${document.id}`);
    } catch (error) {
      console.error("❌ Error adding document:", error);
      throw new Error(`Failed to add document: ${error.message}`);
    }
  }

  /**
   * Adds a new Q&A pair with automatic embedding generation
   */
  async addQA(qa: {
    id: string;
    question: string;
    answer: string;
    document_id: string;
  }): Promise<void> {
    if (!this.isReady()) {
      throw new Error("Vector search service not ready");
    }

    if (Platform.OS === "web") {
      throw new Error("Adding Q&A pairs not supported on web platform");
    }

    if (!this.aiService || !this.aiService.generateEmbedding) {
      throw new Error("AI service not available for embedding generation");
    }

    try {
      console.log(`❓ Adding Q&A pair: ${qa.question}`);

      // Generate embedding for the question
      const embedding = await this.aiService.generateEmbedding(qa.question);

      // Add to database
      await this.dbService.addMedicalQA({
        id: qa.id,
        question: qa.question,
        answer: qa.answer,
        vector: Array.from(embedding),
        document_id: qa.document_id,
      });

      console.log(`✅ Q&A pair added successfully: ${qa.id}`);
    } catch (error) {
      console.error("❌ Error adding Q&A pair:", error);
      throw new Error(`Failed to add Q&A pair: ${error.message}`);
    }
  }

  /**
   * Gets database statistics
   */
  async getStats(): Promise<{
    documentCount: number;
    qaCount: number;
    isReady: boolean;
  }> {
    if (Platform.OS === "web") {
      return {
        documentCount: 0,
        qaCount: 0,
        isReady: false,
      };
    }

    try {
      const [documentCount, qaCount] = await Promise.all([
        this.dbService.getMedicalDocumentCount(),
        this.dbService.getMedicalQACount(),
      ]);

      return {
        documentCount,
        qaCount,
        isReady: this.isReady(),
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      return {
        documentCount: 0,
        qaCount: 0,
        isReady: false,
      };
    }
  }

  /**
   * Cleans up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.aiService) {
        await this.aiService.cleanup();
        this.aiService = null;
      }

      if (this.dbService) {
        await this.dbService.cleanup();
      }

      this.isInitialized = false;
      console.log("🧹 Vector search service cleaned up successfully");
    } catch (error) {
      console.error("Error cleaning up vector search service:", error);
      // Reset state even if cleanup fails
      this.aiService = null;
      this.isInitialized = false;
    }
  }
}

/**
 * Singleton instance of the vector search service
 */
let vectorSearchInstance: VectorSearchService | null = null;

/**
 * Gets the singleton instance of the vector search service
 */
export function getVectorSearchService(): VectorSearchService {
  if (!vectorSearchInstance) {
    vectorSearchInstance = new VectorSearchService();
    console.log("Created new VectorSearchService instance");
  }
  return vectorSearchInstance;
}

/**
 * Resets the vector search service singleton
 */
export async function resetVectorSearchService(): Promise<void> {
  if (vectorSearchInstance) {
    await vectorSearchInstance.cleanup();
    vectorSearchInstance = null;
    console.log("Reset VectorSearchService singleton instance");
  }
}
