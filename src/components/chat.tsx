import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Text, Alert, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

// Platform-specific imports
let initLlama: any = null;
let RNFS: any = null;

console.log('Platform.OS:', Platform.OS); // Debug platform detection

if (Platform.OS !== 'web') {
  try {
    const llamaModule = require('llama.rn');
    initLlama = llamaModule.initLlama;
    console.log('llama.rn loaded successfully');
  } catch (error) {
    console.log('llama.rn not available:', error);
  }
  
  try {
    RNFS = require('react-native-fs');
    console.log('react-native-fs loaded successfully');
  } catch (error) {
    console.log('react-native-fs not available, using expo-file-system');
  }
} else {
  console.log('Running on web platform, skipping native modules');
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatProps {}

const GEMMA_MODEL_URL = 'https://huggingface.co/ggml-org/gemma-3n-E2B-it-GGUF/resolve/main/gemma-3n-E2B-it-Q8_0.gguf';
const MODEL_FILENAME = 'gemma-3n-E2B-it-Q8_0.gguf';

export default function Chat({}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [llamaContext, setLlamaContext] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeModel();
  }, []);

  const downloadModel = async (modelPath: string): Promise<void> => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      
      console.log('Starting model download...');
      console.log('From:', GEMMA_MODEL_URL);
      console.log('To:', modelPath);
      
      if (RNFS) {
        // Use react-native-fs for native platforms
        const downloadResult = await RNFS.downloadFile({
          fromUrl: GEMMA_MODEL_URL,
          toFile: modelPath,
          progress: (res: any) => {
            const progress = (res.bytesWritten / res.contentLength) * 100;
            setDownloadProgress(Math.round(progress));
            console.log(`Download progress: ${Math.round(progress)}%`);
          },
          progressInterval: 1000,
        }).promise;

        if (downloadResult.statusCode === 200) {
          console.log('Model downloaded successfully');
          setIsDownloading(false);
          return;
        } else {
          throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
        }
      } else {
        // Fallback to expo-file-system
        const downloadResumable = FileSystem.createDownloadResumable(
          GEMMA_MODEL_URL,
          modelPath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setDownloadProgress(Math.round(progress * 100));
          }
        );

        const result = await downloadResumable.downloadAsync();
        if (result) {
          console.log('Model downloaded successfully');
          setIsDownloading(false);
          return;
        }
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading model:', error);
      setIsDownloading(false);
      Alert.alert(
        'Download Failed',
        'Failed to download the model. Please check your internet connection and try again.',
        [
          {
            text: 'Retry',
            onPress: () => downloadModel(modelPath),
          },
          { text: 'Cancel' },
        ]
      );
      throw error;
    }
  };

  const initializeModel = async (): Promise<void> => {
    try {
      console.log('Initializing model, Platform.OS:', Platform.OS, 'initLlama available:', !!initLlama);
      
      // Check if llama.rn is available (not on web)
      if (!initLlama) {
        console.log('llama.rn not available, using mock responses');
        setIsModelReady(true);
        
        // Add welcome message based on platform
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: Platform.OS === 'web' 
            ? 'Hello! I\'m running in web mode. The full AI functionality requires a native mobile app. However, you can still test the chat interface!'
            : `Hello! I'm running on ${Platform.OS} but llama.rn is not available. This might be a configuration issue. Please check the installation.`,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        return;
      }

      setIsInitializing(true);
      
      // Use the appropriate document directory
      const documentDir = RNFS ? RNFS.DocumentDirectoryPath : FileSystem.documentDirectory;
      const modelPath = RNFS 
        ? `${documentDir}/gemma-3n-E2B-it-Q8_0.gguf`
        : `${documentDir}gemma-3n-E2B-it-Q8_0.gguf`;
      
      console.log('Model path:', modelPath);

      // Use the appropriate file system to check model existence
      let modelExists = false;
      if (RNFS) {
        modelExists = await RNFS.exists(modelPath);
      } else {
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        modelExists = fileInfo.exists;
      }
      
      if (!modelExists) {
        console.log('Model not found, downloading...');
        await downloadModel(modelPath);
      } else {
        console.log('Model already exists');
      }

      console.log('Initializing Llama context...');
      const context = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 99, // Use GPU acceleration
      });

      setLlamaContext(context);
      setIsModelReady(true);
      console.log('Model initialized successfully');

      // Add welcome message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hello! I'm Gemma 3n, your AI assistant running natively on ${Platform.OS}. How can I help you today?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error initializing model:', error);
      Alert.alert('Initialization Error', 'Failed to initialize the AI model. Please restart the app.');
    } finally {
      setIsInitializing(false);
    }
  };

  const sendMessage = async (): Promise<void> => {
    if (!inputText.trim() || !isModelReady) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      let responseText: string;

      // Check if we're running with actual llama.rn or in web mode
      if (!initLlama || !llamaContext) {
        // Mock response for web
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
        
        const mockResponses = [
          "I'm running in web preview mode. For full AI functionality, please use the mobile app!",
          "This is a demo response. The actual AI model runs on mobile devices.",
          "Thanks for testing the interface! The real Gemma 3n model would provide more intelligent responses.",
          "In mobile mode, I would use the actual Gemma 3n model to generate responses.",
          "This chat interface is working! On mobile, you'd get real AI responses."
        ];
        
        responseText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      } else {
        // Real AI response - Gemma-specific configuration
        const stopWords = [
          '<end_of_turn>',
          '<|end_of_turn|>',
          '</s>',
          '<eos>',
          '<|endoftext|>',
          '<|end|>',
          '<|eot_id|>',
          '<|end_of_text|>',
          '<|im_end|>',
          '<|EOT|>',
          '<|END_OF_TURN_TOKEN|>',
          '\n\n\n',
          'Human:',
          'User:'
        ];
        
        const result = await llamaContext.completion(
          {
            messages: [
              {
                role: 'system',
                content: 'You are Gemma, a helpful and friendly AI assistant. Respond in a conversational and helpful manner. Always end your responses naturally without repeating end tokens.',
              },
              ...messages.map(msg => ({
                role: msg.role,
                content: msg.content,
              })),
              {
                role: 'user',
                content: userMessage.content,
              },
            ],
            n_predict: 150, // Reduced to prevent runaway generation
            stop: stopWords,
            temperature: 0.6, // Slightly lower temperature for more controlled output
            top_p: 0.9,
            repeat_penalty: 1.1, // Prevent repetition
            frequency_penalty: 0.1,
          },
          (data) => {
            // Partial completion callback - could be used for streaming
            console.log('Partial token:', data.token);
          }
        );

        responseText = result.text.trim();
        
        // Post-process to remove any remaining end tokens that might have slipped through
        const endTokensToRemove = [
          '<end_of_turn>',
          '<|end_of_turn|>',
          '</s>',
          '<eos>',
          '<|endoftext|>',
          '<|end|>',
          '<|eot_id|>',
          '<|end_of_text|>',
          '<|im_end|>',
          '<|EOT|>',
          '<|END_OF_TURN_TOKEN|>'
        ];
        
        // Remove any end tokens from the response
        for (const token of endTokensToRemove) {
          responseText = responseText.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        }
        
        // Remove excessive whitespace and newlines
        responseText = responseText.replace(/\n{3,}/g, '\n\n').trim();
        
        // If the response is empty or only contains end tokens, provide a fallback
        if (!responseText || responseText.length < 3) {
          responseText = "I apologize, but I'm having trouble generating a proper response. Could you please rephrase your question?";
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDownloading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="download-outline" size={64} color="#3B82F6" style={styles.icon} />
        <Text style={styles.title}>Downloading Gemma 3n Model</Text>
        <Text style={styles.subtitle}>This may take a few minutes...</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>{downloadProgress}%</Text>
      </View>
    );
  }

  if (!isModelReady) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={64} color="#3B82F6" style={styles.icon} />
        <Text style={styles.title}>Initializing AI Model</Text>
        <Text style={styles.subtitle}>Please wait while we set up Gemma 3n...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="chatbubble-ellipses" size={32} color="white" style={styles.headerIcon} />
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
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View key={message.id} style={styles.messageWrapper}>
            <View style={[styles.messageRow, message.role === 'user' ? styles.userRow : styles.assistantRow]}>
              <View style={[styles.messageContent, message.role === 'user' ? styles.userContent : styles.assistantContent]}>
                <View style={styles.avatarContainer}>
                  <Avatar style={styles.avatar}>
                    {message.role === 'user' ? (
                      <Ionicons name="person" size={20} color="#10B981" />
                    ) : (
                      <Ionicons name="chatbubble-ellipses" size={20} color="#3B82F6" />
                    )}
                  </Avatar>
                </View>
                <View style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.messageText, message.role === 'user' ? styles.userText : styles.assistantText]}>
                    {message.content}
                  </Text>
                  <Text style={[styles.timestamp, message.role === 'user' ? styles.userTimestamp : styles.assistantTimestamp]}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <Ionicons name="chatbubble-ellipses" size={20} color="#3B82F6" />
                  </Avatar>
                </View>
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <Text style={[styles.messageText, styles.assistantText]}>Thinking...</Text>
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
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
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
    backgroundColor: 'white',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    maxWidth: 300,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  header: {
    backgroundColor: '#3B82F6',
    padding: 16,
    paddingTop: 48,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#BFDBFE',
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
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  messageContent: {
    flexDirection: 'row',
    maxWidth: '80%',
  },
  userContent: {
    flexDirection: 'row-reverse',
  },
  assistantContent: {
    flexDirection: 'row',
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
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#BFDBFE',
  },
  assistantTimestamp: {
    color: '#6B7280',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});