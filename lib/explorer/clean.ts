import { readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "@/lib/logger";

export async function cleanGameDirectory(targetDir: string): Promise<boolean> {
  const cleanRoot = targetDir.trim();
  if (!cleanRoot || !existsSync(cleanRoot)) {
    logger.error("clean", `Target directory does not exist or empty: ${cleanRoot}`);
    return false;
  }

  const savedGamesPath = resolve(join(cleanRoot, "Data", "Saved Games"));

  try {
    const entries = await readdir(cleanRoot, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(cleanRoot, entry.name);
      if (entry.isDirectory() && entry.name.toLowerCase() === "data") {
        const dataEntries = await readdir(fullPath, { withFileTypes: true });
        for (const dataItem of dataEntries) {
          const itemPath = join(fullPath, dataItem.name);
          if (resolve(itemPath) !== savedGamesPath) {
            await rm(itemPath, { recursive: true, force: true });
          }
        }
      } else {
        await rm(resolve(fullPath), { recursive: true, force: true });
      }
    }
    logger.info("clean", `Cleaned game directory successfully: ${cleanRoot}`);
    return true;
  } catch (err) {
    logger.error("clean", `Failed cleaning directory at ${cleanRoot}:`, err);
    return false;
  }
}
