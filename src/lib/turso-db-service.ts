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
      console.log(`Query embedding dimensions: ${queryEmbedding.length}`);
      console.log(`Query embedding sample values: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

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
      
      // Debug: Check if vector index exists and is working
      if (docCount > 0) {
        console.log(`\n=== DATABASE STATE DEBUG ===`);
        
        // Check a few sample documents
        const sampleDocs = await this.db.execute(
          "SELECT id, title, vector_extract(vector) as vector_json FROM documents LIMIT 3"
        );
        
        if (sampleDocs.rows) {
          console.log(`Sample documents in database:`);
          for (const doc of sampleDocs.rows) {
            const vectorData = doc.vector_json ? JSON.parse(doc.vector_json) : null;
            console.log(`- ID: ${doc.id}, Title: "${doc.title}", Vector dims: ${vectorData ? vectorData.length : 'null'}`);
          }
        }
        
        // Test if vector index is accessible
        try {
          const indexTest = await this.db.execute(
            `SELECT COUNT(*) as count FROM vector_top_k('documents_vector_idx', vector32(?), 1)`,
            [queryVectorStr]
          );
          console.log(`Vector index test result: ${indexTest.rows?.[0]?.count || 0} results`);
        } catch (indexError) {
          console.error(`Vector index error:`, indexError);
        }
        
        // Test alternative vector search approaches
        console.log(`\n--- Testing Alternative Vector Search Methods ---`);
        
        // Test 1: Direct vector distance calculation without index
        try {
          const directTest = await this.db.execute(
            `SELECT COUNT(*) as count FROM documents WHERE vector_distance_cos(vector, vector32(?)) < 2.0 LIMIT 5`,
            [queryVectorStr]
          );
          console.log(`Direct vector distance test: ${directTest.rows?.[0]?.count || 0} results`);
        } catch (directError) {
          console.error(`Direct vector distance error:`, directError);
        }
        
        // Test 2: Check if vector index exists
        try {
          const indexExists = await this.db.execute(
            `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%vector%'`
          );
          console.log(`Vector-related tables:`, indexExists.rows?.map(r => r.name) || []);
        } catch (tableError) {
          console.error(`Table check error:`, tableError);
        }
        
        // Test 3: Try vector_top_k with different parameters
        try {
          const altIndexTest = await this.db.execute(
            `SELECT id, vector_distance_cos(vector, vector32(?)) as distance FROM documents ORDER BY distance LIMIT 3`,
            [queryVectorStr]
          );
          console.log(`Alternative search test: ${altIndexTest.rows?.length || 0} results`);
          if (altIndexTest.rows && altIndexTest.rows.length > 0) {
            const distances = altIndexTest.rows.map(r => r.distance);
            const similarities = distances.map(d => 1 - d);
            console.log(`Sample distances: ${distances.map(d => d?.toFixed(4)).join(', ')}`);
            console.log(`Sample similarities: ${similarities.map(s => s?.toFixed(4)).join(', ')}`);
            console.log(`💡 Suggested threshold: ${Math.max(0.05, Math.min(...similarities) - 0.05).toFixed(2)} (current: ${threshold})`);
          
          // Test if query embedding is in same space as document embeddings
          console.log(`\n🧪 Testing embedding space compatibility:`);
          const sampleDoc = await this.db.execute(`SELECT id, title, vector FROM documents LIMIT 1`);
          if (sampleDoc.rows && sampleDoc.rows.length > 0) {
            const docVector = sampleDoc.rows[0].vector;
            console.log(`  Raw vector type: ${typeof docVector}`);
            console.log(`  Raw vector: ${Array.isArray(docVector) ? 'Array' : 'Not Array'}`);
            
            if (docVector && Array.isArray(docVector)) {
              const docMagnitude = Math.sqrt(docVector.reduce((sum, val) => sum + val * val, 0));
              const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * docVector[i], 0);
              const cosineSim = dotProduct / (queryMagnitude * docMagnitude);
              const distance = 1 - cosineSim;
              
              console.log(`  Sample doc: "${sampleDoc.rows[0].title}"`);
              console.log(`  Doc vector magnitude: ${docMagnitude.toFixed(4)}`);
              console.log(`  Cosine similarity: ${cosineSim.toFixed(4)}`);
              console.log(`  Distance: ${distance.toFixed(4)}`);
              
              if (Math.abs(cosineSim) > 0.95) {
                console.warn(`⚠️  Suspiciously high similarity - embeddings might be identical`);
              } else if (Math.abs(cosineSim) < 0.05) {
                console.warn(`⚠️  Very low similarity - embeddings might be from different models/spaces`);
              }
            } else {
              console.warn(`⚠️  Document vector is not an array - this explains the search issues!`);
              console.log(`  Vector value: ${JSON.stringify(docVector)?.substring(0, 100)}...`);
            }
          }
        }
        } catch (altError) {
          console.error(`Alternative search error:`, altError);
        }
        
        // Test if database contains diabetes-related content
        console.log(`\n🔍 Checking for diabetes-related content in database:`);
        const diabetesCheck = await this.db.execute(`
          SELECT id, title FROM documents 
          WHERE LOWER(title) LIKE '%diabetes%' 
             OR LOWER(title) LIKE '%diabetic%'
             OR LOWER(title) LIKE '%insulin%'
             OR LOWER(title) LIKE '%glucose%'
             OR LOWER(title) LIKE '%blood sugar%'
          LIMIT 5
        `);
        
        if (diabetesCheck.rows && diabetesCheck.rows.length > 0) {
          console.log(`Found ${diabetesCheck.rows.length} diabetes-related documents:`);
          diabetesCheck.rows.forEach((row, i) => {
            console.log(`  ${i+1}. "${row.title}" (ID: ${row.id})`);
          });
          
          // Test similarity with the first diabetes document
          console.log(`\n🎯 Testing direct similarity with diabetes document:`);
          const diabetesDoc = await this.db.execute(`
            SELECT id, title, vector FROM documents WHERE id = ?
          `, [diabetesCheck.rows[0].id]);
          
          if (diabetesDoc.rows && diabetesDoc.rows.length > 0) {
            const diabetesVector = diabetesDoc.rows[0].vector;
            console.log(`  Diabetes doc vector type: ${typeof diabetesVector}`);
            console.log(`  Diabetes doc vector is array: ${Array.isArray(diabetesVector)}`);
            
            if (Array.isArray(diabetesVector)) {
              // Calculate similarity manually using the same method as the search
              const distance = await this.db.execute(`
                SELECT vector_distance_cos(?, ?) as distance
              `, [queryEmbedding, diabetesVector]);
              
              if (distance.rows && distance.rows.length > 0) {
                const dist = distance.rows[0].distance as number;
                const similarity = 1 - dist;
                console.log(`  Direct distance calculation: ${dist.toFixed(4)}`);
                console.log(`  Direct similarity calculation: ${similarity.toFixed(4)}`);
                console.log(`  Should this pass threshold (${threshold})? ${similarity > threshold ? 'YES' : 'NO'}`);
              }
            }
          }
        } else {
          console.log(`❌ No diabetes-related documents found in titles`);
          console.log(`   This might explain why similarity search returns unrelated results`);
        }
        
        console.log(`=== END DATABASE STATE DEBUG ===`);
      } else {
        console.log(`⚠️  No documents found in database - this explains the 0 results!`);
      }

      // Use the proper vector_top_k function for similarity search
      let result;
      try {
        result = await this.db.execute(
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
        
        // Check if vector_top_k actually returned results
         if (!result.rows || result.rows.length === 0) {
           throw new Error("vector_top_k returned 0 results - likely index issue");
         }
         console.log(`✅ vector_top_k search successful, found ${result.rows?.length || 0} results`);
       } catch (vectorIndexError) {
         console.warn(`⚠️  vector_top_k failed or returned 0 results, falling back to direct vector search:`, vectorIndexError);
        
        // Fallback: Use direct vector distance calculation
        result = await this.db.execute(
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
          FROM documents d
          WHERE 1=1${whereClause.replace(/^AND/, '')}
          ORDER BY vector_distance_cos(d.vector, vector32(?)) ASC
          LIMIT ${limit}
        `,
          [queryVectorStr, queryVectorStr, ...params.slice(2)]
        );
        
        console.log(`📋 Fallback search found ${result.rows?.length || 0} results`);
      }

      const searchResults: DocumentSearchResult[] = [];

      if (result.rows) {
        console.log(`\n=== DOCUMENT SIMILARITY SEARCH DEBUG ===`);
        console.log(`Query: "${options.query}"`);
        console.log(`Found ${result.rows.length} raw results from database`);
        console.log(`Similarity threshold: ${threshold}`);
        console.log(`Query embedding magnitude: ${queryMagnitude.toFixed(4)}`);
        console.log(`\n--- All Results (sorted by distance) ---`);
        
        // Sort results by distance for better debugging
        const sortedRows = [...result.rows].sort((a, b) => (a.distance || 2) - (b.distance || 2));
        
        for (let i = 0; i < sortedRows.length; i++) {
          const row = sortedRows[i];
          const distance = row.distance || 2;
          // For normalized embeddings with cosine distance:
          // Distance 0 = identical vectors (similarity = 1.0)
          // Distance 2 = opposite vectors (similarity = -1.0)
          // Similarity = 1 - distance (can be negative for very dissimilar vectors)
          const similarity = 1 - distance;
          const passesThreshold = similarity >= threshold;
          
          console.log(
            `${i + 1}. [${passesThreshold ? 'PASS' : 'FAIL'}] "${row.title}" | Distance: ${distance.toFixed(4)} | Similarity: ${similarity.toFixed(4)} | ID: ${row.id}`
          );
          
          // Show content preview for top 3 results
          if (i < 3 && row.content) {
            const contentPreview = row.content.substring(0, 100).replace(/\n/g, ' ');
            console.log(`   Content: "${contentPreview}${row.content.length > 100 ? '...' : ''}"`);
          }

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
        
        console.log(`\n--- Summary ---`);
        console.log(`Results above threshold (${threshold}): ${searchResults.length}`);
        console.log(`Results below threshold: ${result.rows.length - searchResults.length}`);
        console.log(`=== END DOCUMENT SEARCH DEBUG ===\n`);
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
      
      // Debug: Check query embedding properties
      const queryMagnitude = Math.sqrt(
        queryEmbedding.reduce((sum, val) => sum + val * val, 0)
      );
      console.log(`Query embedding magnitude: ${queryMagnitude.toFixed(4)}`);
        console.log(`Query embedding dimensions: ${queryEmbedding.length}`);
        console.log(`Query embedding sample values: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
        
        // Check if embedding looks reasonable
        const nonZeroValues = queryEmbedding.filter(v => Math.abs(v) > 0.001).length;
        const maxValue = Math.max(...queryEmbedding.map(Math.abs));
        const avgValue = queryEmbedding.reduce((sum, v) => sum + Math.abs(v), 0) / queryEmbedding.length;
        console.log(`🔍 Embedding quality check:`);
        console.log(`  - Non-zero values: ${nonZeroValues}/${queryEmbedding.length} (${(nonZeroValues/queryEmbedding.length*100).toFixed(1)}%)`);
        console.log(`  - Max absolute value: ${maxValue.toFixed(4)}`);
        console.log(`  - Average absolute value: ${avgValue.toFixed(4)}`);
        
        if (nonZeroValues < queryEmbedding.length * 0.1) {
          console.warn(`⚠️  Embedding seems sparse - only ${(nonZeroValues/queryEmbedding.length*100).toFixed(1)}% non-zero values`);
        }
        if (maxValue < 0.01) {
          console.warn(`⚠️  Embedding values seem very small - max value: ${maxValue.toFixed(4)}`);
        }

      // Debug: Check Q&A database state
      const qaCountResult = await this.db.execute(
        "SELECT COUNT(*) as count FROM medical_qa"
      );
      const qaCount = qaCountResult.rows?.[0]?.count || 0;
      console.log(`Total Q&A pairs in database: ${qaCount}`);
      
      if (qaCount > 0) {
        console.log(`\n=== Q&A DATABASE STATE DEBUG ===`);
        
        // Check a few sample Q&A pairs
        const sampleQA = await this.db.execute(
          "SELECT id, question, vector_extract(vector) as vector_json FROM medical_qa LIMIT 3"
        );
        
        if (sampleQA.rows) {
          console.log(`Sample Q&A pairs in database:`);
          for (const qa of sampleQA.rows) {
            const vectorData = qa.vector_json ? JSON.parse(qa.vector_json) : null;
            const questionPreview = qa.question.substring(0, 50).replace(/\n/g, ' ');
            console.log(`- ID: ${qa.id}, Question: "${questionPreview}...", Vector dims: ${vectorData ? vectorData.length : 'null'}`);
          }
        }
        
        // Test if Q&A vector index is accessible
        try {
          const qaIndexTest = await this.db.execute(
            `SELECT COUNT(*) as count FROM vector_top_k('medical_qa_vector_idx', vector32(?), 1)`,
            [queryVectorStr]
          );
          console.log(`Q&A vector index test result: ${qaIndexTest.rows?.[0]?.count || 0} results`);
        } catch (indexError) {
          console.error(`Q&A vector index error:`, indexError);
        }
        
        // Test alternative Q&A vector search approaches
        console.log(`\n--- Testing Alternative Q&A Vector Search Methods ---`);
        
        // Test 1: Direct Q&A vector distance calculation
        try {
          const qaDirectTest = await this.db.execute(
            `SELECT COUNT(*) as count FROM medical_qa WHERE vector_distance_cos(vector, vector32(?)) < 2.0 LIMIT 5`,
            [queryVectorStr]
          );
          console.log(`Direct Q&A vector distance test: ${qaDirectTest.rows?.[0]?.count || 0} results`);
        } catch (qaDirectError) {
          console.error(`Direct Q&A vector distance error:`, qaDirectError);
        }
        
        // Test 2: Try Q&A search without vector index
        try {
          const qaAltTest = await this.db.execute(
            `SELECT id, question, vector_distance_cos(vector, vector32(?)) as distance FROM medical_qa ORDER BY distance LIMIT 3`,
            [queryVectorStr]
          );
          console.log(`Alternative Q&A search test: ${qaAltTest.rows?.length || 0} results`);
          if (qaAltTest.rows && qaAltTest.rows.length > 0) {
            const qaDistances = qaAltTest.rows.map(r => r.distance);
            const qaSimilarities = qaDistances.map(d => 1 - d);
            console.log(`Sample Q&A distances: ${qaDistances.map(d => d?.toFixed(4)).join(', ')}`);
            console.log(`Sample Q&A similarities: ${qaSimilarities.map(s => s?.toFixed(4)).join(', ')}`);
            console.log(`💡 Suggested Q&A threshold: ${Math.max(0.05, Math.min(...qaSimilarities) - 0.05).toFixed(2)} (current: ${threshold})`);
          }
        } catch (qaAltError) {
          console.error(`Alternative Q&A search error:`, qaAltError);
        }
        
        console.log(`=== END Q&A DATABASE STATE DEBUG ===\n`);
      } else {
        console.log(`⚠️  No Q&A pairs found in database - this explains the 0 Q&A results!`);
      }

      let result;
      try {
        result = await this.db.execute(
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
        
        // Check if Q&A vector_top_k actually returned results
         if (!result.rows || result.rows.length === 0) {
           throw new Error("Q&A vector_top_k returned 0 results - likely index issue");
         }
         console.log(`✅ Q&A vector_top_k search successful, found ${result.rows?.length || 0} results`);
       } catch (vectorIndexError) {
         console.warn(`⚠️  Q&A vector_top_k failed or returned 0 results, falling back to direct vector search:`, vectorIndexError);
        
        // Fallback: Use direct vector distance calculation for Q&A
        result = await this.db.execute(
          `
          SELECT
            qa.id,
            qa.question,
            qa.answer,
            qa.document_id,
            vector_extract(qa.vector) as vector_json,
            vector_distance_cos(qa.vector, vector32(?)) as distance
          FROM medical_qa qa
          ORDER BY vector_distance_cos(qa.vector, vector32(?)) ASC
          LIMIT ${limit}
        `,
          [queryVectorStr, queryVectorStr]
        );
        
        console.log(`📋 Q&A fallback search found ${result.rows?.length || 0} results`);
      }

      const searchResults: QASearchResult[] = [];

      if (result.rows) {
        console.log(`\n=== Q&A SIMILARITY SEARCH DEBUG ===`);
        console.log(`Query: "${options.query}"`);
        console.log(`Found ${result.rows.length} raw Q&A results from database`);
        console.log(`Similarity threshold: ${threshold}`);
        console.log(`\n--- All Q&A Results (sorted by distance) ---`);
        
        // Sort results by distance for better debugging
        const sortedRows = [...result.rows].sort((a, b) => (a.distance || 2) - (b.distance || 2));
        
        for (let i = 0; i < sortedRows.length; i++) {
          const row = sortedRows[i];
          const distance = row.distance || 2;
          // For normalized embeddings: similarity = 1 - distance
          const similarity = 1 - distance;
          const passesThreshold = similarity >= threshold;
          
          console.log(
            `${i + 1}. [${passesThreshold ? 'PASS' : 'FAIL'}] Distance: ${distance.toFixed(4)} | Similarity: ${similarity.toFixed(4)} | ID: ${row.id}`
          );
          
          // Show question and answer preview for top 3 results
          if (i < 3) {
            const questionPreview = row.question.substring(0, 80).replace(/\n/g, ' ');
            const answerPreview = row.answer.substring(0, 80).replace(/\n/g, ' ');
            console.log(`   Q: "${questionPreview}${row.question.length > 80 ? '...' : ''}"`);
            console.log(`   A: "${answerPreview}${row.answer.length > 80 ? '...' : ''}"`);
          }

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
        
        console.log(`\n--- Summary ---`);
        console.log(`Results above threshold (${threshold}): ${searchResults.length}`);
        console.log(`Results below threshold: ${result.rows.length - searchResults.length}`);
        console.log(`=== END Q&A SEARCH DEBUG ===\n`);
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
