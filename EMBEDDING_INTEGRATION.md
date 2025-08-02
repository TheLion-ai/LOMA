# ExecuTorch Embedding Integration

This document explains how ExecuTorch React Native has been integrated to replace the mock embedding service in the Turso database with real text embeddings.

## Overview

The integration uses ExecuTorch's `useTextEmbeddings` hook with the `ALL_MINILM_L6_V2` model to generate real text embeddings for semantic search in the medical database. This replaces the previous mock embedding generation with actual AI-powered embeddings.

## Key Components

### 1. Embedding Service (`src/lib/embedding-service.ts`)

Provides React hooks and a queued service for generating text embeddings:

- `useEmbeddingModel()`: React hook that initializes the ExecuTorch embedding model
- `useQueuedEmbeddingService()`: React hook that provides a queued embedding service
- `queuedEmbeddingService`: Global queued service that handles concurrent requests
- `generateEmbedding()`: Utility function to generate embeddings for single text
- `generateEmbeddings()`: Utility function to generate embeddings for multiple texts

### 2. Updated TursoDBService (`src/lib/turso-db-service.ts`)

The database service has been enhanced to:

- Accept an embedding model via `setEmbeddingModel()`
- Use real embeddings via the queued embedding service in `generateEmbedding()`
- Generate embeddings for search queries and document storage
- Handle concurrent requests safely through the queued service

### 3. Demo Component (`src/components/embedding-demo.tsx`)

A React component that demonstrates the integration:

- Shows model and database status
- Provides a search interface for medical documents and Q&A
- Displays search results with similarity scores
- Handles loading states and errors

## How It Works

1. **Model Initialization**: The `useEmbeddingModel()` hook initializes the ALL-MiniLM-L6-v2 model
2. **Queued Service**: The `queuedEmbeddingService` handles concurrent requests by queuing them
3. **Database Setup**: The TursoDBService uses the queued embedding service
4. **Document Storage**: When documents are added, real embeddings are generated from their content
5. **Search**: Search queries are converted to embeddings and compared with stored embeddings
6. **Results**: Similarity scores are calculated using cosine similarity

## Usage Example

```typescript
import { useQueuedEmbeddingService } from '../lib/embedding-service';
import { getTursoDBService } from '../lib/turso-db-service';

function MyComponent() {
  const embeddingService = useQueuedEmbeddingService();
  const dbService = getTursoDBService();

  useEffect(() => {
    if (embeddingService.isReady) {
      // The queued service is automatically set up
      console.log('Embedding service is ready');
    }
  }, [embeddingService.isReady]);

  const performSearch = async (query: string) => {
    const results = await dbService.searchMedicalDocuments({
      query,
      limit: 5,
      threshold: 0.7
    });
    return results;
  };
}
```

## Model Specifications

- **Model**: ALL-MiniLM-L6-v2
- **Dimensions**: 384
- **Max Tokens**: 256
- **Language**: English
- **Use Case**: General-purpose semantic similarity

## Performance Considerations

- **Model Size**: ~91MB (XNNPACK)
- **Memory Usage**: ~150MB (Android), ~190MB (iOS)
- **Inference Time**: ~53-78ms on modern devices
- **Concurrent Safety**: Queued requests prevent model conflicts

## Error Handling

The implementation includes comprehensive error handling:

- Model loading failures throw clear error messages
- Concurrent requests are queued to prevent conflicts
- Database errors are caught and reported
- Search failures show user-friendly error messages
- Network issues are handled gracefully

## Testing

To test the integration:

1. Navigate to the Search tab in the app
2. Wait for the embedding model to load (status will show "Ready")
3. Enter a medical search query (e.g., "heart disease", "diabetes treatment")
4. View the search results with similarity scores
5. Compare results with the previous mock implementation

## Benefits

- **Real Semantic Search**: Actual AI-powered embeddings provide meaningful similarity
- **Better Accuracy**: Real embeddings capture semantic meaning, not just random vectors
- **Concurrent Safety**: Queued service prevents model conflicts
- **Scalable**: Can handle various medical topics and queries
- **Maintainable**: Clean separation between embedding logic and database operations
- **No Fallbacks**: Pure AI embeddings without mock fallbacks

## Future Enhancements

- Support for multiple embedding models
- Batch embedding generation for better performance
- Caching of frequently used embeddings
- Support for other languages
- Fine-tuning for medical domain specificity 