import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Ionicons } from "@expo/vector-icons";
import { createAIService, EnhancedAIService } from "@/lib/ai-service";
import { ChatMessage, Chat as ChatType } from "@/lib/chat-storage";
import {
  getVectorSearchService,
  VectorSearchService,
  CombinedSearchResult,
} from "@/lib/vector-search-service";

interface ChatProps {
  activeChat: ChatType;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  onTitleChange: (title: string) => void;
}

export default function Chat({
  activeChat,
  messages,
  onMessagesChange,
  onTitleChange,
}: ChatProps) {
  const [inputText, setInputText] = useState("");
  const [isModelReady, setIsModelReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [aiService, setAIService] = useState<EnhancedAIService | null>(null);
  const [vectorSearchService, setVectorSearchService] =
    useState<VectorSearchService | null>(null);
  const [searchResults, setSearchResults] = useState<CombinedSearchResult[]>(
    []
  );
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    initializeServices();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isStreaming && !streamingMessage) {
      const interval = setInterval(() => {
        setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDotCount(1);
    }
  }, [isStreaming, streamingMessage]);

  // Monitor download progress for native platforms
  useEffect(() => {
    if (!aiService || Platform.OS === "web") return;

    const checkProgress = async () => {
      if (
        typeof (aiService as any).getDownloadProgress === "function" &&
        typeof (aiService as any).isDownloadingModel === "function"
      ) {
        const downloading = await (aiService as any).isDownloadingModel();
        setIsDownloading(downloading);

        if (downloading) {
          const progress = await (aiService as any).getDownloadProgress();
          setDownloadProgress(progress);
        }
      }
    };

    const interval = setInterval(checkProgress, 500);
    return () => clearInterval(interval);
  }, [aiService]);

  const initializeServices = async (): Promise<void> => {
    try {
      console.log("Initializing services for platform:", Platform.OS);

      // Create and initialize AI service
      const service = await createAIService();
      setAIService(service);

      // For native platforms, check if model needs downloading
      if (
        Platform.OS !== "web" &&
        typeof (service as any).isDownloadingModel === "function"
      ) {
        const downloading = await (service as any).isDownloadingModel();
        setIsDownloading(downloading);
      }

      // Initialize the AI service
      await service.initialize();

      // Initialize vector search service
      try {
        const vectorService = getVectorSearchService();
        await vectorService.initialize();
        setVectorSearchService(vectorService);
        console.log("Vector search service initialized successfully");
      } catch (vectorError) {
        console.warn(
          "Vector search service initialization failed:",
          vectorError
        );
        // Continue without vector search - not critical for basic chat
      }

      setIsModelReady(true);
      setIsDownloading(false);
      console.log("All services initialized successfully");

      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          role: "assistant",
          content:
            Platform.OS === "web"
              ? "Hello! I'm Gemma 3n-E2B running with Transformers.js in your browser. How can I help you today?"
              : `Hello! I'm Gemma 3n-E2B, your AI assistant running natively on ${Platform.OS} with vector search capabilities. How can I help you today?`,
        };
        onMessagesChange([welcomeMessage]);
      }
    } catch (error) {
      console.error("Error initializing services:", error);

      // Fallback to mock mode
      setIsModelReady(true);
      setIsDownloading(false);

      if (messages.length === 0) {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content:
            Platform.OS === "web"
              ? "Hello! I'm Gemma 3n-E2B running in demo mode. The AI model failed to load, but you can still test the chat interface!"
              : "Hello! I'm Gemma 3n-E2B running in demo mode. There was an issue loading the AI model. You can still test the interface, but responses will be simulated.",
        };
        onMessagesChange([errorMessage]);
      }
    }
  };

  const cleanup = async () => {
    try {
      if (aiService) {
        await aiService.cleanup();
      }
      if (vectorSearchService) {
        await vectorSearchService.cleanup();
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  };

  const performVectorSearch = async (
    query: string
  ): Promise<CombinedSearchResult[]> => {
    if (!vectorSearchService || !vectorSearchService.isReady()) {
      return [];
    }

    try {
      const results = await vectorSearchService.search({
        query,
        limit: 3,
        threshold: 0.7,
        searchType: "both",
      });
      return results;
    } catch (error) {
      console.warn("Vector search failed:", error);
      return [];
    }
  };

  const generateTitle = async (chatContent: ChatMessage[]) => {
    if (!aiService || !aiService.isReady()) return;

    const filteredContent = chatContent.filter((message, index) => {
      // Exclude the first message if it's from the assistant (welcome message)
      return !(index === 0 && message.role === "assistant");
    });

    try {
      const result = await aiService.complete({
        messages: [
          ...filteredContent,
          {
            role: "user",
            content:
              "Based on our conversation, suggest a short, concise title for this chat. Respond with only the title, and nothing else.",
          },
        ],
        maxTokens: 20,
      });
      onTitleChange(result.text.trim().replace(/[^a-zA-Z0-9\s]/g, ""));
    } catch (error) {
      console.error("Failed to generate title", error);
    }
  };

  const cleanupStreamingState = () => {
    setIsStreaming(false);
    setStreamingMessage("");
  };

  const sendMessage = async (): Promise<void> => {
    if (!inputText.trim() || !isModelReady || isStreaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputText.trim(),
    };

    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInputText("");

    try {
      let responseText: string;

      setStreamingMessage("");
      setIsStreaming(true);

      // Check if we have an AI service available
      if (!aiService || !aiService.isReady()) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockResponses = [
          "I'm running in demo mode. For full AI functionality, the model needs to be properly loaded!",
          "This is a demo response. The actual AI model would provide more intelligent responses.",
          "Thanks for testing the interface! In full mode, I'd use the Gemma 3n model.",
          "Demo mode is active. The real AI would analyze your message and respond appropriately.",
          "This chat interface is working! With the AI model loaded, you'd get real responses.",
        ];

        responseText =
          mockResponses[Math.floor(Math.random() * mockResponses.length)];
      } else {
        // Perform vector search to provide context
        const searchResults = await performVectorSearch(userMessage.content);
        setSearchResults(searchResults);

        // Build context from search results
        let contextMessage = "";
        if (searchResults.length > 0) {
          contextMessage = "Based on relevant medical information:\n\n";
          searchResults.forEach((result, index) => {
            contextMessage += `${index + 1}. ${
              result.title
            }: ${result.content.substring(0, 200)}...\n\n`;
          });
          contextMessage +=
            "Please provide a response based on this context and your medical knowledge.\n\n";
        }

        // Prepare messages with context if available
        const messagesWithContext = contextMessage
          ? [
              ...newMessages.slice(0, -1), // All messages except the last user message
              {
                role: "system" as const,
                content: contextMessage,
              },
              userMessage, // Add the user message after context
            ]
          : newMessages.map((msg) => ({
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
            }));

        // Real AI response using the modular service with streaming
        const result = await aiService.complete({
          messages: messagesWithContext,
          maxTokens: 150,
          temperature: 0.6,
          topP: 0.9,
          stopWords: [
            "<end_of_turn>",
            "<|end_of_turn|>",
            "</s>",
            "<eos>",
            "<|endoftext|>",
            "<|end|>",
            "<|eot_id|>",
            "<|end_of_text|>",
            "<|im_end|>",
            "<|EOT|>",
            "<|END_OF_TURN_TOKEN|>",
            "\n\n\n",
            "Human:",
            "User:",
          ],
          onToken: (token) => {
            setStreamingMessage((prev) => prev + token);
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 10);
          },
        });

        responseText = result.text || streamingMessage;

        // Additional fallback if response is empty
        if (!responseText || responseText.length < 3) {
          responseText =
            "I apologize, but I'm having trouble generating a proper response. Could you please rephrase your question?";
        }
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: responseText,
      };

      const finalMessages = [...newMessages, assistantMessage];
      onMessagesChange(finalMessages);

      if (activeChat.title === "New chat") {
        generateTitle(finalMessages);
      }
    } catch (error) {
      console.error("Error generating response:", error);

      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your message. Please try again.",
      };
      onMessagesChange([...newMessages, errorMessage]);
    } finally {
      cleanupStreamingState();
    }
  };

  if (isDownloading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="download-outline"
          size={64}
          color="#3B82F6"
          style={styles.icon}
        />
        <Text style={styles.title}>Downloading Gemma 3n Model</Text>
        <Text style={styles.subtitle}>This may take a few minutes...</Text>
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBar, { width: `${downloadProgress}%` }]}
          />
        </View>
        <Text style={styles.progressText}>{downloadProgress}%</Text>
      </View>
    );
  }

  if (!isModelReady) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={64}
          color="#3B82F6"
          style={styles.icon}
        />
        <Text style={styles.title}>Initializing AI Model</Text>
        <Text style={styles.subtitle}>
          Please wait while we set up Gemma 3n...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons
            name="chatbubble-ellipses"
            size={32}
            color="white"
            style={styles.headerIcon}
          />
          <View>
            <Text style={styles.headerTitle}>Gemma 3n Chat</Text>
            <Text style={styles.headerSubtitle}>AI Assistant</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>
              📚 Relevant Medical Information:
            </Text>
            {searchResults.map((result, index) => (
              <View key={result.id} style={styles.searchResultItem}>
                <Text style={styles.searchResultType}>
                  {result.type === "document" ? "📄" : "❓"}{" "}
                  {result.type.toUpperCase()}
                </Text>
                <Text style={styles.searchResultTitle}>{result.title}</Text>
                <Text style={styles.searchResultContent}>
                  {result.content.substring(0, 150)}...
                </Text>
                <Text style={styles.searchResultSimilarity}>
                  Relevance: {(result.similarity * 100).toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {messages.map((message, index) => (
          <View key={index} style={styles.messageWrapper}>
            <View
              style={[
                styles.messageRow,
                message.role === "user" ? styles.userRow : styles.assistantRow,
              ]}
            >
              <View
                style={[
                  styles.messageContent,
                  message.role === "user"
                    ? styles.userContent
                    : styles.assistantContent,
                ]}
              >
                <View style={styles.avatarContainer}>
                  <Avatar style={styles.avatar}>
                    {message.role === "user" ? (
                      <Ionicons name="person" size={20} color="#10B981" />
                    ) : (
                      <Ionicons
                        name="chatbubble-ellipses"
                        size={20}
                        color="#3B82F6"
                      />
                    )}
                  </Avatar>
                </View>
                <View
                  style={[
                    styles.messageBubble,
                    message.role === "user"
                      ? styles.userBubble
                      : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.role === "user"
                        ? styles.userText
                        : styles.assistantText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {isStreaming && (
          <View style={styles.messageWrapper}>
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View style={[styles.messageContent, styles.assistantContent]}>
                <View style={styles.avatarContainer}>
                  <Avatar style={styles.avatar}>
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={20}
                      color="#3B82F6"
                    />
                  </Avatar>
                </View>
                <View
                  style={[
                    styles.messageBubble,
                    styles.assistantBubble,
                    styles.streamingBubble,
                  ]}
                >
                  <Text style={[styles.messageText, styles.assistantText]}>
                    {streamingMessage || ".".repeat(dotCount)}
                    {streamingMessage && <Text style={styles.cursor}>▊</Text>}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <Separator />

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || isStreaming}
            style={[
              styles.sendButton,
              (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
            ]}
          >
            <Ionicons name="send" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  progressBarContainer: {
    width: "100%",
    maxWidth: 300,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3B82F6",
  },
  progressText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  header: {
    backgroundColor: "#3B82F6",
    padding: 16,
    paddingTop: 48,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "#BFDBFE",
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageRow: {
    flexDirection: "row",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  messageContent: {
    flexDirection: "row",
    maxWidth: "80%",
  },
  userContent: {
    flexDirection: "row-reverse",
  },
  assistantContent: {
    flexDirection: "row",
  },
  avatarContainer: {
    marginHorizontal: 8,
  },
  avatar: {
    width: 32,
    height: 32,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: "#3B82F6",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  streamingBubble: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cursor: {
    color: "#3B82F6",
    fontWeight: "bold",
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: "white",
  },
  assistantText: {
    color: "#1F2937",
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: "#BFDBFE",
  },
  assistantTimestamp: {
    color: "#6B7280",
  },
  inputContainer: {
    padding: 16,
    backgroundColor: "white",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  // Search Results Styles
  searchResultsContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  searchResultItem: {
    backgroundColor: "white",
    padding: 10,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchResultType: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  searchResultContent: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 16,
    marginBottom: 4,
  },
  searchResultSimilarity: {
    fontSize: 11,
    color: "#3B82F6",
    fontWeight: "500",
  },
});
