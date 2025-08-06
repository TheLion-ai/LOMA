import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useTheme } from "@/lib/theme-context";
import { getCurrentTheme, theme } from "@/lib/theme";
import { FontAwesome } from "@expo/vector-icons";

export default function AboutScreen() {
  const { isDark } = useTheme();
  const colors = getCurrentTheme(isDark);

  // Create dynamic styles based on current theme
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: theme.spacing.default * 5,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: theme.spacing.default * 6,
      textAlign: "center" as const,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.default * 5,
      marginBottom: theme.spacing.default * 5,
      ...theme.shadows.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600" as const,
      color: colors.foreground,
      marginBottom: theme.spacing.default * 3,
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    sectionText: {
      fontSize: 16,
      color: colors.foreground,
      lineHeight: 24,
      marginBottom: theme.spacing.default * 2,
    },
    featureItem: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      marginBottom: theme.spacing.default * 2,
    },
    featureText: {
      fontSize: 16,
      color: colors.foreground,
      lineHeight: 24,
      marginLeft: theme.spacing.default * 2,
      flex: 1,
    },
    versionText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      marginTop: theme.spacing.default * 4,
    },
    iconContainer: {
      marginRight: theme.spacing.default * 2,
    },
  };

  const features = [
    {
      icon: "mobile",
      text: "Cross-platform support for iOS, Android, and Web"
    },
    {
      icon: "brain",
      text: "Powered by Gemma 3n AI model for intelligent conversations"
    },
    {
      icon: "shield",
      text: "On-device AI processing for maximum privacy"
    },
    {
      icon: "bolt",
      text: "Dual AI backends optimized for each platform"
    },
    {
      icon: "search",
      text: "Advanced search and RAG capabilities"
    },
    {
      icon: "cog",
      text: "Customizable settings and theme options"
    }
  ];

  return (
    <View style={dynamicStyles.container}>
      <ScrollView style={dynamicStyles.content}>
        <Text style={dynamicStyles.title}>About LOMA</Text>
        
        <View style={dynamicStyles.section}>
          <View style={[dynamicStyles.sectionTitle, { flexDirection: "row", alignItems: "center" }]}>
            <View style={dynamicStyles.iconContainer}>
              <FontAwesome name="info-circle" size={20} color={colors.primary} />
            </View>
            <Text style={[dynamicStyles.sectionTitle, { marginBottom: 0 }]}>What is LOMA?</Text>
          </View>
          <Text style={dynamicStyles.sectionText}>
            LOMA is a React Native chat application powered by Google's Gemma 3n language model. 
            It provides intelligent AI conversations with dual backend support for optimal performance 
            across all platforms.
          </Text>
          <Text style={dynamicStyles.sectionText}>
            The app runs AI models locally on your device, ensuring your conversations remain private 
            and secure while delivering fast, responsive AI interactions.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <View style={[dynamicStyles.sectionTitle, { flexDirection: "row", alignItems: "center" }]}>
            <View style={dynamicStyles.iconContainer}>
              <FontAwesome name="star" size={20} color={colors.primary} />
            </View>
            <Text style={[dynamicStyles.sectionTitle, { marginBottom: 0 }]}>Key Features</Text>
          </View>
          {features.map((feature, index) => (
            <View key={index} style={dynamicStyles.featureItem}>
              <FontAwesome 
                name={feature.icon as any} 
                size={16} 
                color={colors.primary} 
                style={{ marginTop: 4 }}
              />
              <Text style={dynamicStyles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        <View style={dynamicStyles.section}>
          <View style={[dynamicStyles.sectionTitle, { flexDirection: "row", alignItems: "center" }]}>
            <View style={dynamicStyles.iconContainer}>
              <FontAwesome name="code" size={20} color={colors.primary} />
            </View>
            <Text style={[dynamicStyles.sectionTitle, { marginBottom: 0 }]}>Technology</Text>
          </View>
          <Text style={dynamicStyles.sectionText}>
            Built with React Native and Expo for cross-platform compatibility. Uses Transformers.js 
            for web deployment and llama.rn for native mobile performance.
          </Text>
          <Text style={dynamicStyles.sectionText}>
            The AI backend automatically adapts to your platform, using ONNX models for web browsers 
            and GGUF models for native mobile apps.
          </Text>
        </View>

        <View style={dynamicStyles.section}>
          <View style={[dynamicStyles.sectionTitle, { flexDirection: "row", alignItems: "center" }]}>
            <View style={dynamicStyles.iconContainer}>
              <FontAwesome name="heart" size={20} color={colors.primary} />
            </View>
            <Text style={[dynamicStyles.sectionTitle, { marginBottom: 0 }]}>Privacy & Security</Text>
          </View>
          <Text style={dynamicStyles.sectionText}>
            All AI processing happens locally on your device. Your conversations never leave your device, 
            ensuring complete privacy and security.
          </Text>
          <Text style={dynamicStyles.sectionText}>
            No data is sent to external servers for AI processing, and you maintain full control over 
            your information at all times.
          </Text>
        </View>

        <Text style={dynamicStyles.versionText}>
          LOMA v1.0.0 • Built with ❤️ using React Native
        </Text>
      </ScrollView>
    </View>
  );
}