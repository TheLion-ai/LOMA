import React, { useState } from "react";
import { View, Text, ScrollView, Alert, Switch } from "react-native";
import { useDatabase } from "@/lib/database-context";
import { DatabaseDownloadService } from "@/lib/database-download-service";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-context";
import { getCurrentTheme } from "@/lib/theme";

export default function SettingsScreen() {
  const {
    databaseStatus,
    downloadProgress,
    downloadState,
    error,
    isDatabaseAvailable,
    startDownload,
    cancelDownload,
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
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 24,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
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
    progressSection: {
      marginTop: 16,
      padding: 16,
      backgroundColor: colors.muted,
      borderRadius: 8,
    },
    progressTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      marginBottom: 8,
    },
    progressBar: {
      width: "100%" as const,
      height: 6,
      backgroundColor: colors.secondary,
      borderRadius: 3,
      overflow: "hidden" as const,
      marginBottom: 8,
    },
    progressFill: {
      height: "100%" as const,
      backgroundColor: colors.primary,
    },
    progressText: {
      fontSize: 12,
      color: colors.foreground,
      marginBottom: 4,
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

          {/* Download Progress */}
          {downloadState === "downloading" && downloadProgress && (
            <View style={dynamicStyles.progressSection}>
              <Text style={dynamicStyles.progressTitle}>Download Progress</Text>

              <View style={dynamicStyles.progressBar}>
                <View
                  style={[
                    dynamicStyles.progressFill,
                    { width: `${downloadProgress.percentage}%` },
                  ]}
                />
              </View>

              <Text style={dynamicStyles.progressText}>
                {downloadProgress.percentage.toFixed(1)}% -{" "}
                {DatabaseDownloadService.formatBytes(
                  downloadProgress.totalBytesWritten
                )}
                {downloadProgress.totalBytesExpected &&
                  ` / ${DatabaseDownloadService.formatBytes(
                    downloadProgress.totalBytesExpected
                  )}`}
              </Text>

              {downloadProgress.speedBps && (
                <Text style={dynamicStyles.progressDetail}>
                  Speed:{" "}
                  {DatabaseDownloadService.formatBytes(
                    downloadProgress.speedBps
                  )}
                  /s
                </Text>
              )}

              {downloadProgress.estimatedTimeRemaining && (
                <Text style={dynamicStyles.progressDetail}>
                  Time remaining:{" "}
                  {DatabaseDownloadService.formatTime(
                    downloadProgress.estimatedTimeRemaining
                  )}
                </Text>
              )}
            </View>
          )}

          {/* Error Display */}
          {error && (
            <View style={dynamicStyles.errorContainer}>
              <Text style={dynamicStyles.errorText}>{error}</Text>
              <Button onPress={clearError} style={dynamicStyles.clearErrorButton}>
                <Text style={dynamicStyles.buttonText}>Clear Error</Text>
              </Button>
            </View>
          )}

          {/* Action Buttons */}
          <View style={dynamicStyles.buttonGroup}>
            <Button
              onPress={handleRefreshStatus}
              disabled={isRefreshing}
              style={{ ...dynamicStyles.button, ...dynamicStyles.secondaryButton }}
            >
              <Text style={dynamicStyles.secondaryButtonText}>
                {isRefreshing ? "Refreshing..." : "Refresh Status"}
              </Text>
            </Button>

            {downloadState === "downloading" ? (
              <Button
                onPress={cancelDownload}
                style={{ ...dynamicStyles.button, ...dynamicStyles.cancelButton }}
              >
                <Text style={dynamicStyles.buttonText}>Cancel Download</Text>
              </Button>
            ) : (
              <>
                {!isDatabaseAvailable && (
                  <Button onPress={handleStartDownload} style={dynamicStyles.button}>
                    <Text style={dynamicStyles.buttonText}>Download Database</Text>
                  </Button>
                )}

                {databaseStatus?.exists && (
                  <Button
                    onPress={handleResetDatabase}
                    style={{ ...dynamicStyles.button, ...dynamicStyles.dangerButton }}
                  >
                    <Text style={dynamicStyles.buttonText}>Reset Database</Text>
                  </Button>
                )}
              </>
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


