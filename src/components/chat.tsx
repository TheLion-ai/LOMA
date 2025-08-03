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
import { createAIService, AIService } from "@/lib/ai-service";
import { ChatMessage, Chat as ChatType } from "@/lib/chat-storage";
import { getRAGService } from "@/lib/rag-service";
import { RAGSearchStatus, Source } from "@/types/rag";

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
  const [aiService, setAIService] = useState<AIService | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [dotCount, setDotCount] = useState(1);

  // RAG state
  const [ragStatus, setRAGStatus] = useState<RAGSearchStatus>({
    phase: "idle",
    message: "",
    isLoading: false,
  });
  const [lastSources, setLastSources] = useState<Source[]>([]);

  useEffect(() => {
    initializeAI();

    // Cleanup on unmount
    return () => {
      if (aiService) {
        aiService.cleanup();
      }
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

  const initializeAI = async (): Promise<void> => {
    try {
      console.log("Initializing AI service for platform:", Platform.OS);

      // Create the appropriate AI service
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

      // Initialize the service
      await service.initialize();

      setIsModelReady(true);
      setIsDownloading(false);
      console.log("AI service initialized successfully");

      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          role: "assistant",
          content:
            Platform.OS === "web"
              ? "Hello! I'm Gemma 3n running with Transformers.js in your browser. How can I help you today?"
              : `Hello! I'm Gemma 3n, your AI assistant running natively on ${Platform.OS}. How can I help you today?`,
        };
        onMessagesChange([welcomeMessage]);
      }
    } catch (error) {
      console.error("Error initializing AI service:", error);

      // Fallback to mock mode
      setIsModelReady(true);
      setIsDownloading(false);

      if (messages.length === 0) {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content:
            Platform.OS === "web"
              ? "Hello! I'm running in demo mode. The AI model failed to load, but you can still test the chat interface!"
              : "Hello! I'm running in demo mode. There was an issue loading the AI model. You can still test the interface, but responses will be simulated.",
        };
        onMessagesChange([errorMessage]);
      }
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
    const userQuery = inputText.trim();

    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInputText("");

    try {
      let responseText: string;
      let sources: Source[] = [];

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
        // RAG-enhanced AI response
        console.log("🔍 Starting RAG-enhanced response generation...");

        // Phase 1: Search knowledge base
        setRAGStatus({
          phase: "searching",
          message: "Searching medical knowledge base...",
          isLoading: true,
        });

        const ragService = getRAGService();
        let ragResult;

        try {
          ragResult = await ragService.searchAndEnhanceQuery(userQuery);
          console.log(
            `📊 RAG search completed. Success: ${ragResult.success}, Sources: ${ragResult.sources.length}`
          );
        } catch (ragError) {
          console.warn(
            "⚠️ RAG search failed, continuing with normal chat:",
            ragError
          );
          ragResult = {
            success: false,
            searchResults: {
              documents: [],
              qaData: [],
              totalResults: 0,
              averageSimilarity: 0,
            },
            context: "",
            sources: [],
            error:
              ragError instanceof Error ? ragError.message : String(ragError),
          };
        }

        // Phase 2: Generate AI response with context
        setRAGStatus({
          phase: "processing",
          message: ragResult.success
            ? `Found ${ragResult.sources.length} relevant sources. Generating response...`
            : "No relevant sources found. Generating general response...",
          isLoading: true,
        });

        // Prepare messages for AI with context if available
        const aiMessages = newMessages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        }));

        const result = await aiService.complete({
          messages: aiMessages,
          context: ragResult.success ? ragResult.context : undefined,
          maxTokens: 200, // Increased for context-rich responses
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
        sources = ragResult.sources;

        // Additional fallback if response is empty
        if (!responseText || responseText.length < 3) {
          responseText =
            "I apologize, but I'm having trouble generating a proper response. Could you please rephrase your question?";
        }

        // Add sources to response if available
        if (sources.length > 0) {
          const sourcesText = ragService.formatSourcesForDisplay(sources);
          responseText += sourcesText;
        }
      }

      // Update RAG status
      setRAGStatus({
        phase: "complete",
        message:
          sources.length > 0
            ? `Response generated with ${sources.length} sources`
            : "Response generated",
        isLoading: false,
      });

      // Store sources for display
      setLastSources(sources);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: responseText,
      };

      const finalMessages = [...newMessages, assistantMessage];
      onMessagesChange(finalMessages);

      if (activeChat.title === "New chat") {
        generateTitle(finalMessages);
      }

      // Reset RAG status after a delay
      setTimeout(() => {
        setRAGStatus({
          phase: "idle",
          message: "",
          isLoading: false,
        });
      }, 3000);
    } catch (error) {
      console.error("Error generating response:", error);

      setRAGStatus({
        phase: "error",
        message: "Error generating response",
        isLoading: false,
      });

      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your message. Please try again.",
      };
      onMessagesChange([...newMessages, errorMessage]);

      // Reset RAG status after error
      setTimeout(() => {
        setRAGStatus({
          phase: "idle",
          message: "",
          isLoading: false,
        });
      }, 5000);
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
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
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

        {ragStatus.isLoading && (
          <View style={styles.messageWrapper}>
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View style={[styles.messageContent, styles.assistantContent]}>
                <View style={styles.avatarContainer}>
                  <Avatar style={styles.avatar}>
                    <Ionicons name="search" size={20} color="#8B5CF6" />
                  </Avatar>
                </View>
                <View style={[styles.messageBubble, styles.ragStatusBubble]}>
                  <Text style={[styles.messageText, styles.ragStatusText]}>
                    {ragStatus.message}
                    <Text style={styles.cursor}>▊</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

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
  ragStatusBubble: {
    backgroundColor: "#F3E8FF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  ragStatusText: {
    color: "#7C3AED",
    fontStyle: "italic",
  },
});
