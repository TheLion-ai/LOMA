import { AIService, AIMessage, AICompletionOptions, AICompletionResult } from './ai-service';

export class TransformersAIService implements AIService {
  private isInitialized = false;
  private isInitializing = false;
  private serverUrl = 'http://localhost:3002';

  constructor() {
    // This service now communicates with a Node.js server running Gemma 3n
  }

  async initialize(): Promise<void> {
    if (this.isInitializing || this.isInitialized) return;
    
    this.isInitializing = true;
    
    try {
      console.log('🔗 Connecting to Gemma 3n server...');
      
      // Check if the server is running and model is ready
      const response = await fetch(`${this.serverUrl}/status`);
      if (!response.ok) {
        throw new Error('Gemma 3n server is not running. Please start it with: node gemma-server.js');
      }
      
      const status = await response.json();
      console.log('📊 Server status:', status);
      
      if (status.loading) {
        console.log('⏳ Model is still loading on the server. Please wait...');
        // Wait for model to be ready
        await this.waitForModelReady();
      } else if (!status.ready) {
        throw new Error('Model failed to load on the server');
      }
      
      this.isInitialized = true;
      console.log('✅ Connected to Gemma 3n server successfully!');
      
    } catch (error) {
      console.error('❌ Failed to connect to Gemma 3n server:', error);
      throw new Error(`Gemma 3n server connection failed: ${error.message}. Make sure to run: node gemma-server.js`);
    } finally {
      this.isInitializing = false;
    }
  }

  private async waitForModelReady(): Promise<void> {
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`${this.serverUrl}/status`);
        const status = await response.json();
        
        if (status.ready) {
          console.log('✅ Model is now ready!');
          return;
        }
        
        if (!status.loading) {
          throw new Error('Model loading failed on server');
        }
        
        console.log('⏳ Still loading model... Please wait...');
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
      } catch (error) {
        console.log(`🔄 Waiting for Gemma server to start... (${Math.round((Date.now() - startTime) / 1000)}s)`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    throw new Error('Model loading timeout. Please check the server logs.');
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    if (!this.isInitialized) {
      throw new Error('TransformersAIService not initialized');
    }

    try {
      console.log('🤖 Sending request to Gemma 3n server...');
      
      const response = await fetch(`${this.serverUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: options.messages,
          maxTokens: options.maxTokens || 512,
          temperature: options.temperature || 0.7,
          topP: options.topP || 0.9,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Server request failed');
      }

      const result = await response.json();
      
      // Simulate token streaming if callback is provided
      if (options.onToken && result.text) {
        const words = result.text.split(' ');
        for (let i = 0; i < words.length; i++) {
          const token = i === 0 ? words[i] : ' ' + words[i];
          options.onToken(token);
          await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
        }
      }

      return {
        text: result.text,
        finishReason: result.finishReason || 'stop'
      };

    } catch (error) {
      console.error('❌ Error communicating with Gemma 3n server:', error.message);
      throw new Error(`Gemma 3n request failed: ${error.message}`);
    }
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.isInitializing = false;
    console.log('🧹 TransformersAIService cleaned up');
  }
}