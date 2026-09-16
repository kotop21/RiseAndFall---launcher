import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { unlink } from "node:fs/promises";

export async function extractSingleZip(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  if (!existsSync(archivePath)) return false;

  const [cmd, args] =
    process.platform === "win32"
      ? ["tar.exe", ["-xf", archivePath, "-C", destinationDir]]
      : ["unzip", ["-o", "-q", archivePath, "-d", destinationDir]];

  return new Promise<boolean>((resolve) => {
    const proc = spawn(cmd, args, { stdio: "ignore" });

    proc.on("error", () => {
      if (process.platform === "win32") {
        const psProc = spawn(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destinationDir}' -Force`,
          ],
          { stdio: "ignore" },
        );
        psProc.on("close", (code) => resolve(code === 0));
        psProc.on("error", () => resolve(false));
      } else {
        resolve(false);
      }
    });

    proc.on("close", (code) => resolve(code === 0));
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
        } catch {}
      }
    }
    return true;
  } catch {
    return false;
  }
}
