import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsContextType {
  maxRagResults: number;
  maxEmbeddingResults: number;
  setMaxRagResults: (value: number) => Promise<void>;
  setMaxEmbeddingResults: (value: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MAX_RAG_RESULTS: '@loma_max_rag_results',
  MAX_EMBEDDING_RESULTS: '@loma_max_embedding_results',
};

const DEFAULT_VALUES = {
  MAX_RAG_RESULTS: 5,
  MAX_EMBEDDING_RESULTS: 5,
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [maxRagResults, setMaxRagResultsState] = useState<number>(DEFAULT_VALUES.MAX_RAG_RESULTS);
  const [maxEmbeddingResults, setMaxEmbeddingResultsState] = useState<number>(DEFAULT_VALUES.MAX_EMBEDDING_RESULTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [ragResults, embeddingResults] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.MAX_RAG_RESULTS),
        AsyncStorage.getItem(STORAGE_KEYS.MAX_EMBEDDING_RESULTS),
      ]);

      if (ragResults !== null) {
        const parsedRagResults = parseInt(ragResults, 10);
        if (!isNaN(parsedRagResults) && parsedRagResults >= 1 && parsedRagResults <= 20) {
          setMaxRagResultsState(parsedRagResults);
        }
      }

      if (embeddingResults !== null) {
        const parsedEmbeddingResults = parseInt(embeddingResults, 10);
        if (!isNaN(parsedEmbeddingResults) && parsedEmbeddingResults >= 1 && parsedEmbeddingResults <= 20) {
          setMaxEmbeddingResultsState(parsedEmbeddingResults);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setMaxRagResults = async (value: number) => {
    try {
      // Validate input
      if (value < 1 || value > 20 || isNaN(value)) {
        throw new Error('Max RAG results must be between 1 and 20');
      }

      await AsyncStorage.setItem(STORAGE_KEYS.MAX_RAG_RESULTS, value.toString());
      setMaxRagResultsState(value);
    } catch (error) {
      console.error('Error saving max RAG results:', error);
      throw error;
    }
  };

  const setMaxEmbeddingResults = async (value: number) => {
    try {
      // Validate input
      if (value < 1 || value > 20 || isNaN(value)) {
        throw new Error('Max embedding results must be between 1 and 20');
      }

      await AsyncStorage.setItem(STORAGE_KEYS.MAX_EMBEDDING_RESULTS, value.toString());
      setMaxEmbeddingResultsState(value);
    } catch (error) {
      console.error('Error saving max embedding results:', error);
      throw error;
    }
  };

  const resetToDefaults = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.MAX_RAG_RESULTS),
        AsyncStorage.removeItem(STORAGE_KEYS.MAX_EMBEDDING_RESULTS),
      ]);
      setMaxRagResultsState(DEFAULT_VALUES.MAX_RAG_RESULTS);
      setMaxEmbeddingResultsState(DEFAULT_VALUES.MAX_EMBEDDING_RESULTS);
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  };

  const value: SettingsContextType = {
    maxRagResults,
    maxEmbeddingResults,
    setMaxRagResults,
    setMaxEmbeddingResults,
    resetToDefaults,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export { DEFAULT_VALUES };