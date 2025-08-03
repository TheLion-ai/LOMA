import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Source } from '../types/rag';

interface SourcesDisplayProps {
  sources: Source[];
}

interface ExpandedState {
  [key: string]: boolean;
}

export function SourcesDisplay({ sources }: SourcesDisplayProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  if (!sources || sources.length === 0) {
    return null;
  }

  const toggleExpanded = (sourceId: string) => {
    setExpanded(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sources</Text>
      {sources.map((source, index) => (
        <View key={source.id} style={styles.sourceContainer}>
          <TouchableOpacity
            style={styles.sourceHeader}
            onPress={() => toggleExpanded(source.id)}
          >
            <Text style={styles.sourceTitle}>
              {index + 1}. {source.title}
            </Text>
            <Text style={styles.expandIcon}>
              {expanded[source.id] ? '−' : '+'}
            </Text>
          </TouchableOpacity>
          
          {expanded[source.id] && (
            <View style={styles.sourceContent}>
              <ScrollView style={styles.contentScrollView} nestedScrollEnabled={true}>
                <Text style={styles.contentText}>{source.excerpt}</Text>
              </ScrollView>
              
              <View style={styles.metadata}>
                <Text style={styles.metadataText}>
                  Type: {source.type === 'document' ? 'Document' : 'Q&A'}
                </Text>
                
                {source.similarity && source.similarity > 0 && (
                  <Text style={styles.metadataText}>
                    Similarity: {(source.similarity * 100).toFixed(1)}%
                  </Text>
                )}
                
                {source.year && (
                  <Text style={styles.metadataText}>
                    Year: {source.year}
                  </Text>
                )}
                
                {source.specialty && (
                  <Text style={styles.metadataText}>
                    Specialty: {source.specialty}
                  </Text>
                )}
                
                {source.url && (
                  <Text style={styles.linkText}>
                    Link: {source.url}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  sourceContainer: {
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
    overflow: 'hidden',
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
  },
  sourceTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#212529',
    marginRight: 8,
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c757d',
    width: 20,
    textAlign: 'center',
  },
  sourceContent: {
    padding: 12,
    paddingTop: 0,
    backgroundColor: '#f8f9fa',
  },
  contentScrollView: {
    maxHeight: 200,
    marginBottom: 8,
  },
  contentText: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 18,
  },
  metadata: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 8,
  },
  metadataText: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 2,
  },
  linkText: {
    fontSize: 11,
    color: '#007bff',
    marginTop: 4,
  },
});