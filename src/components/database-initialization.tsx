/**
 * @file database-initialization.tsx
 * @description Component that handles database initialization and shows appropriate UI
 * during startup, download, and error states
 */

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useDatabase } from "../lib/database-context";
import { DatabaseDownloadService } from "../lib/database-download-service";
import { Button } from "./ui/button";

/**
 * Database initialization component that wraps the main app
 * Shows different UI states based on database status
 */
export function DatabaseInitialization({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    initState,
    databaseStatus,
    downloadProgress,
    error,
    isDatabaseReady,
    isDatabaseAvailable,
    startDownload,
    cancelDownload,
    resetAndDownload,
    clearError,
  } = useDatabase();

  // Show loading screen during initial check
  if (initState === "checking") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.title}>Initializing Database...</Text>
        <Text style={styles.subtitle}>Checking database status</Text>
      </View>
    );
  }

  // Show error screen
  if (initState === "error" && error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Database Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.buttonContainer}>
          <Button onPress={clearError} style={styles.button}>
            <Text style={styles.buttonText}>Retry</Text>
          </Button>
          {databaseStatus?.exists && (
            <Button
              onPress={resetAndDownload}
              style={{ ...styles.button, ...styles.secondaryButton }}
            >
              <Text style={styles.buttonText}>Reset & Download</Text>
            </Button>
          )}
        </View>
      </View>
    );
  }

  // Show download screen when database is missing
  if (initState === "missing") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Medical Database Required</Text>
        <Text style={styles.subtitle}>
          This app requires a medical knowledge database to function properly.
        </Text>
        <Text style={styles.description}>
          The database contains medical documents, Q&A pairs, and other clinical
          information needed for search and chat functionality.
        </Text>
        <Text style={styles.warningText}>
          ⚠️ The database is approximately 10GB in size. Please ensure you have
          sufficient storage space and a stable internet connection before
          downloading.
        </Text>
        <View style={styles.buttonContainer}>
          <Button onPress={startDownload} style={styles.button}>
            <Text style={styles.buttonText}>Download Database</Text>
          </Button>
        </View>
      </View>
    );
  }

  // Show download progress screen
  if (initState === "downloading") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Downloading Database</Text>
        <Text style={styles.subtitle}>
          Please wait while the database is downloaded...
        </Text>

        {downloadProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${downloadProgress.percentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {downloadProgress.percentage.toFixed(1)}%
            </Text>

            <View style={styles.progressDetails}>
              <Text style={styles.progressDetailText}>
                Downloaded:{" "}
                {DatabaseDownloadService.formatBytes(
                  downloadProgress.totalBytesWritten
                )}
                {downloadProgress.totalBytesExpected
                  ? ` / ${DatabaseDownloadService.formatBytes(
                      downloadProgress.totalBytesExpected
                    )}`
                  : null}
              </Text>

              {downloadProgress.speedBps && (
                <Text style={styles.progressDetailText}>
                  Speed:{" "}
                  {DatabaseDownloadService.formatBytes(
                    downloadProgress.speedBps
                  )}
                  /s
                </Text>
              )}

              {downloadProgress.estimatedTimeRemaining && (
                <Text style={styles.progressDetailText}>
                  Time remaining:{" "}
                  {DatabaseDownloadService.formatTime(
                    downloadProgress.estimatedTimeRemaining
                  )}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            onPress={cancelDownload}
            style={{ ...styles.button, ...styles.cancelButton }}
          >
            <Text style={styles.buttonText}>Cancel Download</Text>
          </Button>
        </View>
      </View>
    );
  }

  // Database is ready, show the main app
  if (initState === "ready" && isDatabaseReady) {
    return (
      <View style={{ flex: 1 }}>
        {/* Optional: Show database status in a small header */}
        <View style={styles.statusHeader}>
          <Text style={styles.statusText}>
            {isDatabaseAvailable
              ? "✓ Medical Database Loaded"
              : "⚠️ Database Not Available"}
          </Text>
        </View>
        {children}
      </View>
    );
  }

  // Fallback loading state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0066cc" />
      <Text style={styles.title}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 400,
  },
  warningText: {
    fontSize: 12,
    color: "#d97706",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 400,
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 400,
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#0066cc",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  secondaryButton: {
    backgroundColor: "#6b7280",
  },
  cancelButton: {
    backgroundColor: "#dc2626",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 24,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0066cc",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  progressDetails: {
    gap: 4,
  },
  progressDetailText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  statusHeader: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statusText: {
    fontSize: 12,
    color: "#374151",
    textAlign: "center",
    fontWeight: "500",
  },
});
