# Task: Implement RAG (Retrieval-Augmented Generation) for AI Chat

## Overview

Implement searching the vector database with the AI chat. It should work the same way as the default search, please reuse the methods from the current search, refactor them for modularity and reusability if necessary.

**Flow:**

1. User asks the question
2. Search using currently implemented search method in the vector database for the relevant articles
3. Find the questions and answers for those articles and take them from the database too
4. Add them to the context for the AI before it starts generating it, It will act as additional context for the AI to answer the user's question. We need to tell the AI model that we add those articles, and qa documents as context
5. The articles have urls that should be included in the response as sources

## Constraints

- You are not allowed to use mocks or shortcuts, it has to be a production ready code, fully working
- Refactor the code if needed, keep it clean, modular and concise

## Implementation Plan

### 1. Create RAG Service (`src/lib/rag-service.ts`)

**Purpose**: Central service to handle search + AI context injection
**Key features**:

- Search medical documents using existing `TursoDBService.searchMedicalDocuments()`
- Get related Q&A pairs using `TursoDBService.getQAByDocument()` for each found document
- Format context for AI injection
- Handle source URL collection and formatting
- Provide clean interface for chat integration

**Methods needed**:

- `searchAndEnhanceQuery(query: string): Promise<RAGResult>`
- `formatContextForAI(documents: DocumentSearchResult[], qaData: MedicalQA[]): string`
- `extractSources(documents: DocumentSearchResult[]): Source[]`

### 2. Modify Chat Component (`src/components/chat.tsx`)

**Changes needed**:

- Replace direct AI service calls with RAG-enhanced calls
- Add loading state for search phase ("Searching knowledge base...")
- Display sources in chat messages (clickable links if URLs available)
- Handle RAG errors gracefully (fallback to normal chat)

**Specific modifications**:

- Update `sendMessage()` function to use RAG service
- Add context injection before AI completion
- Format AI responses to include sources section
- Update UI to show search status

### 3. Extend AI Service Interface (`src/lib/ai-service.ts`)

**Add support for**:

- Context injection through system messages or message history
- Better prompt formatting for RAG scenarios
- Source citation in responses

**New interface methods**:

- `completeWithContext(options: AICompletionOptions & { context?: string }): Promise<AICompletionResult>`

### 4. Create Search Utilities (`src/lib/search-utils.ts`)

**Purpose**: Reusable search logic extracted from existing components
**Functions**:

- `performMedicalSearch(query: string, options?: SearchOptions): Promise<CombinedSearchResult>`
- `combineSearchResults(docResults: DocumentSearchResult[], qaResults: QASearchResult[]): CombinedSearchResult`
- `formatSearchResultsForDisplay(results: CombinedSearchResult): FormattedResult[]`

### 5. Update Type Definitions

**New types needed**:

```typescript
interface RAGResult {
  searchResults: CombinedSearchResult;
  context: string;
  sources: Source[];
}

interface Source {
  title: string;
  url?: string;
  type: "document" | "qa";
  similarity: number;
}

interface CombinedSearchResult {
  documents: DocumentSearchResult[];
  qaData: MedicalQA[];
  totalResults: number;
}
```

### 6. Refactor Existing Search Components

**Extract common logic**:

- Move search logic from `embedding-demo.tsx` and `medical-db-demo.tsx` to shared utilities
- Update components to use new search utilities
- Ensure consistency across search implementations

## Technical Implementation Details

### RAG Context Format

```
CONTEXT: The following medical documents and Q&A pairs are provided as reference:

DOCUMENTS:
1. [Title] - [Content excerpt] (Source: [URL if available])
2. [Title] - [Content excerpt] (Source: [URL if available])

Q&A PAIRS:
1. Q: [Question] A: [Answer]
2. Q: [Question] A: [Answer]

Please use this context to provide accurate medical information. Always cite sources when referencing the provided context.

USER QUESTION: [Original user question]
```

### Search Parameters

- Use same parameters as existing search: `limit: 5, threshold: 0.3`
- Search documents first, then get Q&A for found documents
- Combine results by relevance score

### Error Handling

- If search fails, continue with normal chat (no context)
- If embedding generation fails, show user-friendly error
- Log all errors for debugging
- Graceful degradation to ensure chat always works

### Source Display Format

```
Sources:
• Article Title (95% match) - [Link if available]
• Q&A: Question snippet (87% match)
• Another Article (82% match) - [Link if available]
```

## Files to Create/Modify

### New Files:

1. `src/lib/rag-service.ts` - Main RAG implementation
2. `src/lib/search-utils.ts` - Reusable search utilities
3. `src/types/rag.ts` - RAG-specific type definitions

### Modified Files:

1. `src/components/chat.tsx` - Integration with RAG service
2. `src/lib/ai-service.ts` - Add context support
3. `src/lib/llama-ai-service.ts` - Implement context handling
4. `src/lib/transformers-ai-service.ts` - Implement context handling
5. `src/components/embedding-demo.tsx` - Use shared search utils
6. `src/components/medical-db-demo.tsx` - Use shared search utils

## Testing Strategy

1. Test search functionality works same as before
2. Test context injection improves AI responses
3. Test source links are properly displayed
4. Test error scenarios and graceful degradation
5. Test performance with multiple search results

## Success Criteria

- [ ] User questions trigger automatic vector search
- [ ] AI responses include relevant context from medical database
- [ ] Sources are displayed with clickable links (when URLs available)
- [ ] Search functionality in other components still works
- [ ] No performance degradation in chat
- [ ] Clean, modular, production-ready code
- [ ] Comprehensive error handling
