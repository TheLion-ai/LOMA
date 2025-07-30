# Gemma 3n Chat App

A React Native chat application powered by Gemma 3n language model using llama.rn.

## Features

- **Local AI Chat**: Chat with Gemma 3n AI model running locally on your device
- **Automatic Model Download**: The app automatically downloads the Gemma 3n model (4.79GB) on first launch
- **Modern UI**: Clean and intuitive chat interface built with shadcn/ui components
- **Cross-Platform**: Works on iOS, Android, and Web

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

3. Start the development server:
   ```bash
   npm start
   ```

4. Choose your platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser

### First Launch

On the first launch, the app will:
1. Download the Gemma 3n model (~4.79GB) - this may take several minutes
2. Initialize the AI model
3. Present you with a chat interface

## Technology Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **llama.rn**: React Native binding for llama.cpp
- **Gemma 3n**: Google's lightweight language model
- **shadcn/ui**: Modern UI components
- **TypeScript**: Type-safe development

## Model Information

This app uses the Gemma 3n E2B model in GGUF format:
- **Model**: gemma-3n-E2B-it-Q8_0.gguf
- **Size**: ~4.79GB
- **Source**: Hugging Face (ggml-org/gemma-3n-E2B-it-GGUF)
- **Quantization**: Q8_0 (8-bit quantization for good performance/quality balance)

## Performance Notes

- The model runs entirely on-device for privacy
- Initial model loading may take 30-60 seconds
- Response generation typically takes 5-15 seconds depending on device capabilities
- GPU acceleration is available on supported devices

## License

This project is licensed under the MIT License.
