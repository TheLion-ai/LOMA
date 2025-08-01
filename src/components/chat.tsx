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
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Ionicons } from "@expo/vector-icons";
import { createAIService, AIService } from "@/lib/ai-service";
import { ChatMessage, Chat as ChatType } from "@/lib/chat-storage";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [aiService, setAIService] = useState<AIService | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeAI();

    // Cleanup on unmount
    return () => {
      if (aiService) {
        aiService.cleanup();
      }
    };
  }, []);

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
      setIsInitializing(true);
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
    } finally {
      setIsInitializing(false);
    }
  };

  const generateTitle = async (chatContent: ChatMessage[]) => {
    if (!aiService || !aiService.isReady()) return;

    try {
      const result = await aiService.complete({
        messages: [
          ...chatContent,
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

  const sendMessage = async (): Promise<void> => {
    if (!inputText.trim() || !isModelReady) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputText.trim(),
    };

    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInputText("");
    setIsLoading(true);

    try {
      let responseText: string;

      // Check if we have an AI service available
      if (!aiService || !aiService.isReady()) {
        // Mock response for demo mode
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate processing time

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
        // Real AI response using the modular service
        const result = await aiService.complete({
          messages: newMessages.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          })),
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
            console.log("Partial token:", token);
          },
        });

        responseText = result.text;

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
      setIsLoading(false);
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

        {isLoading && (
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
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <Text style={[styles.messageText, styles.assistantText]}>
                    Thinking...
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <Separator />

      {/* Input */}
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
            disabled={!inputText.trim() || isLoading}
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
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
});
