/**
 * @file turso-db-service.ts
 * @description Vector database service using Turso/libSQL for semantic search capabilities
 * This service provides vector storage and similarity search functionality for AI applications
 * using OP-SQLite with libSQL extensions for vector operations.
 */

import { Platform } from "react-native";
import {
  getDatabaseDownloadService,
  DatabaseStatus,
} from "./database-download-service";

// Configuration constants - Use same as download service
const EMBEDDING_DIMENSION = 384; // Standard dimension for sentence transformers
const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

/**
 * Represents a document with vector embedding for semantic search
 */
export interface VectorDocument {
  /** Unique identifier for the document */
  id: string;
  /** Text content of the document */
  content: string;
  /** Vector embedding representation of the document content */
  vector?: number[];
  /** Title of the document */
  title?: string;
  /** URL of the document */
  url?: string;
  /** Specialty of the document */
  specialty?: string;
  /** Year of the document */
  year?: string;
}

/**
 * Result of a vector similarity search operation
 */
export interface VectorSearchResult {
  /** The matched document */
  document: VectorDocument;
  /** Similarity score between 0 and 1, where 1 is most similar */
  similarity: number;
}

/**
 * Options for vector similarity search
 */
export interface VectorSearchOptions {
  /** The search query text */
  query: string;
  /** Maximum number of results to return (default: 5) */
  limit?: number;
  /** Minimum similarity threshold between 0 and 1 (default: 0.7) */
  threshold?: number;
}

// Type definition for OP-SQLite database connection
interface SQLiteDatabase {
  execute: (sql: string, params?: any[]) => Promise<{ rows?: any[] }>;
  close: () => Promise<void>;
}

// Dynamic import for OP-SQLite
let open:
  | ((options: { name: string; location: string }) => SQLiteDatabase)
  | null = null;
let openSync: any = null;

// Load OP-SQLite conditionally for native platforms
if (Platform.OS !== "web") {
  try {
    const opSQLite = require("@op-engineering/op-sqlite");
    open = opSQLite.open;
    openSync = opSQLite.openSync;
  } catch (error) {
    console.error("OP-SQLite not available:", error);
  }
}

/**
 * Service for vector database operations using Turso/libSQL
 * Provides document storage with vector embeddings and similarity search capabilities
 */
export class TursoDBService {
  /** SQLite database connection */
  private db: SQLiteDatabase | null = null;
  /** Flag indicating if the service is initialized */
  private isInitialized = false;
  /** Database status from download service */
  private databaseStatus: DatabaseStatus | null = null;

  /**
   * Initializes the database service
   * Opens the medical database if it exists locally
   * @throws Error if initialization fails or database not found
   */
  async initialize(): Promise<void> {
    // Skip if already initialized
    if (this.isInitialized) {
      return;
    }

    // Check platform compatibility
    if (Platform.OS === "web") {
      console.warn("Turso DB service not available on web platform");
      return;
    }

    // Verify OP-SQLite is available
    if (!open) {
      throw new Error("OP-SQLite not available on this platform");
    }

    try {
      console.log("Initializing Turso DB service...");

      // Check if database is available
      const downloadService = getDatabaseDownloadService();
      this.databaseStatus = await downloadService.getDatabaseStatus();

      if (this.databaseStatus.exists && this.databaseStatus.isValid) {
        console.log("Opening medical database");
        // Use fileName from DatabaseStatus and extract directory from full path
        const directory = this.databaseStatus.localPath.substring(
          0,
          this.databaseStatus.localPath.lastIndexOf("/")
        );
        const directoryWithoutFilePrefix = directory.replace("file://", "");

        this.db = open({
          name: this.databaseStatus.fileName, // Use fileName from DatabaseStatus
          location: directoryWithoutFilePrefix, // Full directory path where file is stored
        });
      } else {
        throw new Error(
          "Medical database not found. Please download it first."
        );
      }

      this.isInitialized = true;
      console.log("Turso DB service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Turso DB service:", error);
      // Reset state on failure
      this.db = null;
      this.isInitialized = false;
      this.databaseStatus = null;
      throw error;
    }
  }

  // Note: createTables method removed - the downloaded database already has the proper schema

  // Note: insertExampleDocuments method removed - using real medical database data

  /**
   * Generates a mock embedding vector for demonstration purposes
   * Creates a vector with the specified dimension using base values with small random variations
   * @private
   * @param base - Base values to use for generating the embedding
   * @returns A vector of specified dimension with values derived from the base
   */
  private generateMockEmbedding(base: number[]): number[] {
    if (!base || base.length === 0) {
      throw new Error(
        "Base values are required for generating mock embeddings"
      );
    }

    // Generate an embedding with the configured dimension
    const embedding = new Array(EMBEDDING_DIMENSION);
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      const baseIndex = i % base.length;
      // Add small random variations to create unique but related vectors
      embedding[i] = base[baseIndex] + (Math.random() - 0.5) * 0.1;
    }
    return embedding;
  }

  /**
   * Serializes a vector for libSQL compatibility with OP-SQLite
   * Converts a numeric array to a JSON string for use with vector32() SQL function
   * @private
   * @param embedding - The numeric vector to serialize
   * @returns A JSON string representation of the vector
   * @throws Error if the embedding is invalid
   */
  private toVector(embedding?: number[]): string {
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(
        "Invalid embedding: must be a non-empty array of numbers"
      );
    }

    // Validate all values are numbers
    for (const value of embedding) {
      if (typeof value !== "number" || isNaN(value)) {
        throw new Error(
          "Invalid embedding: contains non-numeric or NaN values"
        );
      }
    }

    // Serialize the embedding as a JSON array string
    return JSON.stringify(embedding);
  }

  /**
   * Adds or updates a document in the vector database
   * If the document has an embedding, it will be stored for vector search
   * If no embedding is provided, the document will be stored without vector capabilities
   *
   * @param document - The document to add or update
   * @throws Error if the database is not initialized or if the document is invalid
   */
  async addDocument(document: VectorDocument): Promise<void> {
    // Validate database connection
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    // Validate document
    if (!document.id) {
      throw new Error("Document ID is required");
    }

    if (!document.content) {
      throw new Error("Document content is required");
    }

    try {
      // Convert metadata to JSON string if present
      if (document.vector) {
        // Use vector32() function to properly convert JSON array to F32_BLOB
        const vectorStr = this.toVector(document.vector);
        await this.db.execute(
          `INSERT OR REPLACE INTO documents (id, content, vector) VALUES (?, ?, vector32(?))`,
          [document.id, document.content, vectorStr]
        );
      } else {
        // Store document without embedding
        await this.db.execute(
          "INSERT OR REPLACE INTO documents (id, content, vector) VALUES (?, ?, NULL)",
          [document.id, document.content]
        );
      }

      console.log(`Document ${document.id} added successfully`);
    } catch (error) {
      console.error("Error adding document:", error);
      throw new Error(
        `Failed to add document ${document.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Searches for documents similar to the provided query
   * Uses vector similarity search to find semantically related documents
   *
   * @param options - Search options including query text, result limit, and similarity threshold
   * @returns Array of search results with documents and similarity scores
   * @throws Error if the database is not initialized or if the search fails
   */
  async searchSimilar(
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    // Validate database connection
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    // Validate search options
    if (!options.query) {
      throw new Error("Search query is required");
    }

    try {
      // Apply default values if not provided
      const limit = options.limit || DEFAULT_SEARCH_LIMIT;
      const threshold = options.threshold || DEFAULT_SIMILARITY_THRESHOLD;

      // In a production app, this would use a real embedding model
      // For demo purposes, we generate a mock embedding
      console.log(`Generating embedding for query: "${options.query}"`);
      const queryEmbedding = this.generateMockEmbedding([0.3, 0.5, 0.7, 0.2]);
      const queryVectorStr = this.toVector(queryEmbedding);

      // Use libSQL vector_top_k for approximate nearest neighbor search with vector32 function
      // This performs a cosine similarity search using the vector index
      const result = await this.db.execute(
        `
        SELECT
          d.id,
          d.content,
          d.title,
          d.url,
          d.specialty,
          d.year,
          vector_extract(d.vector) as vector,
          vector_distance_cos(d.vector, vector32(?)) as distance
        FROM vector_top_k('documents_vector_idx', vector32(?), ${limit}) vtk
        JOIN documents d ON d.rowid = vtk.id
      `,
        [queryVectorStr, queryVectorStr]
      );

      const searchResults: VectorSearchResult[] = [];

      if (result.rows) {
        for (const row of result.rows) {
          // Convert distance to similarity score (cosine distance → similarity)
          const similarity = 1 - (row.distance || 1);

          // Only include results above the threshold
          if (similarity >= threshold) {
            try {
              const document: VectorDocument = {
                id: row.id,
                content: row.content,
                vector: row.vector ? JSON.parse(row.vector) : undefined,
                title: row.title,
                url: row.url,
                specialty: row.specialty,
                year: row.year,
              };

              searchResults.push({
                document,
                similarity,
              });
            } catch (parseError) {
              console.warn(
                `Error parsing result row for document ${row.id}:`,
                parseError
              );
              // Skip this row but continue processing others
            }
          }
        }
      }

      console.log(
        `Found ${searchResults.length} similar documents for query: "${options.query}"`
      );
      return searchResults;
    } catch (error) {
      console.error("Error searching similar documents:", error);
      throw new Error(
        `Failed to search similar documents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Retrieves all documents from the database
   * Includes metadata and vector embeddings if available
   *
   * @returns Array of all documents in the database
   * @throws Error if the database is not initialized or if retrieval fails
   */
  async getAllDocuments(): Promise<VectorDocument[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    try {
      // Use vector_extract to get the embedding as a JSON string
      const result = await this.db.execute(
        "SELECT id, title, content, vector_extract(vector) as embedding_json, url, specialty, year FROM documents ORDER BY created_at DESC"
      );
      const documents: VectorDocument[] = [];

      if (result.rows) {
        for (const row of result.rows) {
          try {
            const document: VectorDocument = {
              id: row.id,
              content: row.content,
              title: row.title,
              url: row.url,
              specialty: row.specialty,
              year: row.year,
              vector: row.vector ? JSON.parse(row.vector) : undefined,
            };
            documents.push(document);
          } catch (parseError) {
            console.warn(`Error parsing document ${row.id}:`, parseError);
            // Skip this document but continue processing others
          }
        }
      }

      console.log(`Retrieved ${documents.length} documents from database`);
      return documents;
    } catch (error) {
      console.error("Error getting all documents:", error);
      throw new Error(
        `Failed to get all documents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Deletes a document from the database by ID
   *
   * @param id - The ID of the document to delete
   * @throws Error if the database is not initialized or if deletion fails
   */
  async deleteDocument(id: string): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    if (!id) {
      throw new Error("Document ID is required for deletion");
    }

    try {
      const result = await this.db.execute(
        "DELETE FROM documents WHERE id = ?",
        [id]
      );
      const rowsAffected = result.rows?.length || 0;

      if (rowsAffected > 0) {
        console.log(`Document ${id} deleted successfully`);
      } else {
        console.warn(`No document found with ID ${id} to delete`);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      throw new Error(
        `Failed to delete document ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Gets the total number of documents in the database
   *
   * @returns The count of documents
   * @throws Error if the database is not initialized
   */
  async getDocumentCount(): Promise<number> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const result = await this.db.execute(
        "SELECT COUNT(*) as count FROM documents"
      );
      const count = result.rows?.[0]?.count || 0;
      return count;
    } catch (error) {
      console.error("Error getting document count:", error);
      // Return 0 instead of throwing to make this method more resilient
      return 0;
    }
  }

  /**
   * Checks if the database service is ready for use
   *
   * @returns True if the service is initialized and connected to the database
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Gets the current database status information
   *
   * @returns Database status including whether database is available
   */
  getDatabaseInfo(): {
    isDatabaseAvailable: boolean;
    status: DatabaseStatus | null;
  } {
    return {
      isDatabaseAvailable:
        (this.databaseStatus?.exists && this.databaseStatus?.isValid) || false,
      status: this.databaseStatus,
    };
  }

  /**
   * Re-initializes the database service (useful after database download/update)
   * Closes current connection and re-initializes with latest database status
   */
  async reinitialize(): Promise<void> {
    console.log("Re-initializing Turso DB service...");

    // Close current connection
    if (this.db) {
      try {
        await this.db.close();
      } catch (error) {
        console.warn("Error closing existing database connection:", error);
      }
    }

    // Reset state
    this.db = null;
    this.isInitialized = false;
    this.databaseStatus = null;

    // Re-initialize
    await this.initialize();
  }

  /**
   * Cleans up database resources
   * Closes the database connection and resets the service state
   */
  async cleanup(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
        this.isInitialized = false;
        console.log("Turso DB service cleaned up successfully");
      } catch (error) {
        console.error("Error cleaning up Turso DB service:", error);
        // Reset state even if close fails
        this.db = null;
        this.isInitialized = false;
        throw new Error(
          `Failed to clean up database: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      console.log("No active database connection to clean up");
    }
  }
}

/**
 * Singleton instance of the TursoDBService
 * Ensures only one database connection is maintained throughout the application
 */
let tursoDBInstance: TursoDBService | null = null;

/**
 * Gets the singleton instance of the TursoDBService
 * Creates a new instance if one doesn't exist
 *
 * @returns The TursoDBService singleton instance
 */
export function getTursoDBService(): TursoDBService {
  if (!tursoDBInstance) {
    tursoDBInstance = new TursoDBService();
    console.log("Created new TursoDBService instance");
  }
  return tursoDBInstance;
}

/**
 * Resets the TursoDBService singleton instance
 * Useful for testing or when needing to force a fresh instance
 */
export async function resetTursoDBService(): Promise<void> {
  if (tursoDBInstance) {
    await tursoDBInstance.cleanup();
    tursoDBInstance = null;
    console.log("Reset TursoDBService singleton instance");
  }
}
