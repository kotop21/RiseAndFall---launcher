import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { unlink } from "node:fs/promises";
import { logger } from "@/lib/logger";

export async function extractSingleZip(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  if (!existsSync(archivePath)) {
    logger.error("extract", `Archive not found at: ${archivePath}`);
    return false;
  }

  const [cmd, args] =
    process.platform === "win32"
      ? ["tar.exe", ["-xf", archivePath, "-C", destinationDir]]
      : ["unzip", ["-o", "-q", archivePath, "-d", destinationDir]];

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (val: boolean) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };

    const proc = spawn(cmd, args, { stdio: "ignore" });

    proc.on("error", (err) => {
      logger.error("extract", `Primary unpack tool failed (${cmd}):`, err);
      if (process.platform === "win32") {
        const safeArchive = archivePath.replace(/'/g, "''");
        const safeDest = destinationDir.replace(/'/g, "''");
        const psProc = spawn(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `Expand-Archive -LiteralPath '${safeArchive}' -DestinationPath '${safeDest}' -Force`,
          ],
          { stdio: "ignore" },
        );
        psProc.on("close", (code) => finish(code === 0));
        psProc.on("error", (psErr) => {
          logger.error("extract", "PowerShell Expand-Archive failed:", psErr);
          finish(false);
        });
      } else {
        finish(false);
      }
    });

    proc.on("close", (code) => {
      finish(code === 0);
    });
  });
}

export async function extractZip(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  if (!(await extractSingleZip(archivePath, destinationDir))) return false;

  try {
    const nestedZips = readdirSync(destinationDir).filter(
      (file) => file.toLowerCase().endsWith(".zip") && join(destinationDir, file) !== archivePath,
    );

    for (const zipFile of nestedZips) {
      const fullZipPath = join(destinationDir, zipFile);
      if (await extractSingleZip(fullZipPath, destinationDir)) {
        try {
          await unlink(fullZipPath);
        } catch (err) {
          logger.error("extract", `Failed removing nested zip ${fullZipPath}:`, err);
        }
      }
    }
    return true;
  } catch (err) {
    logger.error("extract", "Nested archive extraction failed:", err);
    return false;
  }
}
