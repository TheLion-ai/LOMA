# LOMA - Local Offline Medical Assistant

A React Native medical AI assistant powered by Gemma 3n with RAG (Retrieval-Augmented Generation) capabilities for accurate medical information retrieval. LOMA runs entirely offline on iOS and Android devices, providing privacy-focused medical assistance with a comprehensive medical knowledge database.

## Features

- **🏥 Medical Knowledge Base**: Pre-loaded database with 500k+ medical Q&A pairs and documents
- **🔍 RAG System**: Retrieval-Augmented Generation for contextually accurate medical responses
- **📱 Mobile-First**: Optimized for iOS and Android with on-device AI inference
- **🔒 Privacy-Focused**: Completely offline operation - no data leaves your device
- **🧠 Advanced AI**: Gemma 3n language model with medical context injection
- **⚡ Vector Search**: Semantic search using ALL_MINILM_L6_V2 embeddings for relevant medical information
- **💾 Local Database**: SQLite database with vector similarity search capabilities
- **🎯 Specialized Search**: Filter by medical specialty, publication year, and relevance
- **📚 Source Citations**: Automatic citation of medical sources in AI responses

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Expo CLI
- iOS Simulator (for iOS development) or physical iOS device
- Android Studio (for Android development) or physical Android device
- **Note**: Web platform is not supported - LOMA is designed for mobile devices only

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running LOMA

LOMA is designed exclusively for iOS and Android devices with on-device AI inference:

1. **Start the development server**:
   ```bash
   npm start
   ```

2. **Choose your platform**:
   - Press `i` for iOS simulator or device
   - Press `a` for Android emulator or device

3. **First Launch Setup** (automatic):
   - **Medical Database**: Downloads medical database (~500MB) containing 500k+ medical Q&A pairs
   - **AI Model**: Downloads Gemma 3n model (~4.79GB) for on-device inference
   - **Embedding Model**: Initializes ALL_MINILM_L6_V2 for vector search
   - **Database Indexing**: Sets up vector search capabilities

4. **Ready to Use**:
   - Ask medical questions and receive AI responses with cited sources
   - Browse medical database with semantic search
   - All processing happens locally on your device

## Technology Stack

### Core Framework
- **React Native**: Cross-platform mobile development (iOS/Android only)
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe development

### AI & Machine Learning
- **llama.rn**: React Native binding for llama.cpp (on-device inference)
- **react-native-executorch**: ExecuTorch integration for embedding models
- **Gemma 3n**: Google's lightweight language model optimized for mobile
- **ALL_MINILM_L6_V2**: Sentence transformer for text embeddings

### Database & Search
- **@op-engineering/op-sqlite**: High-performance SQLite with vector extensions
- **libSQL**: Vector database capabilities with cosine similarity search
- **Vector Indexing**: Optimized vector search with 384-dimensional embeddings

### RAG Architecture
- **Vector Search**: Semantic similarity search through medical knowledge base
- **Context Injection**: Dynamic context enhancement for AI responses
- **Source Citation**: Automatic medical source referencing
- **Query Enhancement**: Medical query understanding and expansion

### UI & UX
- **shadcn/ui**: Modern UI components
- **Lucide React**: Icon system
- **React Native Reanimated**: Smooth animations
- **Moti**: Animation library

## Medical AI Models & Database

LOMA uses specialized models optimized for medical assistance on mobile devices:

### Language Model (Gemma 3n)
- **Model**: gemma-3n-E2B-it-Q8_0.gguf
- **Format**: GGUF (GPT-Generated Unified Format)
- **Size**: ~4.79GB
- **Quantization**: Q8_0 (8-bit quantization for mobile optimization)
- **Purpose**: Medical question answering with context injection
- **Source**: Hugging Face (ggml-org/gemma-3n-E2B-it-GGUF)

### Embedding Model (ALL_MINILM_L6_V2)
- **Model**: ALL_MINILM_L6_V2 via ExecuTorch
- **Dimensions**: 384-dimensional vectors
- **Purpose**: Semantic search and similarity matching
- **Integration**: react-native-executorch for on-device inference
- **Performance**: Optimized for mobile vector generation



### Privacy & Security
- **100% Offline**: All AI processing happens locally on your device
- **No Data Transmission**: Medical queries and responses never leave your device
- **Local Storage**: Medical database and models stored securely on device
- **HIPAA-Friendly**: No cloud dependencies or data sharing
- **Secure by Design**: No user data collection or analytics

### System Requirements
- **iOS**: iOS 13.0+ with at least 6GB storage space
- **Android**: Android 8.0+ (API level 26) with at least 6GB storage space
- **RAM**: Minimum 6GB recommended for optimal performance
- **Storage**: 20GB free space for models and medical database

## How LOMA's RAG System Works

LOMA uses a sophisticated Retrieval-Augmented Generation (RAG) system to provide accurate medical information:

### 1. Query Processing
- User asks a medical question
- Question is converted to a 384-dimensional vector using ALL_MINILM_L6_V2
- Vector search finds semantically similar medical content

### 2. Knowledge Retrieval
- Searches through 500k+ medical Q&A pairs using cosine similarity
- Retrieves relevant medical documents and their associated Q&A
- Filters results by similarity threshold and relevance

### 3. Context Enhancement
- Selected medical content is formatted into context
- Context is injected into the AI prompt with proper citations
- Gemma 3n generates response using retrieved medical knowledge

### 4. Response Generation
- AI provides medically-informed answers with source citations
- Sources are automatically linked for verification
- Responses include relevant medical specialty and publication information

## Medical Disclaimer

⚠️ **IMPORTANT MEDICAL DISCLAIMER**

LOMA is designed as an educational and informational tool only. It is **NOT** intended to:
- Replace professional medical advice, diagnosis, or treatment
- Provide emergency medical assistance
- Substitute for consultation with qualified healthcare providers

**Always seek the advice of your physician or other qualified health provider** with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read in LOMA.

If you think you may have a medical emergency, call your doctor or emergency services immediately.

