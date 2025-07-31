/**
 * @file turso-db-service.ts
 * @description Vector database service using Turso/libSQL for semantic search capabilities
 * This service provides vector storage and similarity search functionality for AI applications
 * using OP-SQLite with libSQL extensions for vector operations.
 */

import { Platform } from 'react-native';

// Configuration constants
const DB_NAME = 'loma_vector_db.db';
const DB_LOCATION = 'default';
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
  /** Optional metadata as key-value pairs */
  metadata?: Record<string, any>;
  /** Vector embedding representation of the document content */
  embedding?: number[];
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
let open: ((options: { name: string; location: string }) => SQLiteDatabase) | null = null;
let openSync: any = null;

// Load OP-SQLite conditionally for native platforms
if (Platform.OS !== 'web') {
  try {
    const opSQLite = require('@op-engineering/op-sqlite');
    open = opSQLite.open;
    openSync = opSQLite.openSync;
  } catch (error) {
    console.error('OP-SQLite not available:', error);
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

  /**
   * Initializes the database service
   * Creates necessary tables and indexes for vector operations
   * Inserts example documents if the database is empty
   * @throws Error if initialization fails
   */
  async initialize(): Promise<void> {
    // Skip if already initialized
    if (this.isInitialized) {
      return;
    }

    // Check platform compatibility
    if (Platform.OS === 'web') {
      console.warn('Turso DB service not available on web platform');
      return;
    }

    // Verify OP-SQLite is available
    if (!open) {
      throw new Error('OP-SQLite not available on this platform');
    }

    try {
      console.log('Initializing Turso DB service...');
      
      // Open local SQLite database with libSQL support
      this.db = open({
        name: DB_NAME,
        location: DB_LOCATION,
      });

      // Create tables for vector storage
      await this.createTables();
      
      // Insert example documents
      await this.insertExampleDocuments();

      this.isInitialized = true;
      console.log('Turso DB service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Turso DB service:', error);
      // Reset state on failure
      this.db = null;
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Creates the necessary database tables and indexes for vector operations
   * Drops existing tables to ensure a clean schema if needed
   * @private
   * @throws Error if table creation fails
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Drop existing tables to ensure clean schema
      try {
        await this.db.execute('DROP TABLE IF EXISTS documents');
        console.log('Dropped existing documents table');
      } catch (dropError) {
        console.warn('Error dropping table:', dropError);
        // Continue execution - dropping is optional
      }

      // Create documents table with libSQL vector support
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          metadata TEXT,
          embedding F32_BLOB(${EMBEDDING_DIMENSION}),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create vector index for similarity search using libSQL syntax
      await this.db.execute(`
        CREATE INDEX IF NOT EXISTS documents_vector_idx 
        ON documents ( libsql_vector_idx(embedding, 'metric=cosine') )
      `);

      console.log('Database tables created successfully with vector support');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw new Error(`Failed to create database tables: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Inserts example documents with mock embeddings into the database
   * Only inserts if the database is empty
   * @private
   * @throws Error if document insertion fails
   */
  private async insertExampleDocuments(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Check if we already have documents
      const result = await this.db.execute('SELECT COUNT(*) as count FROM documents');
      const count = result.rows?.[0]?.count || 0;

      if (count > 0) {
        console.log('Example documents already exist, skipping insertion');
        return;
      }

      // Example documents with mock embeddings (in real app, these would be generated by an embedding model)
      const exampleDocs = [
        {
          id: 'doc1',
          content: 'React Native is a framework for building mobile applications using React and JavaScript.',
          metadata: { category: 'technology', topic: 'mobile development' },
          embedding: this.generateMockEmbedding([0.1, 0.2, 0.3, 0.4])
        },
        {
          id: 'doc2',
          content: 'Artificial Intelligence and Machine Learning are transforming how we build software applications.',
          metadata: { category: 'technology', topic: 'AI/ML' },
          embedding: this.generateMockEmbedding([0.2, 0.3, 0.4, 0.5])
        },
        {
          id: 'doc3',
          content: 'Vector databases enable semantic search and similarity matching for AI applications.',
          metadata: { category: 'database', topic: 'vector search' },
          embedding: this.generateMockEmbedding([0.3, 0.4, 0.5, 0.6])
        },
        {
          id: 'doc4',
          content: 'SQLite is a lightweight, serverless database engine perfect for mobile and embedded applications.',
          metadata: { category: 'database', topic: 'SQLite' },
          embedding: this.generateMockEmbedding([0.4, 0.5, 0.6, 0.7])
        },
        {
          id: 'doc5',
          content: 'Turso brings the power of SQLite to the cloud with built-in vector search capabilities.',
          metadata: { category: 'database', topic: 'Turso' },
          embedding: this.generateMockEmbedding([0.5, 0.6, 0.7, 0.8])
        }
      ];

      // Insert documents in a transaction for better performance and atomicity
      await this.db.execute('BEGIN TRANSACTION');
      
      try {
        for (const doc of exampleDocs) {
          const metadataStr = JSON.stringify(doc.metadata);
          // Use vector32() function to properly convert JSON array to F32_BLOB
          const vectorStr = this.toVector(doc.embedding);
          await this.db.execute(
            `INSERT INTO documents (id, content, metadata, embedding) VALUES (?, ?, ?, vector32(?))`,
            [doc.id, doc.content, metadataStr, vectorStr]
          );
        }
        
        await this.db.execute('COMMIT');
        console.log(`${exampleDocs.length} example documents inserted successfully`);
      } catch (txError) {
        // Rollback on error
        await this.db.execute('ROLLBACK');
        throw txError;
      }
    } catch (error) {
      console.error('Error inserting example documents:', error);
      throw new Error(`Failed to insert example documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generates a mock embedding vector for demonstration purposes
   * Creates a vector with the specified dimension using base values with small random variations
   * @private
   * @param base - Base values to use for generating the embedding
   * @returns A vector of specified dimension with values derived from the base
   */
  private generateMockEmbedding(base: number[]): number[] {
    if (!base || base.length === 0) {
      throw new Error('Base values are required for generating mock embeddings');
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
      throw new Error('Invalid embedding: must be a non-empty array of numbers');
    }
    
    // Validate all values are numbers
    for (const value of embedding) {
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error('Invalid embedding: contains non-numeric or NaN values');
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
      throw new Error('Database not initialized');
    }

    // Validate document
    if (!document.id) {
      throw new Error('Document ID is required');
    }

    if (!document.content) {
      throw new Error('Document content is required');
    }

    try {
      // Convert metadata to JSON string if present
      const metadata = document.metadata ? JSON.stringify(document.metadata) : null;
      
      if (document.embedding) {
        // Use vector32() function to properly convert JSON array to F32_BLOB
        const vectorStr = this.toVector(document.embedding);
        await this.db.execute(
          `INSERT OR REPLACE INTO documents (id, content, metadata, embedding) VALUES (?, ?, ?, vector32(?))`,
          [document.id, document.content, metadata, vectorStr]
        );
      } else {
        // Store document without embedding
        await this.db.execute(
          'INSERT OR REPLACE INTO documents (id, content, metadata, embedding) VALUES (?, ?, ?, NULL)',
          [document.id, document.content, metadata]
        );
      }

      console.log(`Document ${document.id} added successfully`);
    } catch (error) {
      console.error('Error adding document:', error);
      throw new Error(`Failed to add document ${document.id}: ${error instanceof Error ? error.message : String(error)}`);
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
  async searchSimilar(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    // Validate database connection
    if (!this.isInitialized || !this.db) {
      throw new Error('Database not initialized');
    }

    // Validate search options
    if (!options.query) {
      throw new Error('Search query is required');
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
      const result = await this.db.execute(`
        SELECT 
          d.id,
          d.content,
          d.metadata,
          vector_extract(d.embedding) as embedding,
          vector_distance_cos(d.embedding, vector32(?)) as distance
        FROM vector_top_k('documents_vector_idx', vector32(?), ${limit}) vtk
        JOIN documents d ON d.rowid = vtk.id
      `, [queryVectorStr, queryVectorStr]);

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
                metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
                embedding: row.embedding ? JSON.parse(row.embedding) : undefined
              };

              searchResults.push({
                document,
                similarity
              });
            } catch (parseError) {
              console.warn(`Error parsing result row for document ${row.id}:`, parseError);
              // Skip this row but continue processing others
            }
          }
        }
      }

      console.log(`Found ${searchResults.length} similar documents for query: "${options.query}"`);
      return searchResults;
    } catch (error) {
      console.error('Error searching similar documents:', error);
      throw new Error(`Failed to search similar documents: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new Error('Database not initialized');
    }

    try {
      // Use vector_extract to get the embedding as a JSON string
      const result = await this.db.execute(
        'SELECT id, content, metadata, vector_extract(embedding) as embedding_json FROM documents ORDER BY created_at DESC'
      );
      const documents: VectorDocument[] = [];

      if (result.rows) {
        for (const row of result.rows) {
          try {
            const document: VectorDocument = {
              id: row.id,
              content: row.content,
              metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
              embedding: row.embedding_json ? JSON.parse(row.embedding_json) : undefined
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
      console.error('Error getting all documents:', error);
      throw new Error(`Failed to get all documents: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new Error('Database not initialized');
    }

    if (!id) {
      throw new Error('Document ID is required for deletion');
    }

    try {
      const result = await this.db.execute('DELETE FROM documents WHERE id = ?', [id]);
      const rowsAffected = result.rows?.length || 0;
      
      if (rowsAffected > 0) {
        console.log(`Document ${id} deleted successfully`);
      } else {
        console.warn(`No document found with ID ${id} to delete`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document ${id}: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.execute('SELECT COUNT(*) as count FROM documents');
      const count = result.rows?.[0]?.count || 0;
      return count;
    } catch (error) {
      console.error('Error getting document count:', error);
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
   * Cleans up database resources
   * Closes the database connection and resets the service state
   */
  async cleanup(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
        this.isInitialized = false;
        console.log('Turso DB service cleaned up successfully');
      } catch (error) {
        console.error('Error cleaning up Turso DB service:', error);
        // Reset state even if close fails
        this.db = null;
        this.isInitialized = false;
        throw new Error(`Failed to clean up database: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('No active database connection to clean up');
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
    console.log('Created new TursoDBService instance');
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
    console.log('Reset TursoDBService singleton instance');
  }
}