/**
 * Medical Vector Database Service using Turso/libSQL
 *
 * Provides comprehensive vector database functionality for medical AI applications,
 * including storage and similarity search for medical documents and Q&A pairs.
 */

import { Platform } from "react-native";
import {
  getDatabaseDownloadService,
  DatabaseStatus,
} from "./database-download-service";
import { useTextEmbeddings } from "react-native-executorch";
import { queuedEmbeddingService } from "./embedding-service";

// Configuration constants - Use same as download service
const EMBEDDING_DIMENSION = 384; // Standard dimension for sentence transformers
const DEFAULT_SEARCH_LIMIT = 5;
// For normalized embeddings, cosine distance ranges 0-2, so similarity ranges 1 to -1
// A threshold of 0.7 means we want documents with >70% similarity
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

/**
 * Represents a medical research document with vector embedding for semantic search
 */
export interface MedicalDocument {
  /** Unique identifier for the document */
  id: string;
  /** Title of the document */
  title: string;
  /** Full content of the document */
  content: string;
  /** Vector embedding representation of the document content */
  vector: number[];
  /** Timestamp when record was created */
  created_at: string;
  /** URL of the document (optional) */
  url?: string;
  /** Publication year (optional) */
  year?: number;
  /** Medical specialty (optional) */
  specialty?: string;
}

/**
 * Represents a medical Q&A pair with vector embedding for semantic search
 */
export interface MedicalQA {
  /** Unique identifier for the Q&A pair */
  id: string;
  /** Medical question */
  question: string;
  /** Corresponding answer */
  answer: string;
  /** Vector embedding representation of the question */
  vector: number[];
  /** Reference to source document */
  document_id: string;
}

/**
 * Result of a vector similarity search operation for documents
 */
export interface DocumentSearchResult {
  /** The matched document */
  document: MedicalDocument;
  /** Similarity score between -1 and 1, where 1 is identical, 0 is orthogonal, -1 is opposite */
  similarity: number;
}

/**
 * Result of a vector similarity search operation for Q&A
 */
export interface QASearchResult {
  /** The matched Q&A pair */
  qa: MedicalQA;
  /** Similarity score between -1 and 1, where 1 is identical, 0 is orthogonal, -1 is opposite */
  similarity: number;
}

/**
 * Options for medical document search
 */
export interface MedicalSearchOptions {
  /** The search query text */
  query: string;
  /** Maximum number of results to return (default: 5) */
  limit?: number;
  /** Minimum similarity threshold between -1 and 1 (default: 0.7) */
  threshold?: number;
  /** Filter by medical specialty */
  specialty?: string;
  /** Filter by publication year */
  year?: number;
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
  /** Embedding model for generating text embeddings */
  private embeddingModel: ReturnType<typeof useTextEmbeddings> | null = null;

  /**
   * Sets the embedding model to use for generating text embeddings
   * @param model - The embedding model from useTextEmbeddings hook
   */
  setEmbeddingModel(model: ReturnType<typeof useTextEmbeddings>): void {
    this.embeddingModel = model;
    queuedEmbeddingService.setModel(model);
    console.log("Embedding model set for TursoDBService");
  }

  /**
   * Debug method to check what documents are in the database
   * @returns Promise that resolves to document information
   */
  async debugDocuments(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const result = await this.db.execute(
        "SELECT id, title, specialty FROM documents"
      );
      console.log("Documents in database:");
      if (result.rows) {
        for (const row of result.rows) {
          console.log(`- ${row.id}: ${row.title} (${row.specialty})`);
        }
      }
    } catch (error) {
      console.error("Error debugging documents:", error);
    }
  }

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
   * Generates a real embedding vector using the queued embedding service
   * @private
   * @param text - The text to generate an embedding for
   * @returns A vector of specified dimension
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!text || typeof text !== "string") {
      throw new Error("Text input is required for generating embeddings");
    }

    if (!this.embeddingModel) {
      throw new Error("Embedding model is not available");
    }

    if (!this.embeddingModel.isReady) {
      throw new Error("Embedding model is not ready");
    }

    try {
      return await queuedEmbeddingService.generateEmbedding(text);
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw new Error(
        `Failed to generate embedding: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
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
   * Deletes a medical document from the database by ID
   * This will also cascade delete any related Q&A pairs
   *
   * @param id - The ID of the medical document to delete
   * @throws Error if the database is not initialized or if deletion fails
   */
  async deleteMedicalDocument(id: string): Promise<void> {
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
        console.log(`Medical document ${id} deleted successfully`);
      } else {
        console.warn(`No medical document found with ID ${id} to delete`);
      }
    } catch (error) {
      console.error("Error deleting medical document:", error);
      throw new Error(
        `Failed to delete medical document ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Gets the total number of medical documents in the database
   *
   * @returns Promise that resolves to the number of medical documents
   * @throws Error if the database is not initialized or if the count fails
   */
  async getMedicalDocumentCount(): Promise<number> {
    // Validate database connection
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const result = await this.db.execute(
        "SELECT COUNT(*) as count FROM documents"
      );
      const count = result.rows?.[0]?.count || 0;

      console.log(`Total medical documents in database: ${count}`);
      return count;
    } catch (error) {
      console.error("Error getting medical document count:", error);
      throw new Error(
        `Failed to get medical document count: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Gets the total number of medical Q&A pairs in the database
   *
   * @returns Promise that resolves to the number of Q&A pairs
   * @throws Error if the database is not initialized or if the count fails
   */
  async getMedicalQACount(): Promise<number> {
    // Validate database connection
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    try {
      // Count all Q&A pairs in the database
      const result = await this.db.execute(
        "SELECT COUNT(*) as count FROM medical_qa"
      );

      // Extract count from the result
      const count = result.rows?.[0]?.count || 0;

      console.log(`Total medical Q&A pairs in database: ${count}`);
      return count;
    } catch (error) {
      console.error("Error getting medical Q&A count:", error);
      throw new Error(
        `Failed to get medical Q&A count: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // ===== MEDICAL DOCUMENT METHODS =====

  /**
   * Adds or updates a medical document in the database
   *
   * @param document - The medical document to add or update
   * @throws Error if the database is not initialized or if the document is invalid
   */
  async addMedicalDocument(document: MedicalDocument): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    if (
      !document.id ||
      !document.title ||
      !document.content ||
      !document.vector
    ) {
      throw new Error("Document ID, title, content, and vector are required");
    }

    try {
      const vectorStr = this.toVector(document.vector);
      await this.db.execute(
        `INSERT OR REPLACE INTO documents (id, title, content, vector, created_at, year, specialty) VALUES (?, ?, ?, vector32(?), ?, ?, ?)`,
        [
          document.id,
          document.title,
          document.content,
          vectorStr,
          document.created_at,
          document.year,
          document.specialty,
        ]
      );
      console.log(`Medical document ${document.id} added successfully`);
    } catch (error) {
      console.error("Error adding medical document:", error);
      throw new Error(
        `Failed to add medical document ${document.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Searches for medical documents similar to the provided query
   * Uses vector similarity search to find semantically related documents
   *
   * @param options - Search options including query text, result limit, similarity threshold, and filters
   * @returns Array of search results with medical documents and similarity scores
   * @throws Error if the database is not initialized or if the search fails
   */
  async searchMedicalDocuments(
    options: MedicalSearchOptions
  ): Promise<DocumentSearchResult[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    if (!options.query) {
      throw new Error("Search query is required");
    }

    try {
      const limit = options.limit || DEFAULT_SEARCH_LIMIT;
      const threshold = options.threshold || DEFAULT_SIMILARITY_THRESHOLD;

      console.log(
        `Generating embedding for medical document query: "${options.query}"`
      );
      const queryEmbedding = await this.generateEmbedding(options.query);
      const queryVectorStr = this.toVector(queryEmbedding);

      // Debug: Check if the query embedding is normalized
      const queryMagnitude = Math.sqrt(
        queryEmbedding.reduce((sum, val) => sum + val * val, 0)
      );
      console.log(`Query embedding magnitude: ${queryMagnitude}`);

      // Build WHERE clause for additional filters
      let whereClause = "";
      const params = [queryVectorStr, queryVectorStr];

      if (options.specialty) {
        whereClause += " AND d.specialty = ?";
        params.push(options.specialty);
      }

      if (options.year) {
        whereClause += " AND d.year = ?";
        params.push(options.year.toString());
      }

      // First, let's check if we have any documents at all
      const countResult = await this.db.execute(
        "SELECT COUNT(*) as count FROM documents"
      );
      const docCount = countResult.rows?.[0]?.count || 0;
      console.log(`Total documents in database: ${docCount}`);

      // Use the proper vector_top_k function for similarity search
      const result = await this.db.execute(
        `
        SELECT
          d.id,
          d.title,
          d.content,
          d.created_at,
          d.year,
          d.specialty,
          vector_extract(d.vector) as vector_json,
          vector_distance_cos(d.vector, vector32(?)) as distance
        FROM vector_top_k('documents_vector_idx', vector32(?), ${limit}) vtk
        JOIN documents d ON d.rowid = vtk.id
        WHERE 1=1${whereClause}
        ORDER BY distance ASC
      `,
        params
      );

      const searchResults: DocumentSearchResult[] = [];

      if (result.rows) {
        console.log(`Found ${result.rows.length} raw results from database`);
        for (const row of result.rows) {
          const distance = row.distance || 2;
          // For normalized embeddings with cosine distance:
          // Distance 0 = identical vectors (similarity = 1.0)
          // Distance 2 = opposite vectors (similarity = -1.0)
          // Similarity = 1 - distance (can be negative for very dissimilar vectors)
          const similarity = 1 - distance;
          console.log(
            `Document: ${
              row.title
            }, Distance: ${distance}, Similarity: ${similarity.toFixed(
              4
            )}, Threshold: ${threshold}`
          );

          if (similarity >= threshold) {
            try {
              const document: MedicalDocument = {
                id: row.id,
                title: row.title,
                content: row.content,
                vector: row.vector_json ? JSON.parse(row.vector_json) : [],
                created_at: row.created_at,
                year: row.year,
                specialty: row.specialty,
              };

              searchResults.push({
                document,
                similarity,
              });
            } catch (parseError) {
              console.warn(
                `Error parsing medical document result for ${row.id}:`,
                parseError
              );
            }
          }
        }
      }

      console.log(
        `Found ${searchResults.length} similar medical documents for query: "${options.query}"`
      );
      return searchResults;
    } catch (error) {
      console.error("Error searching medical documents:", error);
      throw new Error(
        `Failed to search medical documents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Retrieves all medical documents from the database
   *
   * @returns Array of all medical documents in the database
   * @throws Error if the database is not initialized or if retrieval fails
   */
  async getAllMedicalDocuments(): Promise<MedicalDocument[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const result = await this.db.execute(
        "SELECT id, title, content, vector_extract(vector) as vector_json, created_at, year, specialty FROM documents ORDER BY created_at DESC"
      );
      const documents: MedicalDocument[] = [];

      if (result.rows) {
        for (const row of result.rows) {
          try {
            const document: MedicalDocument = {
              id: row.id,
              title: row.title,
              content: row.content,
              vector: row.vector_json ? JSON.parse(row.vector_json) : [],
              created_at: row.created_at,
              year: row.year,
              specialty: row.specialty,
            };
            documents.push(document);
          } catch (parseError) {
            console.warn(
              `Error parsing medical document ${row.id}:`,
              parseError
            );
          }
        }
      }

      console.log(
        `Retrieved ${documents.length} medical documents from database`
      );
      return documents;
    } catch (error) {
      console.error("Error getting all medical documents:", error);
      throw new Error(
        `Failed to get all medical documents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // ===== MEDICAL Q&A METHODS =====

  /**
   * Adds or updates a medical Q&A pair in the database
   *
   * @param qa - The medical Q&A pair to add or update
   * @throws Error if the database is not initialized or if the Q&A is invalid
   */
  async addMedicalQA(qa: MedicalQA): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    if (!qa.id || !qa.question || !qa.answer || !qa.vector || !qa.document_id) {
      throw new Error(
        "Q&A ID, question, answer, vector, and document_id are required"
      );
    }

    try {
      const vectorStr = this.toVector(qa.vector);
      await this.db.execute(
        `INSERT OR REPLACE INTO medical_qa (id, question, answer, vector, document_id) VALUES (?, ?, ?, vector32(?), ?)`,
        [qa.id, qa.question, qa.answer, vectorStr, qa.document_id]
      );
      console.log(`Medical Q&A ${qa.id} added successfully`);
    } catch (error) {
      console.error("Error adding medical Q&A:", error);
      throw new Error(
        `Failed to add medical Q&A ${qa.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Searches for medical Q&A pairs similar to the provided query
   *
   * @param options - Search options including query text, result limit, and similarity threshold
   * @returns Array of search results with medical Q&A pairs and similarity scores
   * @throws Error if the database is not initialized or if the search fails
   */
  async searchMedicalQA(
    options: MedicalSearchOptions
  ): Promise<QASearchResult[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    if (!options.query) {
      throw new Error("Search query is required");
    }

    try {
      const limit = options.limit || DEFAULT_SEARCH_LIMIT;
      const threshold = options.threshold || DEFAULT_SIMILARITY_THRESHOLD;

      console.log(
        `Generating embedding for medical Q&A query: "${options.query}"`
      );
      const queryEmbedding = await this.generateEmbedding(options.query);
      const queryVectorStr = this.toVector(queryEmbedding);

      const result = await this.db.execute(
        `
        SELECT
          qa.id,
          qa.question,
          qa.answer,
          qa.document_id,
          vector_extract(qa.vector) as vector_json,
          vector_distance_cos(qa.vector, vector32(?)) as distance
        FROM vector_top_k('medical_qa_vector_idx', vector32(?), ${limit}) vtk
        JOIN medical_qa qa ON qa.rowid = vtk.id
      `,
        [queryVectorStr, queryVectorStr]
      );

      const searchResults: QASearchResult[] = [];

      if (result.rows) {
        console.log(
          `Found ${result.rows.length} raw Q&A results from database`
        );
        for (const row of result.rows) {
          const distance = row.distance || 2;
          // For normalized embeddings: similarity = 1 - distance
          const similarity = 1 - distance;
          console.log(
            `Q&A: ${row.question.substring(
              0,
              50
            )}..., Distance: ${distance}, Similarity: ${similarity.toFixed(
              4
            )}, Threshold: ${threshold}`
          );

          if (similarity >= threshold) {
            try {
              const qa: MedicalQA = {
                id: row.id,
                question: row.question,
                answer: row.answer,
                vector: row.vector_json ? JSON.parse(row.vector_json) : [],
                document_id: row.document_id,
              };

              searchResults.push({
                qa,
                similarity,
              });
            } catch (parseError) {
              console.warn(
                `Error parsing medical Q&A result for ${row.id}:`,
                parseError
              );
            }
          }
        }
      }

      console.log(
        `Found ${searchResults.length} similar medical Q&A pairs for query: "${options.query}"`
      );
      return searchResults;
    } catch (error) {
      console.error("Error searching medical Q&A:", error);
      throw new Error(
        `Failed to search medical Q&A: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Retrieves all medical Q&A pairs from the database
   *
   * @returns Array of all medical Q&A pairs in the database
   * @throws Error if the database is not initialized or if retrieval fails
   */
  async getAllMedicalQA(): Promise<MedicalQA[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const result = await this.db.execute(
        "SELECT id, question, answer, vector_extract(vector) as vector_json, document_id FROM medical_qa ORDER BY id"
      );
      const qaList: MedicalQA[] = [];

      if (result.rows) {
        for (const row of result.rows) {
          try {
            const qa: MedicalQA = {
              id: row.id,
              question: row.question,
              answer: row.answer,
              vector: row.vector_json ? JSON.parse(row.vector_json) : [],
              document_id: row.document_id,
            };
            qaList.push(qa);
          } catch (parseError) {
            console.warn(`Error parsing medical Q&A ${row.id}:`, parseError);
          }
        }
      }

      console.log(`Retrieved ${qaList.length} medical Q&A pairs from database`);
      return qaList;
    } catch (error) {
      console.error("Error getting all medical Q&A:", error);
      throw new Error(
        `Failed to get all medical Q&A: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Deletes a medical Q&A pair from the database by ID
   *
   * @param id - The ID of the Q&A pair to delete
   * @throws Error if the database is not initialized or if deletion fails
   */
  async deleteMedicalQA(id: string): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    if (!id) {
      throw new Error("Q&A ID is required for deletion");
    }

    try {
      const result = await this.db.execute(
        "DELETE FROM medical_qa WHERE id = ?",
        [id]
      );
      const rowsAffected = result.rows?.length || 0;

      if (rowsAffected > 0) {
        console.log(`Medical Q&A ${id} deleted successfully`);
      } else {
        console.warn(`No medical Q&A found with ID ${id} to delete`);
      }
    } catch (error) {
      console.error("Error deleting medical Q&A:", error);
      throw new Error(
        `Failed to delete medical Q&A ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Gets Q&A pairs for a specific document
   *
   * @param documentId - The ID of the document
   * @returns Array of Q&A pairs for the specified document
   * @throws Error if the database is not initialized
   */
  async getQAByDocument(documentId: string): Promise<MedicalQA[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error("Database not initialized");
    }

    if (!documentId) {
      throw new Error("Document ID is required");
    }

    try {
      const result = await this.db.execute(
        "SELECT id, question, answer, vector_extract(vector) as vector_json, document_id FROM medical_qa WHERE document_id = ? ORDER BY id",
        [documentId]
      );
      const qaList: MedicalQA[] = [];

      if (result.rows) {
        for (const row of result.rows) {
          try {
            const qa: MedicalQA = {
              id: row.id,
              question: row.question,
              answer: row.answer,
              vector: row.vector_json ? JSON.parse(row.vector_json) : [],
              document_id: row.document_id,
            };
            qaList.push(qa);
          } catch (parseError) {
            console.warn(`Error parsing medical Q&A ${row.id}:`, parseError);
          }
        }
      }

      console.log(
        `Retrieved ${qaList.length} Q&A pairs for document ${documentId}`
      );
      return qaList;
    } catch (error) {
      console.error("Error getting Q&A by document:", error);
      throw new Error(
        `Failed to get Q&A for document ${documentId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
