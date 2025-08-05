import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Source } from "../types/rag";
import { useTheme } from "../lib/theme-context";
import { getCurrentTheme, theme } from "../lib/theme";

interface SourcesDisplayProps {
  sources: Source[];
}

interface ExpandedState {
  [key: string]: boolean;
}

export function SourcesDisplay({ sources }: SourcesDisplayProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const { isDark } = useTheme();
  const colors = getCurrentTheme(isDark);

  if (!sources || sources.length === 0) {
    return null;
  }

  const toggleExpanded = (sourceId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [sourceId]: !prev[sourceId],
    }));
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...theme.shadows.sm,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 8,
    },
    sourceContainer: {
      marginBottom: 8,
      backgroundColor: colors.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    sourceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.background,
    },
    sourceTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: "500",
      color: colors.foreground,
      marginRight: 8,
    },
    expandIcon: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.mutedForeground,
      width: 20,
      textAlign: "center",
    },
    sourceContent: {
      padding: 12,
      paddingTop: 0,
      backgroundColor: colors.muted,
    },
    contentScrollView: {
      maxHeight: 200,
      marginBottom: 8,
    },
    contentText: {
      fontSize: 12,
      color: colors.foreground,
      lineHeight: 18,
    },
    metadata: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    metadataText: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    linkText: {
      fontSize: 11,
      color: colors.primary,
      marginTop: 4,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Sources</Text>
      {sources.map((source, index) => (
        <View key={source.id} style={dynamicStyles.sourceContainer}>
          <TouchableOpacity
            style={dynamicStyles.sourceHeader}
            onPress={() => toggleExpanded(source.id)}
          >
            <Text style={dynamicStyles.sourceTitle}>
              {index + 1}. {source.title}
            </Text>
            <Text style={dynamicStyles.expandIcon}>
              {expanded[source.id] ? "−" : "+"}
            </Text>
          </TouchableOpacity>

          {expanded[source.id] && (
            <View style={dynamicStyles.sourceContent}>
              <ScrollView
                style={dynamicStyles.contentScrollView}
                nestedScrollEnabled={true}
              >
                <Text style={dynamicStyles.contentText}>{source.excerpt}</Text>
              </ScrollView>

              <View style={dynamicStyles.metadata}>
                <Text style={dynamicStyles.metadataText}>
                  Type: {source.type === "document" ? "Document" : "Q&A"}
                </Text>

                {source.similarity && source.similarity > 0 && (
                  <Text style={dynamicStyles.metadataText}>
                    Similarity: {(source.similarity * 100).toFixed(1)}%
                  </Text>
                )}

                {source.year && (
                  <Text style={dynamicStyles.metadataText}>
                    Year: {source.year}
                  </Text>
                )}

                {source.specialty && (
                  <Text style={dynamicStyles.metadataText}>
                    Specialty: {source.specialty}
                  </Text>
                )}

                {source.url && (
                  <Text style={dynamicStyles.linkText}>Link: {source.url}</Text>
                )}
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
