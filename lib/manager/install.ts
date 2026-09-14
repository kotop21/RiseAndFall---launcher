import { join } from "node:path";
import { unlink, readFile } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { unpack } from "msgpackr";
import { downloadSingleFileStream } from "@/lib/api/download";
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

interface PackageStep {
  key: string;
  label: string;
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

  const packages: PackageStep[] = [
    { key: "game", label: "Base Game" },
    { key: `lang:${lang}`, label: `Language Pack (${lang.toUpperCase()})` },
    { key: "mod:bfm", label: "BFM Mod" },
  ];

  let cumulativeBytes = 0;

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const stepLabel = `[${i + 1}/${packages.length}] ${pkg.label}`;

    console.log(`Install: requesting ${pkg.key} (${stepLabel})`);
    onProgress?.({
      status: "downloading",
      message: `Connecting for ${stepLabel}...`,
      bytesDownloaded: cumulativeBytes,
    });

    const streamRes = await downloadSingleFileStream(pkg.key, signal);
    if (!streamRes.ok || !streamRes.stream) {
      const errMsg = streamRes.error || `Failed to download ${pkg.label}`;
      console.log(`Install: ${pkg.key} download failed - ${errMsg}`);
      onProgress?.({ status: "error", message: errMsg });
      return { success: false, error: errMsg };
    }

    const tempArchiveName = `pkg_${i}_${Date.now()}.zip`;
    const tempArchivePath = join(cleanDir, tempArchiveName);

    try {
      const fileStream = createWriteStream(tempArchivePath);
      const nodeReadable = Readable.fromWeb(streamRes.stream as any);

      let stepBytes = 0;
      nodeReadable.on("data", (chunk: Buffer) => {
        stepBytes += chunk.length;
        onProgress?.({
          status: "downloading",
          message: `${stepLabel}: ${(stepBytes / 1024 / 1024).toFixed(1)} MB`,
          bytesDownloaded: cumulativeBytes + stepBytes,
        });
      });

      await new Promise<void>((resolve, reject) => {
        nodeReadable.pipe(fileStream);
        fileStream.on("finish", () => resolve());
        fileStream.on("error", (err) => reject(err));
        nodeReadable.on("error", (err) => reject(err));
      });

      cumulativeBytes += stepBytes;

      console.log(`Install: downloaded ${pkg.key}, extracting...`);
      onProgress?.({
        status: "extracting",
        message: `Extracting ${stepLabel}...`,
        bytesDownloaded: cumulativeBytes,
      });

      const unpacked = await extractZip(tempArchivePath, cleanDir);
      if (!unpacked) {
        throw new Error(`Failed to extract ${pkg.label}`);
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      const errorMsg = isAbort
        ? "Installation cancelled"
        : (err as Error).message || `Failed processing ${pkg.label}`;
      console.log(`Install: error - ${errorMsg}`);
      onProgress?.({ status: "error", message: errorMsg });
      try {
        await unlink(tempArchivePath);
      } catch {}
      return { success: false, error: errorMsg };
    } finally {
      try {
        await unlink(tempArchivePath);
      } catch {}
    }
  }

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
    bytesDownloaded: cumulativeBytes,
  });

  return { success: true, config: updatedConfig };
}
