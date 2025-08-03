import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import {
  useQueuedEmbeddingService,
  useEmbeddingModel,
} from "../lib/embedding-service";
import {
  getTursoDBService,
  MedicalSearchOptions,
} from "../lib/turso-db-service";

/**
 * Demo component showing ExecuTorch embedding integration with TursoDBService
 */
export default function EmbeddingDemo() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<string>("Initializing...");
  const [dbStatus, setDbStatus] = useState<string>("Initializing...");

  // Initialize the embedding service and model
  const embeddingService = useQueuedEmbeddingService();
  const embeddingModel = useEmbeddingModel();

  // Initialize the database service
  const dbService = getTursoDBService();

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
      const searchOptions: MedicalSearchOptions = {
        query: searchQuery,
        limit: 5,
        threshold: 0.1,
      };

      console.log("Performing medical document search...");
      const documentResults = await dbService.searchMedicalDocuments(
        searchOptions
      );

      console.log("Performing medical Q&A search...");
      const qaResults = await dbService.searchMedicalQA(searchOptions);

      // Combine and format results
      const combinedResults = [
        ...documentResults.map((result) => ({
          type: "Document",
          title: result.document.title,
          content: result.document.content,
          similarity: result.similarity,
          specialty: result.document.specialty,
          year: result.document.year,
        })),
        ...qaResults.map((result) => ({
          type: "Q&A",
          title: result.qa.question,
          content: result.qa.answer,
          similarity: result.similarity,
          specialty: "N/A",
          year: "N/A",
        })),
      ].sort((a, b) => b.similarity - a.similarity);

      setSearchResults(combinedResults);
      console.log(`Found ${combinedResults.length} results`);
    } catch (error) {
      console.error("Search failed:", error);
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
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: "#f5f5f5" }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 16,
          color: "#333",
        }}
      >
        ExecuTorch Embedding Demo
      </Text>

      {/* Status Section */}
      <View
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 8,
            color: "#333",
          }}
        >
          Status
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 4, color: "#666" }}>
          Embedding Model: {modelStatus}
        </Text>
        <Text style={{ fontSize: 14, color: "#666" }}>
          Database: {dbStatus}
        </Text>
      </View>

      {/* Search Section */}
      <View
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 8,
            color: "#333",
          }}
        >
          Medical Search
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 16,
            backgroundColor: "#fafafa",
          }}
          placeholder="Enter your medical question or topic..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          multiline
          numberOfLines={3}
        />
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: embeddingModel.isReady ? "#007AFF" : "#ccc",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={performSearch}
            disabled={!embeddingModel.isReady || isLoading}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {isLoading ? "Searching..." : "Search"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: "#FF3B30",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={clearResults}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#FF9500",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={debugDocuments}
            disabled={isLoading}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Debug Documents
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Section */}
      {searchResults.length > 0 && (
        <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 8 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
              color: "#333",
            }}
          >
            Search Results ({searchResults.length})
          </Text>
          {searchResults.map((result, index) => (
            <View
              key={index}
              style={{
                borderWidth: 1,
                borderColor: "#eee",
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                backgroundColor: "#fafafa",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}
                >
                  {result.title || "Untitled"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: "#666", marginRight: 8 }}>
                    {result.type || "Unknown"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#007AFF",
                      fontWeight: "bold",
                    }}
                  >
                    {result.similarity
                      ? Math.round(result.similarity * 100)
                      : 0}
                    %
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>
                {result.content && result.content.length > 200
                  ? `${result.content.substring(0, 200)}...`
                  : result.content || "No content available"}
              </Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <Text style={{ fontSize: 12, color: "#999" }}>
                  Specialty: {result.specialty || "N/A"}
                </Text>
                <Text style={{ fontSize: 12, color: "#999" }}>
                  Year: {result.year || "N/A"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Instructions */}
      <View
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 8,
            color: "#333",
          }}
        >
          How it works
        </Text>
        <Text style={{ fontSize: 14, color: "#666", lineHeight: 20 }}>
          This demo uses ExecuTorch's ALL-MiniLM-L6-v2 model to generate real
          text embeddings for semantic search. The embeddings are used to find
          similar medical documents and Q&A pairs in the Turso vector database.
        </Text>
        <Text
          style={{ fontSize: 14, color: "#666", lineHeight: 20, marginTop: 8 }}
        >
          Try searching for medical topics like "heart disease", "diabetes
          treatment", or "cancer immunotherapy" to see how the semantic search
          works with real embeddings.
        </Text>
      </View>
    </ScrollView>
  );
}
