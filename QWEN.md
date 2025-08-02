# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator/device  
- `npm run ios` - Run on iOS simulator/device
- `npm run web` - Start web development server

### Web Deployment
For web deployment, run both servers:
1. `node gemma-server.js` - Start Gemma 3n Node.js server (required for web)
2. `npm start` then press `w` - Start Expo web server

### Deployment
- `npm run deploy` - Export for web and deploy with EAS

## Architecture

This is a React Native chat application with dual AI backends optimized for different platforms:

### Platform-Specific AI Services
- **Web**: Uses Transformers.js with Node.js server (`gemma-server.js`) for ONNX model inference
- **Native (iOS/Android)**: Uses llama.rn for on-device GGUF model inference via `LlamaAIService`
- **Service Factory**: `createAIService()` in `src/lib/ai-service.ts` automatically selects appropriate backend

### Core Structure
- **App Shell**: Expo Router with file-based routing in `src/app/`
- **Components**: Reusable UI components in `src/components/` using shadcn/ui
- **Services**: AI backends and utilities in `src/lib/`
  - `ai-service.ts` - Service factory and interfaces
  - `llama-ai-service.ts` - Native AI backend  
  - `transformers-ai-service.ts` - Web AI backend
  - `chat-storage.ts` - Chat persistence
  - `turso-db-service.ts` - Database operations

### Model Management
- **Web**: Downloads ONNX models (~2.5GB) from Hugging Face on first run
- **Native**: Downloads GGUF models (~4.79GB) automatically on first launch
- Models cache in `model_cache/` directory

### UI Framework
- Uses shadcn/ui components with Tailwind CSS
- Custom theme with CSS custom properties for dark/light mode
- Path alias `@/*` maps to `src/*`

## Project Rules

From `.trae/rules/project_rules.md`:
- This is a local AI assistant using Gemma 3n on mobile devices
- Do not mock implementations - implement fully working features
- No fallback solutions
- Prioritize iOS compatibility
- Always reference library documentation when implementing features