/**
 * RAG (Retrieval-Augmented Generation) Type Definitions
 *
 * Contains all type definitions for the RAG system that integrates
 * vector search with AI chat functionality.
 */

import {
  DocumentSearchResult,
  QASearchResult,
  MedicalQA,
} from "../lib/turso-db-service";

/**
 * Result of a RAG operation containing search results, formatted context, and sources
 */
export interface RAGResult {
  /** Combined search results from documents and Q&A */
  searchResults: CombinedSearchResult;
  /** Formatted context string ready for AI injection */
  context: string;
  /** Array of sources for citation */
  sources: Source[];
  /** Whether the search was successful */
  success: boolean;
  /** Error message if search failed */
  error?: string;
}

/**
 * Combined search results from both documents and Q&A pairs
 */
export interface CombinedSearchResult {
  /** Document search results */
  documents: DocumentSearchResult[];
  /** Q&A search results and related Q&A from found documents */
  qaData: MedicalQA[];
  /** Total number of results found */
  totalResults: number;
  /** Average similarity score */
  averageSimilarity: number;
}

/**
 * Source information for citation in AI responses
 */
export interface Source {
  /** Title of the source */
  title: string;
  /** URL if available */
  url?: string;
  /** Type of source */
  type: "document" | "qa";
  /** Similarity score (0-1) */
  similarity: number;
  /** Content excerpt for preview */
  excerpt: string;
  /** Unique identifier */
  id: string;
}

/**
 * Options for medical search operations
 */
export interface SearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Medical specialty filter */
  specialty?: string;
  /** Publication year filter */
  year?: number;
  /** Whether to include Q&A from found documents */
  includeQA?: boolean;
}

/**
 * Formatted result for display purposes
 */
export interface FormattedResult {
  /** Result type */
  type: "Document" | "Q&A";
  /** Display title */
  title: string;
  /** Content preview */
  content: string;
  /** Similarity percentage */
  similarity: number;
  /** Additional metadata */
  specialty?: string;
  year?: string | number;
  /** Source URL if available */
  url?: string;
  /** Unique identifier */
  id: string;
}

/**
 * RAG search status for UI feedback
 */
export interface RAGSearchStatus {
  /** Current phase of the search */
  phase: "idle" | "searching" | "processing" | "complete" | "error";
  /** Status message for user feedback */
  message: string;
  /** Whether search is in progress */
  isLoading: boolean;
  /** Progress percentage (0-100) */
  progress?: number;
}

/**
 * Configuration for RAG system
 */
export interface RAGConfig {
  /** Default search options */
  defaultSearchOptions: SearchOptions;
  /** Maximum context length for AI */
  maxContextLength: number;
  /** Whether to include sources in AI response */
  includeSources: boolean;
  /** Template for context formatting */
  contextTemplate: string;
}
