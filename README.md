# Gemma 3n Chat App

A React Native chat application powered by Gemma 3n language model with dual AI backends for optimal performance across platforms.

## Features

- **Dual AI Backends**: 
  - **Web**: Transformers.js with Node.js server for browser compatibility
  - **Native**: llama.rn for on-device inference on iOS/Android
- **Local AI Chat**: Chat with Gemma 3n AI model running locally
- **Automatic Model Management**: Handles model downloading and initialization
- **Modern UI**: Clean and intuitive chat interface built with shadcn/ui components
- **Cross-Platform**: Works on iOS, Android, and Web with platform-optimized AI backends

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running on Web (Transformers.js Backend)

For web deployment, you need to run both the Expo dev server and the Gemma 3n Node.js server:

1. **Start the Gemma 3n server** (in one terminal):
   ```bash
   node gemma-server.js
   ```
   This will:
   - Download the ONNX model files (~2.5GB) on first run
   - Initialize the Gemma 3n model with Transformers.js
   - Start the server on `http://localhost:3002`

2. **Start the Expo development server** (in another terminal):
   ```bash
   npm start
   ```

3. **Open in browser**:
   - Press `w` for web browser
   - The app will connect to the local Gemma server automatically

### Running on Native (llama.rn Backend)

For iOS and Android, the app uses llama.rn for on-device inference:

1. Start the development server:
   ```bash
   npm start
   ```

2. Choose your platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

3. On first launch, the app will:
   - Download the GGUF model (~4.79GB) automatically
   - Initialize the AI model on-device
   - Present you with a chat interface

## Technology Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **AI Backends**:
  - **Web**: Transformers.js + Node.js server with ONNX Runtime
  - **Native**: llama.rn (React Native binding for llama.cpp)
- **Gemma 3n**: Google's lightweight language model
- **shadcn/ui**: Modern UI components
- **TypeScript**: Type-safe development

## Model Information

This app uses different model formats optimized for each platform:

### Web Backend (Transformers.js)
- **Model**: onnx-community/gemma-3n-E2B-it-ONNX
- **Format**: ONNX with quantized weights
- **Size**: ~2.5GB total
- **Components**:
  - `embed_tokens_q8.onnx`
  - `vision_encoder_fp16.onnx` 
  - `decoder_model_merged_q4.onnx`
  - `audio_encoder_q8.onnx`
- **Source**: Hugging Face ONNX Community

### Native Backend (llama.rn)
- **Model**: gemma-3n-E2B-it-Q8_0.gguf
- **Format**: GGUF (GPT-Generated Unified Format)
- **Size**: ~4.79GB
- **Quantization**: Q8_0 (8-bit quantization)
- **Source**: Hugging Face (ggml-org/gemma-3n-E2B-it-GGUF)

## Performance Notes

### Web Performance
- Runs in browser using WebAssembly and WebGL acceleration
- Model loads in ~30-60 seconds on first run
- Response generation: 10-30 seconds depending on browser and hardware
- Requires stable internet connection for initial model download

### Native Performance
- Runs entirely on-device for maximum privacy
- Initial model loading: 30-60 seconds
- Response generation: 5-15 seconds depending on device capabilities
- GPU acceleration available on supported devices
- No internet required after initial setup

## License

This project is licensed under the MIT License.
