import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useSettings } from '@/lib/settings-context';
import { useTheme } from '@/lib/theme-context';
import { getCurrentTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

interface SettingsScreenProps {
  onBack?: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { isDark } = useTheme();
  const colors = getCurrentTheme(isDark);
  const {
    maxRagResults,
    maxEmbeddingResults,
    setMaxRagResults,
    setMaxEmbeddingResults,
    resetToDefaults,
    isLoading,
  } = useSettings();

  // Local state for input values
  const [ragInput, setRagInput] = useState(maxRagResults.toString());
  const [embeddingInput, setEmbeddingInput] = useState(maxEmbeddingResults.toString());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when settings change
  useEffect(() => {
    setRagInput(maxRagResults.toString());
    setEmbeddingInput(maxEmbeddingResults.toString());
    setHasUnsavedChanges(false);
  }, [maxRagResults, maxEmbeddingResults]);

  // Check for unsaved changes
  useEffect(() => {
    const ragValue = parseInt(ragInput, 10);
    const embeddingValue = parseInt(embeddingInput, 10);
    const hasChanges = 
      (!isNaN(ragValue) && ragValue !== maxRagResults) ||
      (!isNaN(embeddingValue) && embeddingValue !== maxEmbeddingResults);
    setHasUnsavedChanges(hasChanges);
  }, [ragInput, embeddingInput, maxRagResults, maxEmbeddingResults]);

  const validateInput = (value: string): { isValid: boolean; error?: string } => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      return { isValid: false, error: 'Please enter a valid number' };
    }
    if (numValue < 1) {
      return { isValid: false, error: 'Value must be at least 1' };
    }
    if (numValue > 20) {
      return { isValid: false, error: 'Value must be 20 or less' };
    }
    return { isValid: true };
  };

  const handleSave = async () => {
    const ragValidation = validateInput(ragInput);
    const embeddingValidation = validateInput(embeddingInput);

    if (!ragValidation.isValid) {
      Alert.alert('Invalid RAG Results', ragValidation.error!);
      return;
    }

    if (!embeddingValidation.isValid) {
      Alert.alert('Invalid Embedding Results', embeddingValidation.error!);
      return;
    }

    setIsSaving(true);
    try {
      const ragValue = parseInt(ragInput, 10);
      const embeddingValue = parseInt(embeddingInput, 10);

      await Promise.all([
        setMaxRagResults(ragValue),
        setMaxEmbeddingResults(embeddingValue),
      ]);

      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save settings'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetToDefaults();
              Alert.alert('Success', 'Settings reset to defaults!');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to reset settings'
              );
            }
          },
        },
      ]
    );
  };

  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backButton: {
      marginRight: 16,
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      color: colors.foreground,
      flex: 1,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: colors.foreground,
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 16,
      lineHeight: 20,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.foreground,
      marginBottom: 8,
    },
    inputDescription: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: colors.input,
      color: colors.foreground,
    },
    buttonContainer: {
      flexDirection: 'row' as const,
      gap: 12,
      marginTop: 24,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center' as const,
    },
    primaryButtonDisabled: {
      backgroundColor: colors.muted,
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: colors.destructive,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center' as const,
    },
    buttonText: {
      color: colors.primaryForeground,
      fontWeight: 'bold' as const,
      fontSize: 16,
    },
    secondaryButtonText: {
      color: colors.destructiveForeground,
      fontWeight: 'bold' as const,
      fontSize: 16,
    },
    loadingText: {
      textAlign: 'center' as const,
      color: colors.mutedForeground,
      fontSize: 16,
      marginTop: 32,
    },
  };

  if (isLoading) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          {onBack && (
            <TouchableOpacity style={dynamicStyles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <Text style={dynamicStyles.headerTitle}>Settings</Text>
        </View>
        <Text style={dynamicStyles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        {onBack && (
          <TouchableOpacity style={dynamicStyles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <Text style={dynamicStyles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={dynamicStyles.content}>
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Search Results Configuration</Text>
          <Text style={dynamicStyles.sectionDescription}>
            Configure the maximum number of search results returned by different features.
            Values must be between 1 and 20.
          </Text>

          <View style={dynamicStyles.inputGroup}>
            <Text style={dynamicStyles.inputLabel}>Max RAG Results</Text>
            <Text style={dynamicStyles.inputDescription}>
              Maximum number of results for RAG (chat) searches
            </Text>
            <TextInput
              style={dynamicStyles.textInput}
              value={ragInput}
              onChangeText={setRagInput}
              placeholder="5"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={dynamicStyles.inputGroup}>
            <Text style={dynamicStyles.inputLabel}>Max Embedding Demo Results</Text>
            <Text style={dynamicStyles.inputDescription}>
              Maximum number of results for embedding demo searches
            </Text>
            <TextInput
              style={dynamicStyles.textInput}
              value={embeddingInput}
              onChangeText={setEmbeddingInput}
              placeholder="5"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={dynamicStyles.buttonContainer}>
            <TouchableOpacity
              style={[
                dynamicStyles.primaryButton,
                (!hasUnsavedChanges || isSaving) && dynamicStyles.primaryButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              <Text style={dynamicStyles.buttonText}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.secondaryButton}
              onPress={handleReset}
              disabled={isSaving}
            >
              <Text style={dynamicStyles.secondaryButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}