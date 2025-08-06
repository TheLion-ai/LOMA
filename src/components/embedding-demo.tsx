import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Input } from "@/components/ui/input";
import {
  useQueuedEmbeddingService,
  useEmbeddingModel,
} from "../lib/embedding-service";
import { getTursoDBService } from "../lib/turso-db-service";
import {
  performMedicalSearch,
  formatSearchResultsForDisplay,
} from "../lib/search-utils";
import { FormattedResult } from "../types/rag";
import { useTheme } from "@/lib/theme-context";
import { useSettings } from "@/lib/settings-context";
import { getCurrentTheme, theme } from "@/lib/theme";

interface ExpandedState {
  [key: string]: boolean;
}

/**
 * Demo component showing ExecuTorch embedding integration with TursoDBService
 */
export default function EmbeddingDemo() {
  const { isDark } = useTheme();
  const { maxEmbeddingResults } = useSettings();
  const colors = getCurrentTheme(isDark);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FormattedResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<string>("Initializing...");
  const [dbStatus, setDbStatus] = useState<string>("Initializing...");
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Initialize the embedding service and model
  const embeddingService = useQueuedEmbeddingService();
  const embeddingModel = useEmbeddingModel();

  // Initialize the database service
  const dbService = getTursoDBService();

  const dynamicStyles = {
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold" as const,
      marginBottom: 16,
      color: colors.foreground,
    },
    sectionContainer: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 8,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold" as const,
      marginBottom: 8,
      color: colors.cardForeground,
    },
    statusText: {
      fontSize: 14,
      marginBottom: 4,
      color: colors.mutedForeground,
    },
    inputContainer: {
      marginBottom: 12,
    },
    buttonRow: {
      flexDirection: "row" as const,
      gap: 8,
    },
    buttonRowSingle: {
      flexDirection: "row" as const,
      marginTop: 8,
      width: "100%" as const,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: "center" as const,
    },
    primaryButtonDisabled: {
      backgroundColor: colors.muted,
    },
    secondaryButton: {
      backgroundColor: colors.destructive,
      padding: 12,
      borderRadius: 8,
      alignItems: "center" as const,
      paddingHorizontal: 20,
    },
    warningButton: {
      flex: 1,
      backgroundColor: colors.accent,
      padding: 12,
      borderRadius: 8,
      alignItems: "center" as const,
      flexShrink: 1,
    },
    warningButtonDisabled: {
      backgroundColor: colors.muted,
    },
    buttonText: {
      color: colors.primaryForeground,
      fontWeight: "bold" as const,
    },
    secondaryButtonText: {
      color: colors.destructiveForeground,
      fontWeight: "bold" as const,
    },
    warningButtonText: {
      color: colors.accentForeground,
      fontWeight: "bold" as const,
    },
    resultItem: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.muted,
    },
    resultHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      marginBottom: 8,
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: "bold" as const,
      color: colors.foreground,
    },
    resultInfoContainer: {
      marginTop: 8,
      gap: 4,
    },
    resultInfoRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    resultLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      minWidth: 80,
    },
    resultValue: {
      fontSize: 12,
      color: colors.foreground,
      fontWeight: "bold" as const,
      flex: 1,
    },
    resultSimilarity: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "bold" as const,
    },
    resultContent: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    resultFooter: {
      flexDirection: "row" as const,
      gap: 16,
    },
    resultFooterText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    instructionsText: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    instructionsTextSpaced: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 20,
      marginTop: 8,
    },
    documentContainer: {
      marginBottom: 12,
      backgroundColor: colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    documentHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      padding: 12,
      backgroundColor: colors.background,
    },
    documentTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      marginRight: 8,
    },
    expandIcon: {
      fontSize: 16,
      fontWeight: "bold" as const,
      color: colors.mutedForeground,
      width: 20,
      textAlign: "center" as const,
    },
    documentContent: {
      padding: 12,
      paddingTop: 0,
      backgroundColor: colors.muted,
    },
    contentScrollView: {
      maxHeight: 200,
      marginBottom: 8,
    },
    contentText: {
      fontSize: 12,
      color: colors.foreground,
      lineHeight: 18,
    },
    metadata: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    metadataText: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    linkText: {
      fontSize: 11,
      color: colors.primary,
      marginTop: 4,
    },
  };

  useEffect(() => {
    // Only initialize database after embedding model is ready
    if (embeddingModel.isReady) {
      // Set the embedding model first, then initialize services
      dbService.setEmbeddingModel(embeddingModel);
      initializeServices();
    }
  }, [embeddingModel.isReady]);

  useEffect(() => {
    // Update model status when embedding model changes
    if (embeddingModel.error) {
      setModelStatus(`Error: ${embeddingModel.error}`);
    } else if (embeddingModel.isReady) {
      setModelStatus("Ready");
    } else if (embeddingModel.isGenerating) {
      setModelStatus("Generating...");
    } else {
      setModelStatus(
        `Loading... ${Math.round(embeddingModel.downloadProgress * 100)}%`
      );
    }
  }, [
    embeddingModel.isReady,
    embeddingModel.error,
    embeddingModel.isGenerating,
    embeddingModel.downloadProgress,
  ]);

  const initializeServices = async () => {
    try {
      setDbStatus("Initializing database...");
      await dbService.initialize();
      setDbStatus("Database ready");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      setDbStatus(
        `Database error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a search query");
      return;
    }

    if (!embeddingModel.isReady) {
      Alert.alert("Error", "Embedding model is not ready yet");
      return;
    }

    setIsLoading(true);
    try {
      console.log(
        "🔍 Performing document search using shared utilities..."
      );

      const searchResults = await performMedicalSearch(searchQuery, {
        limit: maxEmbeddingResults,
        threshold: 0.1,
        includeQA: false,
      });

      // Format only document results for display
      const documentsOnlyResult = {
        ...searchResults,
        qaData: [], // Remove Q&A data
        totalResults: searchResults.documents.length
      };
      const formattedResults = formatSearchResultsForDisplay(documentsOnlyResult);

      setSearchResults(formattedResults);
      console.log(`✅ Found ${formattedResults.length} document results`);
      console.log(
        `📊 Search stats: ${searchResults.documents.length} documents`
      );
    } catch (error) {
      console.error("❌ Search failed:", error);
      Alert.alert(
        "Search Error",
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
    setSearchQuery("");
    setExpanded({});
  };

  const toggleExpanded = (resultId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [resultId]: !prev[resultId],
    }));
  };

  const debugDocuments = async () => {
    try {
      await dbService.debugDocuments();
    } catch (error) {
      console.error("Failed to debug documents:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  return (
    <ScrollView style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>ExecuTorch Embedding Demo</Text>

      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Status</Text>
        <Text style={dynamicStyles.statusText}>
          Embedding Model: {modelStatus}
        </Text>
        <Text style={dynamicStyles.statusText}>Database: {dbStatus}</Text>
      </View>

      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Medical Document Search</Text>
        <Input
          style={dynamicStyles.inputContainer}
          placeholder="Enter your medical question or topic..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          multiline
          numberOfLines={3}
        />
        <View style={dynamicStyles.buttonRow}>
          <TouchableOpacity
            style={[
              dynamicStyles.primaryButton,
              (!embeddingModel.isReady || isLoading) &&
                dynamicStyles.primaryButtonDisabled,
            ]}
            onPress={performSearch}
            disabled={!embeddingModel.isReady || isLoading}
          >
            <Text style={dynamicStyles.buttonText}>
              {isLoading ? "Searching..." : "Search"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={dynamicStyles.secondaryButton}
            onPress={clearResults}
          >
            <Text style={dynamicStyles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={dynamicStyles.buttonRowSingle}>
          <TouchableOpacity
            style={[
              dynamicStyles.warningButton,
              isLoading && dynamicStyles.warningButtonDisabled,
              {
                flex: 1,
                alignItems: "center",
              },
            ]}
            onPress={debugDocuments}
            disabled={isLoading}
          >
            <Text style={dynamicStyles.warningButtonText}>Debug Documents</Text>
          </TouchableOpacity>
        </View>
      </View>

      {searchResults.length > 0 && (
        <View style={dynamicStyles.sectionContainer}>
          <Text style={dynamicStyles.sectionTitle}>
            Search Results ({searchResults.length})
          </Text>
          {searchResults.map((result, index) => {
            const resultId = result.id || `result-${index}`;
            return (
              <View key={resultId} style={dynamicStyles.documentContainer}>
                <TouchableOpacity
                  style={dynamicStyles.documentHeader}
                  onPress={() => toggleExpanded(resultId)}
                >
                  <Text style={dynamicStyles.documentTitle}>
                    {index + 1}. {result.title || "Untitled"}
                  </Text>
                  <Text style={dynamicStyles.expandIcon}>
                    {expanded[resultId] ? "−" : "+"}
                  </Text>
                </TouchableOpacity>

                {expanded[resultId] && (
                  <View style={dynamicStyles.documentContent}>
                    <ScrollView
                      style={dynamicStyles.contentScrollView}
                      nestedScrollEnabled={true}
                    >
                      <Text style={dynamicStyles.contentText}>
                        {result.content || "No content available"}
                      </Text>
                    </ScrollView>

                    <View style={dynamicStyles.metadata}>
                      <Text style={dynamicStyles.metadataText}>
                        Type: {result.type || "Document"}
                      </Text>

                      {result.similarity && result.similarity > 0 && (
                        <Text style={dynamicStyles.metadataText}>
                          Similarity: {(result.similarity * 100).toFixed(1)}%
                        </Text>
                      )}

                      {result.year && (
                        <Text style={dynamicStyles.metadataText}>
                          Year: {result.year}
                        </Text>
                      )}

                      {result.specialty && (
                        <Text style={dynamicStyles.metadataText}>
                          Specialty: {result.specialty}
                        </Text>
                      )}

                      {result.url && (
                        <Text style={dynamicStyles.linkText}>
                          Link: {result.url}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={[dynamicStyles.sectionContainer, { marginTop: 16 }]}>
        <Text style={dynamicStyles.sectionTitle}>How it works</Text>
        <Text style={dynamicStyles.instructionsText}>
          This demo uses ExecuTorch's ALL-MiniLM-L6-v2 model to generate real
          text embeddings for semantic search. The embeddings are used to find
          similar medical documents in the Turso vector database.
        </Text>
        <Text style={dynamicStyles.instructionsTextSpaced}>
          Try searching for medical topics like "heart disease", "diabetes
          treatment", or "cancer immunotherapy" to see how the semantic search
          works with real embeddings to find relevant documents.
        </Text>
      </View>
    </ScrollView>
  );
}
