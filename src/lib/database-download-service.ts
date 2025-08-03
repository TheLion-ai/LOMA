/**
 * @file database-download-service.ts
 * @description Service for downloading and managing the external medical database
 * Handles download progress, file validation, and database file management
 */

import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

// Configuration constants
const DATABASE_URL =
  "https://pub-c2fb3b24963f467199aa6f728b231e0f.r2.dev/miriad_medical_minlm.db";
const LOCAL_DB_FILENAME = "miriad_medical.db";

/**
 * Download progress information
 */
export interface DownloadProgress {
  /** Total bytes downloaded so far */
  totalBytesWritten: number;
  /** Total expected bytes (if known) */
  totalBytesExpected?: number;
  /** Download progress as percentage (0-100) */
  percentage: number;
  /** Current download speed in bytes per second */
  speedBps?: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Database status information
 */
export interface DatabaseStatus {
  /** Whether the database file exists locally */
  exists: boolean;
  /** File size in bytes if it exists */
  fileSize?: number;
  /** Last modified date if it exists */
  lastModified?: Date;
  /** Whether the file appears to be valid/complete */
  isValid?: boolean;
  /** Path to the local database file */
  localPath: string;
  /** File name */
  fileName: string;
}

/**
 * Download state
 */
export type DownloadState =
  | "idle"
  | "downloading"
  | "completed"
  | "error"
  | "cancelled";

/**
 * Service for managing external database downloads and local database file operations
 */
export class DatabaseDownloadService {
  private downloadState: DownloadState = "idle";
  private downloadTask: FileSystem.DownloadResumable | null = null;
  private progressCallback: ((progress: DownloadProgress) => void) | null =
    null;
  private errorCallback: ((error: Error) => void) | null = null;
  private completeCallback: (() => void) | null = null;

  /**
   * Gets the local path where the database file should be stored
   */
  getLocalDatabasePath(): string {
    if (Platform.OS === "web") {
      throw new Error("Database download not supported on web platform");
    }

    return `${FileSystem.documentDirectory}${LOCAL_DB_FILENAME}`;
  }

  /**
   * Checks the current status of the local database file
   */
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    const localPath = this.getLocalDatabasePath();

    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);

      if (fileInfo.exists) {
        const isValid = await this.validateDatabaseFile(localPath);

        return {
          exists: true,
          fileSize: fileInfo.size,
          lastModified: fileInfo.modificationTime
            ? new Date(fileInfo.modificationTime * 1000)
            : undefined,
          isValid,
          localPath,
          fileName: LOCAL_DB_FILENAME,
        };
      } else {
        return {
          exists: false,
          localPath,
          fileName: LOCAL_DB_FILENAME,
        };
      }
    } catch (error) {
      console.error("Error checking database status:", error);
      return {
        exists: false,
        localPath,
        fileName: LOCAL_DB_FILENAME,
      };
    }
  }

  /**
   * Validates that the database file is not corrupted and appears to be a valid SQLite database
   */
  private async validateDatabaseFile(filePath: string): Promise<boolean> {
    try {
      // Read the first 16 bytes to check SQLite file header
      const headerUri = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
        length: 16,
        position: 0,
      });

      // Decode base64 to get the actual header bytes
      const headerBytes = this.base64ToBytes(headerUri);

      // SQLite files start with "SQLite format 3\0"
      const expectedHeader = [
        0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61,
        0x74, 0x20, 0x33, 0x00,
      ];

      if (headerBytes.length < expectedHeader.length) {
        return false;
      }

      for (let i = 0; i < expectedHeader.length; i++) {
        if (headerBytes[i] !== expectedHeader[i]) {
          return false;
        }
      }

      // Additional check: ensure file size is reasonable (at least 1MB)
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists || !fileInfo.size) {
        return false;
      }
      // const minSize = 1024 * 1024; // 1MB
      // return fileInfo.size >= minSize;
      return true;
    } catch (error) {
      console.error("Error validating database file:", error);
      return false;
    }
  }

  /**
   * Converts base64 string to byte array
   */
  private base64ToBytes(base64: string): number[] {
    try {
      const binaryString = atob(base64);
      const bytes = new Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error("Error converting base64 to bytes:", error);
      return [];
    }
  }

  /**
   * Starts downloading the database from the external URL
   */
  async startDownload(
    onProgress?: (progress: DownloadProgress) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<void> {
    if (this.downloadState === "downloading") {
      throw new Error("Download already in progress");
    }

    if (Platform.OS === "web") {
      throw new Error("Database download not supported on web platform");
    }

    try {
      this.downloadState = "downloading";
      this.progressCallback = onProgress || null;
      this.errorCallback = onError || null;
      this.completeCallback = onComplete || null;

      const localPath = this.getLocalDatabasePath();

      // Remove existing file if it exists
      const existingFile = await FileSystem.getInfoAsync(localPath);
      if (existingFile.exists) {
        await FileSystem.deleteAsync(localPath);
      }

      // Create resumable download
      this.downloadTask = FileSystem.createDownloadResumable(
        DATABASE_URL,
        localPath,
        {},
        this.handleDownloadProgress.bind(this)
      );

      console.log(`Starting database download from ${DATABASE_URL}`);
      console.log(`Downloading to: ${localPath}`);

      // Start the download
      const result = await this.downloadTask.downloadAsync();

      if (result && result.status === 200) {
        this.downloadState = "completed";
        console.log("Database download completed successfully");

        // Validate the downloaded file
        const isValid = await this.validateDatabaseFile(localPath);
        if (!isValid) {
          throw new Error(
            "Downloaded database file appears to be corrupted or invalid"
          );
        }

        this.completeCallback?.();
      } else {
        throw new Error(
          `Download failed with status: ${result?.status || "unknown"}`
        );
      }
    } catch (error) {
      this.downloadState = "error";
      const downloadError =
        error instanceof Error ? error : new Error(String(error));
      console.error("Database download failed:", downloadError);
      this.errorCallback?.(downloadError);
      throw downloadError;
    } finally {
      this.downloadTask = null;
    }
  }

  /**
   * Handles download progress updates
   */
  private handleDownloadProgress(
    progress: FileSystem.DownloadProgressData
  ): void {
    try {
      const percentage =
        progress.totalBytesExpectedToWrite > 0
          ? (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) *
            100
          : 0;

      const progressInfo: DownloadProgress = {
        totalBytesWritten: progress.totalBytesWritten,
        totalBytesExpected:
          progress.totalBytesExpectedToWrite > 0
            ? progress.totalBytesExpectedToWrite
            : undefined,
        percentage: Math.min(100, Math.max(0, percentage)),
      };

      // Calculate download speed and estimated time remaining
      if (this.lastProgressTime && this.lastBytesWritten !== undefined) {
        const timeDiff = Date.now() - this.lastProgressTime;
        const bytesDiff = progress.totalBytesWritten - this.lastBytesWritten;

        if (timeDiff > 0) {
          progressInfo.speedBps = (bytesDiff / timeDiff) * 1000; // bytes per second

          if (
            progressInfo.speedBps > 0 &&
            progress.totalBytesExpectedToWrite > 0
          ) {
            const remainingBytes =
              progress.totalBytesExpectedToWrite - progress.totalBytesWritten;
            progressInfo.estimatedTimeRemaining =
              remainingBytes / progressInfo.speedBps;
          }
        }
      }

      this.lastProgressTime = Date.now();
      this.lastBytesWritten = progress.totalBytesWritten;

      this.progressCallback?.(progressInfo);
    } catch (error) {
      console.error("Error handling download progress:", error);
    }
  }

  private lastProgressTime?: number;
  private lastBytesWritten?: number;

  /**
   * Cancels the current download
   */
  async cancelDownload(): Promise<void> {
    if (this.downloadTask && this.downloadState === "downloading") {
      try {
        await this.downloadTask.cancelAsync();
        this.downloadState = "cancelled";
        console.log("Database download cancelled");
      } catch (error) {
        console.error("Error cancelling download:", error);
      } finally {
        this.downloadTask = null;
      }
    }
  }

  /**
   * Removes the local database file
   */
  async removeLocalDatabase(): Promise<void> {
    const localPath = this.getLocalDatabasePath();

    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath);
        console.log("Local database file removed successfully");
      }
    } catch (error) {
      console.error("Error removing local database:", error);
      throw new Error(
        `Failed to remove local database: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Gets the current download state
   */
  getDownloadState(): DownloadState {
    return this.downloadState;
  }

  /**
   * Resets the download state (useful after errors or cancellations)
   */
  resetDownloadState(): void {
    if (this.downloadState !== "downloading") {
      this.downloadState = "idle";
      this.downloadTask = null;
      this.progressCallback = null;
      this.errorCallback = null;
      this.completeCallback = null;
    }
  }

  /**
   * Formats bytes to human readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Formats seconds to human readable time string
   */
  static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}

/**
 * Singleton instance of the DatabaseDownloadService
 */
let downloadServiceInstance: DatabaseDownloadService | null = null;

/**
 * Gets the singleton instance of the DatabaseDownloadService
 */
export function getDatabaseDownloadService(): DatabaseDownloadService {
  if (!downloadServiceInstance) {
    downloadServiceInstance = new DatabaseDownloadService();
  }
  return downloadServiceInstance;
}
