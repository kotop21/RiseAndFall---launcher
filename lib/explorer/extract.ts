import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { unlink } from "node:fs/promises";

export async function extractSingleZip(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  if (!existsSync(archivePath)) {
    console.error("Extract: archive file does not exist:", archivePath);
    return false;
  }

  console.log(`Extract: unpacking ${archivePath} into ${destinationDir}`);

  let cmd: string;
  let args: string[];

  if (process.platform === "win32") {
    cmd = "tar.exe";
    args = ["-xf", archivePath, "-C", destinationDir];
  } else {
    cmd = "unzip";
    args = ["-o", "-q", archivePath, "-d", destinationDir];
  }

  return new Promise<boolean>((resolve) => {
    const proc = spawn(cmd, args, { stdio: "ignore" });

    proc.on("error", () => {
      if (process.platform === "win32") {
        const psArgs = [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destinationDir}' -Force`,
        ];
        const psProc = spawn("powershell.exe", psArgs, { stdio: "ignore" });
        psProc.on("close", (psCode) => resolve(psCode === 0));
        psProc.on("error", () => resolve(false));
      } else {
        resolve(false);
      }
    });

    proc.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

export async function extractZip(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  const rootSuccess = await extractSingleZip(archivePath, destinationDir);
  if (!rootSuccess) return false;

  const entries = readdirSync(destinationDir);
  const nestedZips = entries.filter(
    (file) =>
      file.toLowerCase().endsWith(".zip") &&
      join(destinationDir, file) !== archivePath,
  );

  for (const zipFile of nestedZips) {
    const fullZipPath = join(destinationDir, zipFile);
    console.log(`Extract: unpacking nested archive ${zipFile}`);
    const nestedSuccess = await extractSingleZip(fullZipPath, destinationDir);
    if (nestedSuccess) {
      try {
        await unlink(fullZipPath);
      } catch {}
    }
  }

  return true;
}
