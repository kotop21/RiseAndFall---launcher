import { readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

export async function cleanGameDirectory(targetDir: string): Promise<boolean> {
  const cleanRoot = targetDir.trim();
  if (!cleanRoot || !existsSync(cleanRoot)) {
    return false;
  }

  const savedGamesPath = resolve(join(cleanRoot, "Data", "Saved Games"));

  console.log(
    `Clean: preparing directory ${cleanRoot} (preserving Data/Saved Games)`,
  );

  try {
    const entries = await readdir(cleanRoot, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(cleanRoot, entry.name);
      const normalizedPath = resolve(fullPath);

      if (entry.isDirectory() && entry.name.toLowerCase() === "data") {
        const dataEntries = await readdir(fullPath, { withFileTypes: true });
        for (const dataItem of dataEntries) {
          const dataItemPath = join(fullPath, dataItem.name);
          if (resolve(dataItemPath) !== savedGamesPath) {
            await rm(dataItemPath, { recursive: true, force: true });
          }
        }
      } else {
        await rm(normalizedPath, { recursive: true, force: true });
      }
    }

    console.log("Clean: game directory cleaned successfully");
    return true;
  } catch (err) {
    console.error("Clean: error while cleaning game directory:", err);
    return false;
  }
}
