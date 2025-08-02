/**
 * @file database-context.tsx
 * @description React context for managing database initialization and download state
 * Provides application-wide access to database status and download operations
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getDatabaseDownloadService,
  DatabaseStatus,
  DownloadProgress,
  DownloadState,
} from "./database-download-service";
import { getTursoDBService } from "./turso-db-service";

/**
 * Database initialization states
 */
export type DatabaseInitState =
  | "checking"
  | "ready"
  | "missing"
  | "downloading"
  | "error";

/**
 * Database context state
 */
export interface DatabaseContextState {
  /** Current initialization state */
  initState: DatabaseInitState;
  /** Database status information */
  databaseStatus: DatabaseStatus | null;
  /** Download progress information */
  downloadProgress: DownloadProgress | null;
  /** Download state */
  downloadState: DownloadState;
  /** Error message if any */
  error: string | null;
  /** Whether the database service is ready for use */
  isDatabaseReady: boolean;
  /** Whether database is available and loaded */
  isDatabaseAvailable: boolean;
}

/**
 * Database context actions
 */
export interface DatabaseContextActions {
  /** Start downloading the database */
  startDownload: () => Promise<void>;
  /** Cancel the current download */
  cancelDownload: () => Promise<void>;
  /** Remove local database and start fresh download */
  resetAndDownload: () => Promise<void>;
  /** Check database status and refresh state */
  refreshStatus: () => Promise<void>;
  /** Clear any error state */
  clearError: () => void;
}

/**
 * Combined database context
 */
export interface DatabaseContextValue
  extends DatabaseContextState,
    DatabaseContextActions {}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

/**
 * Database provider component that manages database initialization and download state
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [initState, setInitState] = useState<DatabaseInitState>("checking");
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(
    null
  );
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [isDatabaseAvailable, setIsDatabaseAvailable] = useState(false);

  const downloadService = getDatabaseDownloadService();
  const dbService = getTursoDBService();

  /**
   * Initialize database and check status
   */
  const initializeDatabase = useCallback(async () => {
    try {
      setInitState("checking");
      setError(null);

      // Check database status
      const status = await downloadService.getDatabaseStatus();
      setDatabaseStatus(status);

      if (status.exists && status.isValid) {
        // Database exists and is valid, initialize the database service
        console.log("Valid database found, initializing service...");
        await dbService.initialize();

        const dbInfo = dbService.getDatabaseInfo();
        setIsDatabaseAvailable(dbInfo.isDatabaseAvailable);
        setIsDatabaseReady(dbService.isReady());
        setInitState("ready");
      } else if (status.exists && !status.isValid) {
        // Database exists but is corrupted
        console.warn("Database file exists but appears to be corrupted");
        setInitState("missing");
        setError(
          "Database file appears to be corrupted. Please download a fresh copy."
        );
      } else {
        // No database found
        console.log("No database found");
        setInitState("missing");
      }
    } catch (err) {
      console.error("Error initializing database:", err);
      setError(err instanceof Error ? err.message : String(err));
      setInitState("error");
    }
  }, [downloadService, dbService]);

  /**
   * Start downloading the database
   */
  const startDownload = useCallback(async () => {
    try {
      setError(null);
      setInitState("downloading");
      setDownloadState("downloading");

      await downloadService.startDownload(
        // Progress callback
        (progress) => {
          setDownloadProgress(progress);
        },
        // Error callback
        (err) => {
          setError(err.message);
          setInitState("error");
          setDownloadState("error");
        },
        // Complete callback
        async () => {
          setDownloadProgress(null);
          setDownloadState("completed");

          // Re-initialize database service with new database
          try {
            await dbService.reinitialize();
            const dbInfo = dbService.getDatabaseInfo();
            setIsDatabaseAvailable(dbInfo.isDatabaseAvailable);
            setIsDatabaseReady(dbService.isReady());
            setInitState("ready");

            // Refresh status
            await refreshStatus();
          } catch (err) {
            console.error("Error reinitializing database after download:", err);
            setError(
              "Database downloaded but failed to initialize. Please try again."
            );
            setInitState("error");
          }
        }
      );
    } catch (err) {
      console.error("Error starting download:", err);
      setError(err instanceof Error ? err.message : String(err));
      setInitState("error");
      setDownloadState("error");
    }
  }, [downloadService, dbService]);

  /**
   * Cancel the current download
   */
  const cancelDownload = useCallback(async () => {
    try {
      await downloadService.cancelDownload();
      setDownloadProgress(null);
      setDownloadState("cancelled");
      setInitState("missing");
    } catch (err) {
      console.error("Error cancelling download:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [downloadService]);

  /**
   * Remove local database and start fresh download
   */
  const resetAndDownload = useCallback(async () => {
    try {
      setError(null);

      // Remove existing database
      await downloadService.removeLocalDatabase();

      // Reset download state
      downloadService.resetDownloadState();
      setDownloadState("idle");
      setDownloadProgress(null);

      // Start fresh download
      await startDownload();
    } catch (err) {
      console.error("Error resetting and downloading:", err);
      setError(err instanceof Error ? err.message : String(err));
      setInitState("error");
    }
  }, [downloadService, startDownload]);

  /**
   * Refresh database status
   */
  const refreshStatus = useCallback(async () => {
    try {
      const status = await downloadService.getDatabaseStatus();
      setDatabaseStatus(status);

      if (dbService.isReady()) {
        const dbInfo = dbService.getDatabaseInfo();
        setIsDatabaseAvailable(dbInfo.isDatabaseAvailable);
        setIsDatabaseReady(true);
      }
    } catch (err) {
      console.error("Error refreshing status:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [downloadService, dbService]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeDatabase();
  }, [initializeDatabase]);

  // Update download state from service
  useEffect(() => {
    const currentDownloadState = downloadService.getDownloadState();
    if (currentDownloadState !== downloadState) {
      setDownloadState(currentDownloadState);
    }
  }, [downloadService, downloadState]);

  const contextValue: DatabaseContextValue = {
    // State
    initState,
    databaseStatus,
    downloadProgress,
    downloadState,
    error,
    isDatabaseReady,
    isDatabaseAvailable,

    // Actions
    startDownload,
    cancelDownload,
    resetAndDownload,
    refreshStatus,
    clearError,
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
}

/**
 * Hook to use the database context
 */
export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}

/**
 * Hook to use database context with error handling
 */
export function useDatabaseSafe(): DatabaseContextValue | null {
  return useContext(DatabaseContext);
}
