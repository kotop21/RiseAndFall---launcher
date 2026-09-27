import type { ReleaseItem } from "@/lib/github/types";

export type UpdatePhase =
  | "idle"
  | "checking"
  | "downloading"
  | "extracting"
  | "applying"
  | "completed"
  | "error";

export interface UpdateProgress {
  phase: UpdatePhase;
  message: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  percent?: number;
}

export interface UpdateOptions {
  signal?: AbortSignal;
  onProgress?: (progress: UpdateProgress) => void;
}

export interface UpdateResult {
  success: boolean;
  isDev?: boolean;
  error?: string;
  stagedDir?: string;
}
