import { Platform, Alert } from "react-native";
import {
  AIService,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  injectContext,
} from "./ai-service";

// Dynamic imports for native modules
let initLlama: any = null;
let RNFS: any = null;
let FileSystem: any = null;

// Load native modules conditionally
if (Platform.OS !== "web") {
  try {
    const llamaModule = require("llama.rn");
    initLlama = llamaModule.initLlama;
  } catch (error) {
    console.log("llama.rn not available:", error);
  }

  try {
    RNFS = require("react-native-fs");
  } catch (error) {
    console.log(
      "react-native-fs not available, falling back to expo-file-system"
    );
  }

  try {
    FileSystem = require("expo-file-system");
  } catch (error) {
    console.log("expo-file-system not available");
  }
}

const GEMMA_MODEL_URL =
  "https://huggingface.co/ggml-org/gemma-3n-E2B-it-GGUF/resolve/main/gemma-3n-E2B-it-Q8_0.gguf";
const MODEL_FILENAME = "gemma-3n-E2B-it-Q8_0.gguf";

export class LlamaAIService implements AIService {
  private llamaContext: any = null;
  private isInitialized = false;
  private isInitializing = false;
  private downloadProgress = 0;
  private isDownloading = false;

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    if (!initLlama) {
      throw new Error("llama.rn not available on this platform");
    }

    this.isInitializing = true;

    try {
      console.log("Initializing Llama AI service...");

      // Use the appropriate document directory
      const documentDir = RNFS
        ? RNFS.DocumentDirectoryPath
        : FileSystem?.documentDirectory;
      if (!documentDir) {
        throw new Error("No file system available");
      }

      const modelPath = RNFS
        ? `${documentDir}/${MODEL_FILENAME}`
        : `${documentDir}${MODEL_FILENAME}`;

      console.log("Model path:", modelPath);

      // Check if model exists
      let modelExists = false;
      if (RNFS) {
        modelExists = await RNFS.exists(modelPath);
      } else if (FileSystem) {
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        modelExists = fileInfo.exists;
      }

      if (!modelExists) {
        console.log("Model not found, downloading...");
        await this.downloadModel(modelPath);
      } else {
        console.log("Model already exists");
      }

      console.log("Initializing Llama context...");
      this.llamaContext = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 99, // Use GPU acceleration
      });

      this.isInitialized = true;
      console.log("Llama AI service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Llama AI service:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async downloadModel(modelPath: string): Promise<void> {
    try {
      this.isDownloading = true;
      this.downloadProgress = 0;

      console.log("Starting model download...");
      console.log("From:", GEMMA_MODEL_URL);
      console.log("To:", modelPath);

      if (RNFS) {
        // Use react-native-fs for native platforms
        const downloadResult = await RNFS.downloadFile({
          fromUrl: GEMMA_MODEL_URL,
          toFile: modelPath,
          progress: (res: any) => {
            this.downloadProgress =
              (res.bytesWritten / res.contentLength) * 100;
            console.log(
              `Download progress: ${Math.round(this.downloadProgress)}%`
            );
          },
          progressInterval: 1000,
        }).promise;

        if (downloadResult.statusCode === 200) {
          console.log("Model downloaded successfully");
          this.isDownloading = false;
          return;
        } else {
          throw new Error(
            `Download failed with status code: ${downloadResult.statusCode}`
          );
        }
      } else if (FileSystem) {
        // Fallback to expo-file-system
        const downloadResumable = FileSystem.createDownloadResumable(
          GEMMA_MODEL_URL,
          modelPath,
          {},
          (downloadProgress) => {
            this.downloadProgress =
              (downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite) *
              100;
            console.log(
              `Download progress: ${Math.round(this.downloadProgress)}%`
            );
          }
        );

        const result = await downloadResumable.downloadAsync();
        if (result) {
          console.log("Model downloaded successfully");
          this.isDownloading = false;
          return;
        }
        throw new Error("Download failed");
      } else {
        throw new Error("No file system available for download");
      }
    } catch (error) {
      console.error("Error downloading model:", error);
      this.isDownloading = false;
      throw error;
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.llamaContext !== null;
  }

  getDownloadProgress(): number {
    return this.downloadProgress;
  }

  isDownloadingModel(): boolean {
    return this.isDownloading;
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    if (!this.isReady()) {
      throw new Error("AI service not ready. Call initialize() first.");
    }

    try {
      // Inject context if provided
      const messages = injectContext(options.messages, options.context);

      if (options.context) {
        console.log(
          "📖 Context injected into conversation:",
          options.context.substring(0, 100) + "..."
        );
      }

      const stopWords = options.stopWords || [
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
      ];

      const result = await this.llamaContext.completion(
        {
          messages,
          n_predict: options.maxTokens || 150,
          stop: stopWords,
          temperature: options.temperature || 0.6,
          top_p: options.topP || 0.9,
          repeat_penalty: 1.1,
          frequency_penalty: 0.1,
        },
        (data: any) => {
          // Partial completion callback
          if (options.onToken) {
            options.onToken(data.token);
          }
        }
      );

      let responseText = result.text.trim();

      // Post-process to remove any remaining end tokens
      const endTokensToRemove = [
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
      ];

      for (const token of endTokensToRemove) {
        responseText = responseText.replace(
          new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
          ""
        );
      }

      // Remove excessive whitespace and newlines
      responseText = responseText.replace(/\n{3,}/g, "\n\n").trim();

      // If the response is empty or only contains end tokens, provide a fallback
      if (!responseText || responseText.length < 3) {
        responseText =
          "I apologize, but I'm having trouble generating a proper response. Could you please rephrase your question?";
      }

      return {
        text: responseText,
        finishReason: "stop",
      };
    } catch (error) {
      console.error("Error in Llama completion:", error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.llamaContext) {
      // Cleanup llama context if needed
      this.llamaContext = null;
    }
    this.isInitialized = false;
    console.log("Llama AI service cleaned up");
  }
}
