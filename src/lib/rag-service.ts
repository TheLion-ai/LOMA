/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Main service that orchestrates vector search and AI context injection
 * for enhanced medical knowledge responses.
 */

import { DocumentSearchResult, getTursoDBService } from "./turso-db-service";

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
import { DEFAULT_VALUES } from "./settings-context";

// Default RAG configuration factory
const createDefaultRAGConfig = (maxResults?: number): RAGConfig => ({
  defaultSearchOptions: {
    limit: maxResults || DEFAULT_VALUES.MAX_RAG_RESULTS,
    threshold: 0.3,
    includeQA: true,
  },
  maxContextLength: 4000, // Max characters for context
  includeSources: true,
  contextTemplate: `CONTEXT: The following medical passages provided as reference:

{answers}

Please use this context to provide accurate medical information. Always cite sources [n] when referencing the provided context.


USER QUESTION: {query}`,
});

/**
 * RAG Service class for managing retrieval-augmented generation
 */
export class RAGService {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}, maxResults?: number) {
    this.config = { ...createDefaultRAGConfig(maxResults), ...config };
  }

  /**
   * Updates the max results limit for searches
   * @param maxResults New maximum number of results
   */
  updateMaxResults(maxResults: number): void {
    this.config.defaultSearchOptions.limit = maxResults;
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
      console.log(`Final LLM Prompt:\n${context}`);

      // Extract sources for citation
      const sources = await this.extractSources(searchResults);


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
    const answersSection = results.qaData
      .slice(0, 10)
      .map((qa, index) => {
        const maxALength = 200;

        let answer = qa.answer;
        if (answer.length > maxALength) {
          answer = answer.substring(0, maxALength) + "...";
        }
        return `[${index + 1}] ${answer}`;
      })
      .join("\n");

    let context = this.config.contextTemplate
      .replace("{answers}", answersSection || "No relevant passages found.")
      .replace("{query}", query);


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
  async extractSources(results: CombinedSearchResult): Promise<Source[]> {
    const sources: Source[] = [];
    const seenDocumentIds = new Set<string>();
    const orderedQAData = results.qaData.slice(0, 10);
    const orderedDocumentIds: string[] = [];
    
    for (const qa of orderedQAData) {
      if (qa.document_id && !seenDocumentIds.has(qa.document_id)) {
        orderedDocumentIds.push(qa.document_id);
        seenDocumentIds.add(qa.document_id);
      }
    }

    if (orderedDocumentIds.length > 0) {
      try {
        const dbService = getTursoDBService();
        const referencedDocuments = await dbService.getDocumentsByIds(orderedDocumentIds);
        const documentMap = new Map(referencedDocuments.map(doc => [doc.id, doc]));
        
        for (const docId of orderedDocumentIds) {
          const doc = documentMap.get(docId);
          if (doc) {
            sources.push({
              id: doc.id,
              title: doc.title,
              url: doc.url,
              type: 'document',
              similarity: undefined,
              excerpt: doc.content,
              year: doc.year,
              specialty: doc.specialty
            });
          }
        }
      } catch (error) {
        console.error('Error fetching referenced documents:', error);
      }
    }

    return sources;

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
 * @param maxResults Optional max results override
 * @returns RAG service instance
 */
export function getRAGService(maxResults?: number): RAGService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService({}, maxResults);
  } else if (maxResults !== undefined) {
    ragServiceInstance.updateMaxResults(maxResults);
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
