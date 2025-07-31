import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Chat from "@/components/chat";
import { VectorDBDemo } from "@/components/vector-db-demo";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'vectordb'>('chat');

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <Button
          variant={activeTab === 'chat' ? 'default' : 'outline'}
          onPress={() => setActiveTab('chat')}
          style={styles.tabButton}
        >
          💬 Chat
        </Button>
        <Button
          variant={activeTab === 'vectordb' ? 'default' : 'outline'}
          onPress={() => setActiveTab('vectordb')}
          style={styles.tabButton}
        >
          🗄️ Vector DB
        </Button>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'chat' ? <Chat /> : <VectorDBDemo />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabButton: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
