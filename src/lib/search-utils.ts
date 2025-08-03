/**
 * Medical Search Utilities
 *
 * Provides reusable search functionality for medical documents and Q&A pairs.
 * Extracted from existing components to ensure consistency and reusability.
 */

import {
  getTursoDBService,
  DocumentSearchResult,
  QASearchResult,
  MedicalQA,
} from "./turso-db-service";
import {
  CombinedSearchResult,
  SearchOptions,
  FormattedResult,
} from "../types/rag";

// Default search configuration
export const DEFAULT_SEARCH_CONFIG = {
  limit: 5,
  threshold: 0.3, // Lower threshold for more results with normalized embeddings
  includeQA: true,
};

/**
 * Performs comprehensive medical search across documents and Q&A
 * @param query Search query text
 * @param options Search configuration options
 * @returns Combined search results
 */
export async function performMedicalSearch(
  query: string,
  options: SearchOptions = {}
): Promise<CombinedSearchResult> {
  if (!query?.trim()) {
    throw new Error("Search query is required");
  }

  const tursoService = getTursoDBService();

  if (!tursoService.isReady()) {
    throw new Error("Database service is not ready");
  }

  const searchOptions = {
    ...DEFAULT_SEARCH_CONFIG,
    ...options,
  };

  console.log(`🔍 Performing medical search for: "${query}"`);
  console.log(`📊 Search options:`, searchOptions);

  try {
    // Search medical documents
    console.log("📄 Searching medical documents...");
    const documentResults = await tursoService.searchMedicalDocuments({
      query,
      limit: searchOptions.limit,
      threshold: searchOptions.threshold,
      specialty: searchOptions.specialty,
      year: searchOptions.year,
    });

    console.log(`✅ Found ${documentResults.length} document matches`);

    // Search Q&A pairs
    console.log("❓ Searching Q&A pairs...");
    const qaResults = await tursoService.searchMedicalQA({
      query,
      limit: searchOptions.limit,
      threshold: searchOptions.threshold,
    });

    console.log(`✅ Found ${qaResults.length} Q&A matches`);

    // Get additional Q&A pairs from found documents if requested
    let additionalQA: MedicalQA[] = [];
    if (searchOptions.includeQA && documentResults.length > 0) {
      console.log("🔗 Fetching related Q&A from found documents...");

      for (const docResult of documentResults) {
        try {
          const relatedQA = await tursoService.getQAByDocument(
            docResult.document.id
          );
          additionalQA.push(...relatedQA);
        } catch (error) {
          console.warn(
            `Failed to get Q&A for document ${docResult.document.id}:`,
            error
          );
        }
      }

      console.log(
        `✅ Found ${additionalQA.length} additional Q&A pairs from documents`
      );
    }

    // Combine and deduplicate Q&A results
    const allQA = combineAndDeduplicateQA(
      qaResults.map((r) => r.qa),
      additionalQA
    );

    // Calculate statistics
    const allSimilarities = [
      ...documentResults.map((r) => r.similarity),
      ...qaResults.map((r) => r.similarity),
    ];

    const averageSimilarity =
      allSimilarities.length > 0
        ? allSimilarities.reduce((sum, sim) => sum + sim, 0) /
          allSimilarities.length
        : 0;

    const result: CombinedSearchResult = {
      documents: documentResults,
      qaData: allQA,
      totalResults: documentResults.length + allQA.length,
      averageSimilarity,
    };

    console.log(
      `🎯 Search completed: ${
        result.totalResults
      } total results, avg similarity: ${(averageSimilarity * 100).toFixed(1)}%`
    );
    return result;
  } catch (error) {
    console.error("❌ Medical search failed:", error);
    throw new Error(
      `Search failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Combines search results from documents and Q&A with proper deduplication
 * @param docResults Document search results
 * @param qaResults Q&A search results
 * @returns Combined search result
 */
export function combineSearchResults(
  docResults: DocumentSearchResult[],
  qaResults: QASearchResult[]
): CombinedSearchResult {
  const allSimilarities = [
    ...docResults.map((r) => r.similarity),
    ...qaResults.map((r) => r.similarity),
  ];

  const averageSimilarity =
    allSimilarities.length > 0
      ? allSimilarities.reduce((sum, sim) => sum + sim, 0) /
        allSimilarities.length
      : 0;

  return {
    documents: docResults,
    qaData: qaResults.map((r) => r.qa),
    totalResults: docResults.length + qaResults.length,
    averageSimilarity,
  };
}

/**
 * Formats search results for display in UI components
 * @param results Combined search results
 * @returns Array of formatted results ready for display
 */
export function formatSearchResultsForDisplay(
  results: CombinedSearchResult
): FormattedResult[] {
  const formatted: FormattedResult[] = [];

  // Format document results
  for (const docResult of results.documents) {
    formatted.push({
      type: "Document",
      title: docResult.document.title,
      content: docResult.document.content,
      similarity: docResult.similarity,
      specialty: docResult.document.specialty || "N/A",
      year: docResult.document.year || "N/A",
      url: docResult.document.url,
      id: docResult.document.id,
    });
  }

  // Format Q&A results
  for (const qa of results.qaData) {
    formatted.push({
      type: "Q&A",
      title: qa.question,
      content: qa.answer,
      similarity: 0, // Q&A from documents don't have direct similarity scores
      specialty: "N/A",
      year: "N/A",
      id: qa.id,
    });
  }

  // Sort by similarity (documents first, then Q&A)
  return formatted.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "Document" ? -1 : 1;
    }
    return b.similarity - a.similarity;
  });
}

/**
 * Combines and deduplicates Q&A arrays based on ID
 * @param searchQA Q&A from direct search
 * @param documentQA Q&A from related documents
 * @returns Deduplicated Q&A array
 */
function combineAndDeduplicateQA(
  searchQA: MedicalQA[],
  documentQA: MedicalQA[]
): MedicalQA[] {
  const qaMap = new Map<string, MedicalQA>();

  // Add search results first (higher priority)
  for (const qa of searchQA) {
    qaMap.set(qa.id, qa);
  }

  // Add document Q&A if not already present
  for (const qa of documentQA) {
    if (!qaMap.has(qa.id)) {
      qaMap.set(qa.id, qa);
    }
  }

  return Array.from(qaMap.values());
}

/**
 * Validates search options and applies defaults
 * @param options Raw search options
 * @returns Validated and normalized search options
 */
export function normalizeSearchOptions(
  options: SearchOptions = {}
): Required<SearchOptions> {
  return {
    limit: Math.max(
      1,
      Math.min(options.limit || DEFAULT_SEARCH_CONFIG.limit, 20)
    ),
    threshold: Math.max(
      0,
      Math.min(options.threshold || DEFAULT_SEARCH_CONFIG.threshold, 1)
    ),
    specialty: options.specialty || "",
    year: options.year || 0,
    includeQA: options.includeQA !== false, // Default to true
  };
}

/**
 * Creates a search summary for logging/debugging
 * @param query Search query
 * @param results Search results
 * @param duration Search duration in milliseconds
 * @returns Human-readable search summary
 */
export function createSearchSummary(
  query: string,
  results: CombinedSearchResult,
  duration: number
): string {
  return [
    `Search Summary:`,
    `  Query: "${query}"`,
    `  Duration: ${duration}ms`,
    `  Documents: ${results.documents.length}`,
    `  Q&A Pairs: ${results.qaData.length}`,
    `  Total: ${results.totalResults}`,
    `  Avg Similarity: ${(results.averageSimilarity * 100).toFixed(1)}%`,
  ].join("\n");
}

/**
 * Utility to check if search results are meaningful
 * @param results Search results to evaluate
 * @param minSimilarity Minimum similarity threshold
 * @returns Whether results meet quality criteria
 */
export function hasQualityResults(
  results: CombinedSearchResult,
  minSimilarity: number = 0.2
): boolean {
  if (results.totalResults === 0) {
    return false;
  }

  // Check if we have at least one high-quality document result
  const hasGoodDocuments = results.documents.some(
    (doc) => doc.similarity >= minSimilarity
  );

  // Or if we have related Q&A data
  const hasRelatedQA = results.qaData.length > 0;

  return hasGoodDocuments || hasRelatedQA;
}
