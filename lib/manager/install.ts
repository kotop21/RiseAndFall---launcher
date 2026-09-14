import { join } from "node:path";
import { unlink, readFile } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { unpack } from "msgpackr";
import { downloadFilesStream } from "@/lib/api/download";
import { ensureDirectory } from "@/lib/explorer/create";
import { extractZip } from "@/lib/explorer/extract";
import { cleanGameDirectory } from "@/lib/explorer/clean";
import { getConfigPath } from "@/lib/config/dir";
import { saveConfig } from "@/lib/config/save";
import { DEFAULT_CONFIG } from "@/lib/config/init";
import type { LauncherConfig } from "@/lib/config/types";

export type InstallStatus =
  | "idle"
  | "downloading"
  | "extracting"
  | "completed"
  | "error";

export interface InstallProgress {
  status: InstallStatus;
  message: string;
  bytesDownloaded?: number;
}

export interface InstallGameOptions {
  targetDir: string;
  lang: "en" | "ru";
  cleanBeforeInstall?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: InstallProgress) => void;
}

export async function installGamePackage({
  targetDir,
  lang,
  cleanBeforeInstall = false,
  signal,
  onProgress,
}: InstallGameOptions): Promise<{
  success: boolean;
  config?: LauncherConfig;
  error?: string;
}> {
  const cleanDir = targetDir.trim();
  if (!cleanDir) {
    console.log("Install: target directory path is empty");
    return { success: false, error: "Target directory path is empty" };
  }

  const okDir = await ensureDirectory(cleanDir);
  if (!okDir) {
    console.log(`Install: failed to access target directory at ${cleanDir}`);
    return {
      success: false,
      error: "Cannot create or access target directory",
    };
  }

  if (cleanBeforeInstall) {
    onProgress?.({
      status: "extracting",
      message: "Cleaning previous installation...",
    });
    await cleanGameDirectory(cleanDir);
  }

  const langKey = `${lang}:lang`;
  const mapsKey = `${lang}:maps`;
  const requestedKeys = ["game", langKey, mapsKey];

  console.log(
    `Install: started download into ${cleanDir} with [${requestedKeys.join(", ")}]`,
  );
  onProgress?.({
    status: "downloading",
    message: "Connecting to download server...",
  });

  const streamRes = await downloadFilesStream(requestedKeys, signal);
  if (!streamRes.ok || !streamRes.stream) {
    const errMsg = streamRes.error || "Failed to download game files";
    console.log(`Install: download stream failed - ${errMsg}`);
    onProgress?.({ status: "error", message: errMsg });
    return { success: false, error: errMsg };
  }

  const tempArchiveName = `install_${Date.now()}.zip`;
  const tempArchivePath = join(cleanDir, tempArchiveName);

  try {
    onProgress?.({
      status: "downloading",
      message: "Downloading package...",
      bytesDownloaded: 0,
    });

    const fileStream = createWriteStream(tempArchivePath);
    const nodeReadable = Readable.fromWeb(streamRes.stream as any);

    let totalBytes = 0;
    nodeReadable.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      onProgress?.({
        status: "downloading",
        message: `Downloading: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`,
        bytesDownloaded: totalBytes,
      });
    });

    await new Promise<void>((resolve, reject) => {
      nodeReadable.pipe(fileStream);
      fileStream.on("finish", () => resolve());
      fileStream.on("error", (err) => reject(err));
      nodeReadable.on("error", (err) => reject(err));
    });

    console.log(
      `Install: archive downloaded (${(totalBytes / 1024 / 1024).toFixed(1)} MB), extracting...`,
    );
    onProgress?.({ status: "extracting", message: "Extracting game files..." });

    const unpacked = await extractZip(tempArchivePath, cleanDir);
    if (!unpacked) {
      throw new Error("Failed to extract game package");
    }

    console.log(`Install: package unpacked successfully to ${cleanDir}`);

    let currentCfg: LauncherConfig = { ...DEFAULT_CONFIG };
    const cfgPath = getConfigPath();
    if (existsSync(cfgPath)) {
      try {
        const raw = await readFile(cfgPath);
        currentCfg = {
          ...DEFAULT_CONFIG,
          ...(unpack(raw) as Partial<LauncherConfig>),
        };
      } catch (err) {
        console.error(
          "Install: error reading existing config, using defaults:",
          err,
        );
      }
    }

    const updatedConfig: LauncherConfig = {
      ...currentCfg,
      gameDir: cleanDir,
      launcherLang: lang,
    };

    await saveConfig(updatedConfig);
    console.log(`Install: gameDir saved to config (${cleanDir})`);

    onProgress?.({
      status: "completed",
      message: "Installation completed successfully!",
    });
    return { success: true, config: updatedConfig };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const errorMsg = isAbort
      ? "Installation cancelled"
      : (err as Error).message || "Installation failed";
    console.log(`Install: error - ${errorMsg}`);
    onProgress?.({ status: "error", message: errorMsg });
    return { success: false, error: errorMsg };
  } finally {
    try {
      await unlink(tempArchivePath);
    } catch {}
  }
}
