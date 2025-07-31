import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, Platform, StyleSheet } from 'react-native';
import { getTursoDBService, VectorDocument, VectorSearchResult } from '../lib/turso-db-service';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';

export function VectorDBDemo() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [allDocuments, setAllDocuments] = useState<VectorDocument[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [newDocContent, setNewDocContent] = useState('');

  const tursoService = getTursoDBService();

  useEffect(() => {
    initializeDatabase();
    return () => {
      tursoService.cleanup();
    };
  }, []);

  const initializeDatabase = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Turso DB is not available on web platform');
      return;
    }

    setIsLoading(true);
    try {
      await tursoService.initialize();
      setIsInitialized(true);
      await loadDocuments();
      await updateDocumentCount();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      Alert.alert('Error', 'Failed to initialize vector database');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await tursoService.getAllDocuments();
      setAllDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const updateDocumentCount = async () => {
    try {
      const count = await tursoService.getDocumentCount();
      setDocumentCount(count);
    } catch (error) {
      console.error('Failed to get document count:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setIsLoading(true);
    try {
      const results = await tursoService.searchSimilar({
        query: searchQuery,
        limit: 5,
        threshold: 0.1 // Lower threshold for demo purposes
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDocument = async () => {
    if (!newDocContent.trim()) {
      Alert.alert('Error', 'Please enter document content');
      return;
    }

    setIsLoading(true);
    try {
      const newDoc: VectorDocument = {
        id: `doc_${Date.now()}`,
        content: newDocContent,
        metadata: {
          category: 'user_generated',
          timestamp: new Date().toISOString()
        }
      };

      await tursoService.addDocument(newDoc);
      setNewDocContent('');
      await loadDocuments();
      await updateDocumentCount();
      Alert.alert('Success', 'Document added successfully');
    } catch (error) {
      console.error('Failed to add document:', error);
      Alert.alert('Error', 'Failed to add document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tursoService.deleteDocument(id);
              await loadDocuments();
              await updateDocumentCount();
              Alert.alert('Success', 'Document deleted successfully');
            } catch (error) {
              console.error('Failed to delete document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          }
        }
      ]
    );
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          Vector Database Demo
        </Text>
        <Text style={styles.subtitle}>
          Not available on web platform
        </Text>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {isLoading ? 'Initializing Vector Database...' : 'Vector Database Demo'}
        </Text>
        {isLoading && (
          <Text style={styles.subtitle}>
            Setting up Turso DB with example documents...
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <Text style={styles.mainTitle}>
        🗄️ Vector Database Demo
      </Text>
      
      <Text style={styles.subtitle}>
        Powered by Turso DB with libSQL Vector Search
      </Text>

      {/* Database Stats */}
      <Card style={styles.statsContainer}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.sectionTitle}>📊 Database Stats</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text style={styles.text}>Total Documents: {documentCount}</Text>
          <Text style={styles.text}>Status: {tursoService.isReady() ? '✅ Ready' : '❌ Not Ready'}</Text>
        </CardContent>
      </Card>

      {/* Vector Search */}
      <Card style={styles.sectionContainer}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.sectionTitle}>🔍 Vector Search</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            style={styles.textInput}
            placeholder="Enter search query..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            multiline
          />
          <Button
            variant={isLoading ? "secondary" : "default"}
            onPress={handleSearch}
            disabled={isLoading}
            style={styles.button}
          >
            {isLoading ? 'Searching...' : 'Search Similar Documents'}
          </Button>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Search Results:</Text>
              {searchResults.map((result, index) => (
                <Card key={result.document.id} style={styles.resultItem}>
                  <CardContent>
                    <Text style={styles.resultHeader}>#{index + 1} (Similarity: {(result.similarity * 100).toFixed(1)}%)</Text>
                    <Text style={styles.resultContent}>{result.document.content}</Text>
                    {result.document.metadata && (
                      <Text style={styles.resultMeta}>
                        Category: {result.document.metadata.category}
                      </Text>
                    )}
                  </CardContent>
                </Card>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Add New Document */}
      <Card style={styles.sectionContainer}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.sectionTitle}>➕ Add New Document</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            style={StyleSheet.flatten([styles.textInput, styles.multilineInput])}
            placeholder="Enter document content..."
            value={newDocContent}
            onChangeText={setNewDocContent}
            multiline
            numberOfLines={3}
          />
          <Button
            variant={isLoading ? "secondary" : "default"}
            onPress={handleAddDocument}
            disabled={isLoading}
            style={styles.button}
          >
            {isLoading ? 'Adding...' : 'Add Document'}
          </Button>
        </CardContent>
      </Card>

      {/* All Documents */}
      <Card style={styles.sectionContainer}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.sectionTitle}>📚 All Documents</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allDocuments.map((doc, index) => (
            <Card key={doc.id} style={styles.documentItem}>
              <CardContent>
                <View style={styles.documentContent}>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle}>Document #{index + 1}</Text>
                    <Text style={styles.documentText}>{doc.content}</Text>
                    {doc.metadata && (
                      <Text style={styles.documentMeta}>
                        Category: {doc.metadata.category}
                      </Text>
                    )}
                  </View>
                  <Button
                    variant="destructive"
                    size="sm"
                    onPress={() => handleDeleteDocument(doc.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#6B7280',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 24,
  },
  statsContainer: {
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  text: {
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  multilineInput: {
    minHeight: 80,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',
  },
  buttonSuccess: {
    backgroundColor: '#10B981',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 16,
  },
  resultsTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  resultItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultHeader: {
    fontWeight: '500',
  },
  resultContent: {
    color: '#374151',
    marginTop: 4,
  },
  resultMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  documentItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontWeight: '500',
  },
  documentText: {
    color: '#374151',
    marginTop: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});