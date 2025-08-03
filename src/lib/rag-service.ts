/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Main service that orchestrates vector search and AI context injection
 * for enhanced medical knowledge responses.
 */

import { DocumentSearchResult, MedicalQA } from "./turso-db-service";
import {
  performMedicalSearch,
  hasQualityResults,
  createSearchSummary,
} from "./search-utils";
import {
  RAGResult,
  Source,
  SearchOptions,
  RAGConfig,
  CombinedSearchResult,
} from "../types/rag";

// Default RAG configuration
const DEFAULT_RAG_CONFIG: RAGConfig = {
  defaultSearchOptions: {
    limit: 5,
    threshold: 0.3,
    includeQA: true,
  },
  maxContextLength: 4000, // Max characters for context
  includeSources: true,
  contextTemplate: `CONTEXT: The following medical documents and Q&A pairs are provided as reference:

DOCUMENTS:
{documents}

Q&A PAIRS:
{qaData}

Please use this context to provide accurate medical information. Always cite sources when referencing the provided context.

USER QUESTION: {query}`,
};

/**
 * RAG Service class for managing retrieval-augmented generation
 */
export class RAGService {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }

  /**
   * Main RAG method: searches for relevant content and enhances the query with context
   * @param query User's question/query
   * @param options Search options to override defaults
   * @returns RAG result with context and sources
   */
  async searchAndEnhanceQuery(
    query: string,
    options: SearchOptions = {}
  ): Promise<RAGResult> {
    const startTime = Date.now();

    try {
      console.log(`🚀 Starting RAG search for: "${query}"`);

      // Validate input
      if (!query?.trim()) {
        throw new Error("Query is required for RAG search");
      }

      // Merge search options
      const searchOptions = {
        ...this.config.defaultSearchOptions,
        ...options,
      };

      // Perform medical search
      const searchResults = await performMedicalSearch(query, searchOptions);

      // Check if we have meaningful results
      if (!hasQualityResults(searchResults)) {
        console.log(
          "⚠️ No quality search results found, returning empty RAG result"
        );
        return {
          searchResults,
          context: "",
          sources: [],
          success: false,
          error: "No relevant medical information found for this query",
        };
      }

      // Format context for AI
      const context = this.formatContextForAI(searchResults, query);

      // Extract sources for citation
      const sources = this.extractSources(searchResults);

      // Log completion
      const duration = Date.now() - startTime;
      console.log(createSearchSummary(query, searchResults, duration));
      console.log(
        `✅ RAG context generated (${context.length} chars, ${sources.length} sources)`
      );

      return {
        searchResults,
        context,
        sources,
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ RAG search failed after ${duration}ms:`, error);

      return {
        searchResults: {
          documents: [],
          qaData: [],
          totalResults: 0,
          averageSimilarity: 0,
        },
        context: "",
        sources: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Formats search results into AI-readable context
   * @param results Combined search results
   * @param query Original user query
   * @returns Formatted context string
   */
  formatContextForAI(results: CombinedSearchResult, query: string): string {
    // Format documents section
    const documentsSection = results.documents
      .map((docResult, index) => {
        const doc = docResult.document;
        const similarity = Math.round(docResult.similarity * 100);

        // Truncate content if too long
        const maxContentLength = 300;
        let content = doc.content;
        if (content.length > maxContentLength) {
          content = content.substring(0, maxContentLength) + "...";
        }

        const urlText = doc.url ? ` (Source: ${doc.url})` : "";
        return `${index + 1}. ${
          doc.title
        } - ${content}${urlText} [${similarity}% match]`;
      })
      .join("\n");

    // Format Q&A section
    const qaSection = results.qaData
      .slice(0, 10) // Limit Q&A pairs to prevent context overflow
      .map((qa, index) => {
        // Truncate long Q&A content
        const maxQLength = 150;
        const maxALength = 200;

        let question = qa.question;
        if (question.length > maxQLength) {
          question = question.substring(0, maxQLength) + "...";
        }

        let answer = qa.answer;
        if (answer.length > maxALength) {
          answer = answer.substring(0, maxALength) + "...";
        }

        return `${index + 1}. Q: ${question} A: ${answer}`;
      })
      .join("\n");

    // Generate context using template
    let context = this.config.contextTemplate
      .replace(
        "{documents}",
        documentsSection || "No relevant documents found."
      )
      .replace("{qaData}", qaSection || "No relevant Q&A pairs found.")
      .replace("{query}", query);

    // Truncate if context is too long
    if (context.length > this.config.maxContextLength) {
      console.log(
        `⚠️ Context truncated from ${context.length} to ${this.config.maxContextLength} characters`
      );
      context =
        context.substring(0, this.config.maxContextLength) +
        "\n\n[Context truncated due to length...]";
    }

    return context;
  }

  /**
   * Extracts source information for citation
   * @param results Combined search results
   * @returns Array of source objects
   */
  extractSources(results: CombinedSearchResult): Source[] {
    const sources: Source[] = [];

    // Add document sources
    for (const docResult of results.documents) {
      const doc = docResult.document;

      // Create excerpt from content
      const maxExcerptLength = 100;
      let excerpt = doc.content;
      if (excerpt.length > maxExcerptLength) {
        excerpt = excerpt.substring(0, maxExcerptLength) + "...";
      }

      sources.push({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        type: "document",
        similarity: docResult.similarity,
        excerpt,
      });
    }

    // Add Q&A sources (limited to prevent overwhelming)
    const maxQASources = 5;
    for (const qa of results.qaData.slice(0, maxQASources)) {
      // Use question as excerpt
      const maxExcerptLength = 80;
      let excerpt = qa.question;
      if (excerpt.length > maxExcerptLength) {
        excerpt = excerpt.substring(0, maxExcerptLength) + "...";
      }

      sources.push({
        id: qa.id,
        title: `Q&A: ${excerpt}`,
        type: "qa",
        similarity: 0, // Q&A from documents don't have similarity scores
        excerpt:
          qa.answer.substring(0, 100) + (qa.answer.length > 100 ? "..." : ""),
      });
    }

    // Sort sources by similarity (documents first, then Q&A)
    return sources.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "document" ? -1 : 1;
      }
      return b.similarity - a.similarity;
    });
  }

  /**
   * Formats sources for display in chat
   * @param sources Array of source objects
   * @returns Formatted sources string
   */
  formatSourcesForDisplay(sources: Source[]): string {
    if (sources.length === 0) {
      return "";
    }

    const sourceLines = sources.map((source) => {
      const similarity =
        source.similarity > 0
          ? ` (${Math.round(source.similarity * 100)}% match)`
          : "";

      if (source.url) {
        return `• ${source.title}${similarity} - ${source.url}`;
      } else {
        return `• ${source.title}${similarity}`;
      }
    });

    return `\n\n**Sources:**\n${sourceLines.join("\n")}`;
  }

  /**
   * Updates RAG configuration
   * @param newConfig Partial configuration to merge
   */
  updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current RAG configuration
   * @returns Current configuration
   */
  getConfig(): RAGConfig {
    return { ...this.config };
  }

  /**
   * Checks if RAG system is ready for use
   * @returns Whether the system is ready
   */
  async isReady(): Promise<boolean> {
    try {
      // Test search with a simple query to verify system readiness
      const testResult = await performMedicalSearch("test", { limit: 1 });
      return true;
    } catch (error) {
      console.warn("RAG system not ready:", error);
      return false;
    }
  }
}

// Global RAG service instance
let ragServiceInstance: RAGService | null = null;

/**
 * Gets the global RAG service instance
 * @returns RAG service instance
 */
export function getRAGService(): RAGService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService();
  }
  return ragServiceInstance;
}

/**
 * Creates a new RAG service with custom configuration
 * @param config Custom configuration
 * @returns New RAG service instance
 */
export function createRAGService(config: Partial<RAGConfig> = {}): RAGService {
  return new RAGService(config);
}
