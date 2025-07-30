const express = require('express');
const cors = require('cors');
const { AutoProcessor, AutoModelForImageTextToText } = require('@huggingface/transformers');

// Add process error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log the error
});

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

let model = null;
let processor = null;
let isLoading = false;
let isReady = false;

// Initialize the Gemma 3n model
async function initializeModel(retryCount = 0) {
  if (isLoading || isReady) return;
  
  const maxRetries = 3;
  isLoading = true;
  console.log('🚀 Starting Gemma 3n model initialization...');
  
  try {
    const model_id = "onnx-community/gemma-3n-E2B-it-ONNX";
    
    console.log('📦 Loading processor...');
    processor = await AutoProcessor.from_pretrained(model_id, {
      cache_dir: './model_cache',
      local_files_only: false  // Allow remote downloads if needed
    });
    
    console.log('🧠 Loading Gemma 3n model (this will take several minutes)...');
    model = await AutoModelForImageTextToText.from_pretrained(model_id, {
      dtype: {
        embed_tokens: "q8",
        audio_encoder: "q8", 
        vision_encoder: "fp16",
        decoder_model_merged: "q4",
      },
      device: "cpu",
      cache_dir: './model_cache'
    });
    
    isReady = true;
    isLoading = false;
    console.log('✅ Gemma 3n model loaded successfully!');
    console.log('🚀 Server is ready to accept requests at http://localhost:3002');
    
    // Keep the process alive
    setInterval(() => {
      console.log('💓 Server heartbeat - Model ready:', isReady);
    }, 30000); // Log every 30 seconds
  } catch (error) {
    console.error(`❌ Error initializing model (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
    isLoading = false;
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying in 10 seconds...`);
      setTimeout(() => {
        initializeModel(retryCount + 1);
      }, 10000);
    } else {
      console.error('❌ Failed to initialize model after all retries');
      throw error;
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    modelReady: isReady, 
    modelLoading: isLoading 
  });
});

// Model status endpoint
app.get('/status', (req, res) => {
  res.json({
    ready: isReady,
    loading: isLoading,
    model: isReady ? 'onnx-community/gemma-3n-E2B-it-ONNX' : null
  });
});

// Chat completion endpoint
app.post('/chat/completions', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ 
      error: 'Model not ready', 
      loading: isLoading 
    });
  }

  try {
    const { messages, maxTokens = 512, temperature = 0.7, topP = 0.9 } = req.body;

    console.log('📨 Received messages:', JSON.stringify(messages, null, 2));

    // Filter and format messages for Gemma 3n
    // Remove system messages and ensure proper alternation
    let filteredMessages = [];
    
    for (const msg of messages) {
      // Skip system messages as Gemma 3n doesn't handle them well
      if (msg.role === 'system') {
        console.log('⏭️ Skipping system message');
        continue;
      }
      
      // Add message with proper format for text-only conversations
      filteredMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    console.log('🔄 Filtered messages:', JSON.stringify(filteredMessages, null, 2));

    // Ensure proper alternation: user -> assistant -> user -> assistant...
    let properMessages = [];
    let started = false;
    let expectedRole = 'user';

    for (const msg of filteredMessages) {
      if (!started) {
        if (msg.role === 'user') {
          properMessages.push(msg);
          started = true;
          expectedRole = 'assistant';
        }
        // Skip leading assistant messages
        continue;
      }

      if (msg.role === expectedRole) {
        properMessages.push(msg);
        expectedRole = (expectedRole === 'user') ? 'assistant' : 'user';
      } else {
        // Skip messages that break alternation
        console.log(`⚠️ Skipping message that breaks alternation: ${msg.role}`);
      }
    }

    // Ensure we have at least one user message
    if (properMessages.length === 0) {
      return res.status(400).json({ 
        error: 'No valid messages found',
        message: 'Please provide at least one user message'
      });
    }

    // Ensure we end with a user message for generation
    if (properMessages[properMessages.length - 1].role !== 'user') {
      // Remove trailing assistant messages
      while (properMessages.length > 0 && properMessages[properMessages.length - 1].role !== 'user') {
        properMessages.pop();
      }
    }

    // Final validation
    if (properMessages.length === 0 || properMessages[properMessages.length - 1].role !== 'user') {
      return res.status(400).json({ 
        error: 'Invalid conversation format',
        message: 'Conversation must end with a user message'
      });
    }

    console.log('✅ Final formatted messages for Gemma 3n:', JSON.stringify(properMessages, null, 2));
    console.log('📝 Message count:', properMessages.length);

    // Apply chat template
    const prompt = processor.apply_chat_template(properMessages, {
      add_generation_prompt: true,
    });

    console.log('📝 Generated prompt preview:', prompt.substring(0, 200) + '...');

    // Prepare inputs
    const inputs = await processor(prompt, null, null, {
      add_special_tokens: false,
    });

    console.log('🤖 Generating response with Gemma 3n...');

    // Generate response
    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: maxTokens,
      do_sample: temperature > 0,
      temperature: temperature,
      top_p: topP,
    });

    // Decode response
    const decoded = processor.batch_decode(
      outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
      { skip_special_tokens: true }
    );

    let responseText = decoded[0] || '';
    
    // Clean up response
    responseText = responseText.trim();
    
    // Remove stop tokens
    const stopWords = [
      '<end_of_turn>', '<|end_of_turn|>', '</s>', '<eos>', 
      '<|endoftext|>', '<|end|>', '<|eot_id|>', '<|end_of_text|>',
      '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>'
    ];
    
    for (const stopWord of stopWords) {
      responseText = responseText.split(stopWord)[0];
    }

    console.log('✅ Generated response:', responseText.substring(0, 100) + '...');

    res.json({
      text: responseText,
      finishReason: 'stop'
    });

  } catch (error) {
    console.error('❌ Error generating response:', error);
    res.status(500).json({ 
      error: 'Generation failed', 
      message: error.message 
    });
  }
});

// Start server and initialize model
app.listen(port, () => {
  console.log(`🌟 Gemma 3n server running on http://localhost:${port}`);
  console.log('🔄 Initializing model...');
  initializeModel().catch(console.error);
});