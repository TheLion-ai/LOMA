
import {
  VectorStore,  SimpleVectorStore, storageContextFromDefaults, Document, serviceContextFromDefaults
} from 'llamaindex';
import { EmbeddingService } from './embedding-service';
import { ChatHistory, chatHistoryFromMessages } from './chat-storage';

export class VectorStorage {
  private vectorStore: VectorStore;
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
    this.vectorStore = new SimpleVectorStore();
  }

  async add(documents: Document[]): Promise<void> {
    const serviceContext = serviceContextFromDefaults({ 
      embedModel: this.embeddingService,
    });
    const storageContext = await storageContextFromDefaults({ vectorStore: this.vectorStore });
    
    for (const doc of documents) {
      const embedding = await this.embeddingService.embed(doc.text);
      doc.embedding = embedding;
      this.vectorStore.add([doc]);
    }
  }

  async query(query: string, k: number = 4): Promise<Document[]> {
    const queryEmbedding = await this.embeddingService.embed(query);
    const results = this.vectorStore.query({ queryEmbedding, similarityTopK: k });
    return results.nodes || [];
  }

  async loadChatHistory(chatHistory: ChatHistory): Promise<void> {
    const documents = chatHistory.messages.map(msg => new Document({ text: msg.content, metadata: { role: msg.role } }));
    await this.add(documents);
  }
}
