import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, Platform, StyleSheet } from 'react-native';
import { getTursoDBService, MedicalDocument, DocumentSearchResult, QASearchResult, MedicalQA } from '../lib/turso-db-service';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';

export function MedicalDBDemo() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentResults, setDocumentResults] = useState<DocumentSearchResult[]>([]);
  const [qaResults, setQAResults] = useState<QASearchResult[]>([]);
  const [allDocuments, setAllDocuments] = useState<MedicalDocument[]>([]);
  const [allQA, setAllQA] = useState<MedicalQA[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [qaCount, setQACount] = useState(0);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocYear, setNewDocYear] = useState('2024');
  const [searchType, setSearchType] = useState<'documents' | 'qa'>('documents');

  const tursoService = getTursoDBService();

  useEffect(() => {
    initializeDatabase();
    return () => {
      tursoService.cleanup();
    };
  }, []);

  const initializeDatabase = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Medical DB is not available on web platform');
      return;
    }

    setIsLoading(true);
    try {
      await tursoService.initialize();
      setIsInitialized(true);
      await loadDocuments();
      await loadQA();
      await updateCounts();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      Alert.alert('Error', 'Failed to initialize medical database');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await tursoService.getAllMedicalDocuments();
      setAllDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadQA = async () => {
    try {
      const qa = await tursoService.getAllMedicalQA();
      setAllQA(qa);
    } catch (error) {
      console.error('Failed to load Q&A:', error);
    }
  };

  const updateCounts = async () => {
    try {
      const docCount = await tursoService.getMedicalDocumentCount();
      const qaCount = await tursoService.getMedicalQACount();
      setDocumentCount(docCount);
      setQACount(qaCount);
    } catch (error) {
      console.error('Failed to get counts:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setIsLoading(true);
    try {
      if (searchType === 'documents') {
        const results = await tursoService.searchMedicalDocuments({
          query: searchQuery,
          limit: 5,
          threshold: 0.1
        });
        setDocumentResults(results);
        setQAResults([]);
      } else {
        const results = await tursoService.searchMedicalQA({
          query: searchQuery,
          limit: 5,
          threshold: 0.1
        });
        setQAResults(results);
        setDocumentResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim() || !newDocSpecialty.trim()) {
      Alert.alert('Error', 'Please fill in all document fields');
      return;
    }

    setIsLoading(true);
    try {
      const newDoc: MedicalDocument = {
        id: `doc_${Date.now()}`,
        title: newDocTitle,
        content: newDocContent,
        vector: [],
        created_at: new Date().toISOString(),
        year: parseInt(newDocYear),
        specialty: newDocSpecialty
      };

      await tursoService.addMedicalDocument(newDoc);
      setNewDocTitle('');
      setNewDocContent('');
      setNewDocSpecialty('');
      setNewDocYear('2024');
      await loadDocuments();
      await updateCounts();
      Alert.alert('Success', 'Medical document added successfully');
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
      'Are you sure you want to delete this document? This will also delete any related Q&A pairs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tursoService.deleteMedicalDocument(id);
              await loadDocuments();
              await loadQA();
              await updateCounts();
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
        <Text style={styles.title}>Medical Database Demo</Text>
        <Text style={styles.subtitle}>Not available on web platform</Text>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {isLoading ? 'Initializing Medical Database...' : 'Medical Database Demo'}
        </Text>
        {isLoading && (
          <Text style={styles.subtitle}>
            Setting up Medical DB with sample documents and Q&A...
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <Text style={styles.mainTitle}>🏥 Medical Database Demo</Text>
      <Text style={styles.subtitle}>Powered by Turso DB with Medical Vector Search</Text>

      {/* Database Stats */}
      <Card style={styles.statsContainer}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.sectionTitle}>📊 Database Stats</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text style={styles.text}>Medical Documents: {documentCount}</Text>
          <Text style={styles.text}>Q&A Pairs: {qaCount}</Text>
          <Text style={styles.text}>Status: {tursoService.isReady() ? '✅ Ready' : '❌ Not Ready'}</Text>
        </CardContent>
      </Card>

      {/* Search Type Toggle */}
      <Card style={styles.sectionContainer}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.sectionTitle}>🔍 Medical Search</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.toggleContainer}>
            <Button
              variant={searchType === 'documents' ? 'default' : 'secondary'}
              onPress={() => setSearchType('documents')}
              style={styles.toggleButton}
            >
              Documents
            </Button>
            <Button
              variant={searchType === 'qa' ? 'default' : 'secondary'}
              onPress={() => setSearchType('qa')}
              style={styles.toggleButton}
            >
              Q&A
            </Button>
          </View>
          
          <Input
            style={styles.textInput}
            placeholder={`Search ${searchType === 'documents' ? 'medical documents' : 'Q&A pairs'}...`}
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
            {isLoading ? 'Searching...' : `Search ${searchType === 'documents' ? 'Documents' : 'Q&A'}`}
          </Button>

          {/* Search Results */}
          {documentResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Document Search Results:</Text>
              {documentResults.map((result, index) => (
                <Card key={result.document.id} style={styles.resultItem}>
                  <CardContent>
                    <Text style={styles.resultHeader}>
                      #{index + 1} - {result.document.title} (Similarity: {(result.similarity * 100).toFixed(1)}%)
                    </Text>
                    <Text style={styles.resultContent}>{result.document.content}</Text>
                    <Text style={styles.resultMeta}>
                      Specialty: {result.document.specialty} | Year: {result.document.year}
                    </Text>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}

          {qaResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Q&A Search Results:</Text>
              {qaResults.map((result, index) => (
                <Card key={result.qa.id} style={styles.resultItem}>
                  <CardContent>
                    <Text style={styles.resultHeader}>
                      #{index + 1} (Similarity: {(result.similarity * 100).toFixed(1)}%)
                    </Text>
                    <Text style={styles.qaQuestion}>Q: {result.qa.question}</Text>
                    <Text style={styles.qaAnswer}>A: {result.qa.answer}</Text>
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
            <Text style={styles.sectionTitle}>➕ Add Medical Document</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            style={styles.textInput}
            placeholder="Document title..."
            value={newDocTitle}
            onChangeText={setNewDocTitle}
          />
          <Input
            style={styles.textInput}
            placeholder="Medical specialty..."
            value={newDocSpecialty}
            onChangeText={setNewDocSpecialty}
          />
          <Input
            style={styles.textInput}
            placeholder="Publication year..."
            value={newDocYear}
            onChangeText={setNewDocYear}
            keyboardType="numeric"
          />
          <Input
            style={StyleSheet.flatten([styles.textInput, styles.multilineInput])}
            placeholder="Document content..."
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
            <Text style={styles.sectionTitle}>📚 Medical Documents</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allDocuments.map((doc, index) => (
            <Card key={doc.id} style={styles.documentItem}>
              <CardContent>
                <View style={styles.documentContent}>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle}>{doc.title}</Text>
                    <Text style={styles.documentText}>{doc.content}</Text>
                    <Text style={styles.documentMeta}>
                      Specialty: {doc.specialty} | Year: {doc.year}
                    </Text>
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

      {/* All Q&A */}
      <Card style={styles.sectionContainer}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.sectionTitle}>❓ Medical Q&A</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allQA.map((qa, index) => (
            <Card key={qa.id} style={styles.documentItem}>
              <CardContent>
                <Text style={styles.qaQuestion}>Q: {qa.question}</Text>
                <Text style={styles.qaAnswer}>A: {qa.answer}</Text>
                <Text style={styles.documentMeta}>Document ID: {qa.document_id}</Text>
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
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
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
  qaQuestion: {
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  qaAnswer: {
    color: '#374151',
    marginBottom: 4,
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
    fontSize: 16,
    marginBottom: 4,
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
});