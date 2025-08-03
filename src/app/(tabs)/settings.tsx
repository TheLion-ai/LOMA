import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useDatabase } from "@/lib/database-context";
import { DatabaseDownloadService } from "@/lib/database-download-service";
import { Button } from "@/components/ui/button";

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

  const [isRefreshing, setIsRefreshing] = useState(false);

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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Database Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Management</Text>

          {/* Database Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text
              style={[
                styles.statusValue,
                isDatabaseAvailable
                  ? styles.statusSuccess
                  : styles.statusWarning,
              ]}
            >
              {isDatabaseAvailable
                ? "Medical Database Available"
                : "Database Not Available"}
            </Text>
          </View>

          {databaseStatus && (
            <>
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>File Size:</Text>
                <Text style={styles.statusValue}>
                  {databaseStatus.fileSize
                    ? DatabaseDownloadService.formatBytes(
                        databaseStatus.fileSize
                      )
                    : "N/A"}
                </Text>
              </View>

              {databaseStatus.lastModified && (
                <View style={styles.statusContainer}>
                  <Text style={styles.statusLabel}>Last Updated:</Text>
                  <Text style={styles.statusValue}>
                    {databaseStatus.lastModified.toLocaleDateString()}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Download Progress */}
          {downloadState === "downloading" && downloadProgress && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>Download Progress</Text>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${downloadProgress.percentage}%` },
                  ]}
                />
              </View>

              <Text style={styles.progressText}>
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
                <Text style={styles.progressDetail}>
                  Speed:{" "}
                  {DatabaseDownloadService.formatBytes(
                    downloadProgress.speedBps
                  )}
                  /s
                </Text>
              )}

              {downloadProgress.estimatedTimeRemaining && (
                <Text style={styles.progressDetail}>
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
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Button onPress={clearError} style={styles.clearErrorButton}>
                <Text style={styles.buttonText}>Clear Error</Text>
              </Button>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <Button
              onPress={handleRefreshStatus}
              disabled={isRefreshing}
              style={{ ...styles.button, ...styles.secondaryButton }}
            >
              <Text style={styles.buttonText}>
                {isRefreshing ? "Refreshing..." : "Refresh Status"}
              </Text>
            </Button>

            {downloadState === "downloading" ? (
              <Button
                onPress={cancelDownload}
                style={{ ...styles.button, ...styles.cancelButton }}
              >
                <Text style={styles.buttonText}>Cancel Download</Text>
              </Button>
            ) : (
              <>
                {!isDatabaseAvailable && (
                  <Button onPress={handleStartDownload} style={styles.button}>
                    <Text style={styles.buttonText}>Download Database</Text>
                  </Button>
                )}

                {databaseStatus?.exists && (
                  <Button
                    onPress={handleResetDatabase}
                    style={{ ...styles.button, ...styles.dangerButton }}
                  >
                    <Text style={styles.buttonText}>Reset Database</Text>
                  </Button>
                )}
              </>
            )}
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            LOMA is a medical knowledge database application with AI-powered
            search and chat functionality.
          </Text>
          <Text style={styles.aboutText}>
            The application uses a large medical database containing clinical
            documents, Q&A pairs, and other medical resources.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 24,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  statusLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusSuccess: {
    color: "#059669",
  },
  statusWarning: {
    color: "#d97706",
  },
  progressSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0066cc",
  },
  progressText: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 4,
  },
  progressDetail: {
    fontSize: 11,
    color: "#6b7280",
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    marginBottom: 8,
  },
  clearErrorButton: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  buttonGroup: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    backgroundColor: "#0066cc",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#6b7280",
  },
  cancelButton: {
    backgroundColor: "#dc2626",
  },
  dangerButton: {
    backgroundColor: "#dc2626",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  aboutText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 8,
  },
});
