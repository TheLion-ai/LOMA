import React, { useState } from "react";
import { View, Text, ScrollView, Alert, Switch } from "react-native";
import { useDatabase } from "@/lib/database-context";
import { DatabaseDownloadService } from "@/lib/database-download-service";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-context";
import { getCurrentTheme, theme } from "@/lib/theme";

export default function SettingsScreen() {
  const {
    databaseStatus,
    downloadProgress,
    downloadState,
    error,
    isDatabaseAvailable,
    startDownload,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    resetAndDownload,
    refreshStatus,
    clearError,
  } = useDatabase();

  const { isDark, toggleTheme } = useTheme();
  const colors = getCurrentTheme(isDark);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create dynamic styles based on current theme
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: theme.spacing.default * 5, // 20px
    },
    title: {
      fontSize: 28,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: theme.spacing.default * 6, // 24px
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.default * 5, // 20px
      marginBottom: theme.spacing.default * 5, // 20px
      ...theme.shadows.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: colors.cardForeground,
      marginBottom: 16,
    },
    statusContainer: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statusLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    statusValue: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    statusSuccess: {
      color: colors.primary,
    },
    statusWarning: {
      color: colors.destructive,
    },
    // Inline progress bar (shows above Refresh Status button)
    inlineProgressContainer: {
      marginBottom: theme.spacing.default * 3, // 12px
      marginTop: theme.spacing.default * 3, // 12px
    },
    inlineProgressBar: {
      width: "100%" as const,
      height: 4,
      backgroundColor: colors.muted,
      borderRadius: theme.borderRadius.sm,
      overflow: "hidden" as const,
      marginBottom: theme.spacing.default * 2, // 8px
    },
    inlineProgressFill: {
      height: "100%" as const,
      backgroundColor: colors.primary,
    },
    inlineProgressText: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center" as const,
    },
    // Legacy progress section (keeping for compatibility)
    progressSection: {
      marginTop: theme.spacing.default * 4, // 16px
      padding: theme.spacing.default * 4, // 16px
      backgroundColor: colors.muted,
      borderRadius: theme.borderRadius.md,
    },
    progressTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      marginBottom: theme.spacing.default * 2, // 8px
    },
    progressBar: {
      width: "100%" as const,
      height: 6,
      backgroundColor: colors.secondary,
      borderRadius: theme.borderRadius.sm,
      overflow: "hidden" as const,
      marginBottom: theme.spacing.default * 2, // 8px
    },
    progressFill: {
      height: "100%" as const,
      backgroundColor: colors.primary,
    },
    progressText: {
      fontSize: 12,
      color: colors.foreground,
      marginBottom: theme.spacing.default, // 4px
    },
    progressDetail: {
      fontSize: 11,
      color: colors.mutedForeground,
    },
    errorContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: colors.destructive + "20", // Adding transparency
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.destructive + "40",
    },
    errorText: {
      fontSize: 14,
      color: colors.destructive,
      marginBottom: 8,
    },
    clearErrorButton: {
      backgroundColor: colors.destructive,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 6,
      alignSelf: "flex-start" as const,
    },
    buttonGroup: {
      marginTop: 20,
      gap: 12,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: "center" as const,
    },
    secondaryButton: {
      backgroundColor: colors.secondary,
    },
    cancelButton: {
      backgroundColor: colors.destructive,
    },
    dangerButton: {
      backgroundColor: colors.destructive,
    },
    buttonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: "600" as const,
    },
    secondaryButtonText: {
      color: colors.secondaryForeground,
      fontSize: 14,
      fontWeight: "600" as const,
    },
    aboutText: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 20,
      marginBottom: 8,
    },
    themeToggleContainer: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
    },
    themeToggleLabel: {
      fontSize: 16,
      color: colors.foreground,
      fontWeight: "500" as const,
    },
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await refreshStatus();
    } catch (err) {
      console.error("Error refreshing status:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper function to get dynamic button text based on download state
  const getButtonText = () => {
    switch (downloadState) {
      case "downloading":
        return "Pause Download";
      case "paused":
        return "Continue Download";
      default:
        return "Reset Database";
    }
  };

  // Helper function to handle button action based on download state
  const handleButtonAction = () => {
    switch (downloadState) {
      case "downloading":
        pauseDownload();
        break;
      case "paused":
        resumeDownload();
        break;
      default:
        handleResetDatabase();
        break;
    }
  };

  // Helper function to format progress text
  const formatProgressText = (downloaded: number, total?: number) => {
    const downloadedStr = DatabaseDownloadService.formatBytes(downloaded);
    if (total) {
      const totalStr = DatabaseDownloadService.formatBytes(total);
      return `${downloadedStr} / ${totalStr}`;
    }
    return downloadedStr;
  };

  const handleResetDatabase = () => {
    Alert.alert(
      "Reset Database",
      "This will remove the current database and download a fresh copy. This action cannot be undone.\n\nAre you sure you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset & Download",
          style: "destructive",
          onPress: resetAndDownload,
        },
      ]
    );
  };

  const handleStartDownload = () => {
    Alert.alert(
      "Download Database",
      "This will download the full medical knowledge database (~10GB). Make sure you have sufficient storage space and a stable internet connection.\n\nContinue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Download",
          onPress: startDownload,
        },
      ]
    );
  };

  return (
    <ScrollView style={dynamicStyles.container}>
      <View style={dynamicStyles.content}>
        <Text style={dynamicStyles.title}>Settings</Text>

        {/* Theme Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Appearance</Text>
          <View style={dynamicStyles.themeToggleContainer}>
            <Text style={dynamicStyles.themeToggleLabel}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={isDark ? colors.primaryForeground : colors.foreground}
            />
          </View>
        </View>

        {/* Database Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Database Management</Text>

          {/* Database Status */}
          <View style={dynamicStyles.statusContainer}>
            <Text style={dynamicStyles.statusLabel}>Status:</Text>
            <Text
              style={[
                dynamicStyles.statusValue,
                isDatabaseAvailable
                  ? dynamicStyles.statusSuccess
                  : dynamicStyles.statusWarning,
              ]}
            >
              {isDatabaseAvailable
                ? "Medical Database Available"
                : "Database Not Available"}
            </Text>
          </View>

          {databaseStatus && (
            <>
              <View style={dynamicStyles.statusContainer}>
                <Text style={dynamicStyles.statusLabel}>File Size:</Text>
                <Text style={dynamicStyles.statusValue}>
                  {databaseStatus.fileSize
                    ? DatabaseDownloadService.formatBytes(
                        databaseStatus.fileSize
                      )
                    : "N/A"}
                </Text>
              </View>

              {databaseStatus.lastModified && (
                <View style={dynamicStyles.statusContainer}>
                  <Text style={dynamicStyles.statusLabel}>Last Updated:</Text>
                  <Text style={dynamicStyles.statusValue}>
                    {databaseStatus.lastModified.toLocaleDateString()}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Error Display */}
          {error && (
            <View style={dynamicStyles.errorContainer}>
              <Text style={dynamicStyles.errorText}>{error}</Text>
              <Button
                onPress={clearError}
                style={dynamicStyles.clearErrorButton}
              >
                <Text style={dynamicStyles.buttonText}>Clear Error</Text>
              </Button>
            </View>
          )}

          {/* Inline Progress Bar (above Refresh Status button) */}
          {(downloadState === "downloading" || downloadState === "paused") &&
            downloadProgress && (
              <View style={dynamicStyles.inlineProgressContainer}>
                <View style={dynamicStyles.inlineProgressBar}>
                  <View
                    style={[
                      dynamicStyles.inlineProgressFill,
                      { width: `${downloadProgress.percentage}%` },
                    ]}
                  />
                </View>
                <Text style={dynamicStyles.inlineProgressText}>
                  {formatProgressText(
                    downloadProgress.totalBytesWritten,
                    downloadProgress.totalBytesExpected
                  )}
                </Text>
              </View>
            )}

          {/* Action Buttons */}
          <View style={dynamicStyles.buttonGroup}>
            <Button
              onPress={handleRefreshStatus}
              disabled={isRefreshing}
              style={{
                ...dynamicStyles.button,
                ...dynamicStyles.secondaryButton,
              }}
            >
              <Text style={dynamicStyles.secondaryButtonText}>
                {isRefreshing ? "Refreshing..." : "Refresh Status"}
              </Text>
            </Button>

            {/* Dynamic Reset/Pause/Continue button */}
            {(databaseStatus?.exists ||
              downloadState === "downloading" ||
              downloadState === "paused") && (
              <Button
                onPress={handleButtonAction}
                style={{
                  ...dynamicStyles.button,
                  ...(downloadState === "downloading" ||
                  downloadState === "paused"
                    ? dynamicStyles.secondaryButton
                    : dynamicStyles.dangerButton),
                }}
              >
                <Text
                  style={
                    downloadState === "downloading" ||
                    downloadState === "paused"
                      ? dynamicStyles.secondaryButtonText
                      : dynamicStyles.buttonText
                  }
                >
                  {getButtonText()}
                </Text>
              </Button>
            )}

            {/* Download button (only when no database and not downloading/paused) */}
            {!isDatabaseAvailable &&
              downloadState !== "downloading" &&
              downloadState !== "paused" && (
                <Button
                  onPress={handleStartDownload}
                  style={dynamicStyles.button}
                >
                  <Text style={dynamicStyles.buttonText}>
                    Download Database
                  </Text>
                </Button>
              )}

            {/* Cancel button (only when downloading or paused) */}
            {(downloadState === "downloading" ||
              downloadState === "paused") && (
              <Button
                onPress={cancelDownload}
                style={{
                  ...dynamicStyles.button,
                  ...dynamicStyles.cancelButton,
                }}
              >
                <Text style={dynamicStyles.buttonText}>Cancel Download</Text>
              </Button>
            )}
          </View>
        </View>

        {/* App Information */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>About</Text>
          <Text style={dynamicStyles.aboutText}>
            LOMA is a medical knowledge database application with AI-powered
            search and chat functionality.
          </Text>
          <Text style={dynamicStyles.aboutText}>
            The application uses a large medical database containing clinical
            documents, Q&A pairs, and other medical resources.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
