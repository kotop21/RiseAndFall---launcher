import { existsSync } from "node:fs";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { logger } from "@/lib/logger";
import { hasInstallManifest, removeInstalledFiles } from "@/lib/manager/install-manifest";

export async function cleanGameDirectory(targetDir: string): Promise<boolean> {
  const cleanRoot = targetDir.trim();
  if (!cleanRoot || !existsSync(cleanRoot)) {
    logger.error("clean", `Target directory does not exist or empty: ${cleanRoot}`);
    return false;
  }

  // Защита: ни в коем случае не очищать корень файловой системы или корень диска Windows
  const rootOnly = cleanRoot.replace(/[\\/]+$/, "");
  if (rootOnly === "" || /^[a-zA-Z]:$/.test(rootOnly)) {
    logger.error("clean", `Refusing to clean root directory: ${cleanRoot}`);
    return false;
  }

  // Если есть манифест установки, выполняем безопасное удаление строго по манифесту
  if (await hasInstallManifest(cleanRoot)) {
    logger.info("clean", `Install manifest found in ${cleanRoot}, removing tracked files only`);
    return await removeInstalledFiles(cleanRoot);
  }

  logger.info(
    "clean",
    `No install manifest found in ${cleanRoot}, falling back to legacy clean with Data/Saved Games protection`,
  );

  const savedGamesPath = resolve(join(cleanRoot, "Data", "Saved Games"));
  const hasSavedGames = existsSync(savedGamesPath);
  const tempSavedPath = join(cleanRoot, `.temp_saved_${Date.now()}`);
  const trashPath = join(cleanRoot, `.temp_trash_${Date.now()}`);

  try {
    // 1. Сохраняем Data/Saved Games через быстрый rename
    if (hasSavedGames) {
      await rename(savedGamesPath, tempSavedPath);
    }

    // 2. Создаем временную папку корзины для мгновенного перемещения
    await mkdir(trashPath, { recursive: true });

    const entries = await readdir(cleanRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".temp_saved_") || entry.name.startsWith(".temp_trash_")) {
        continue;
      }
      const itemSrc = join(cleanRoot, entry.name);
      const itemDest = join(trashPath, entry.name);
      try {
        await rename(itemSrc, itemDest);
      } catch {
        // Если rename не сработал (например, занят процессом), пробуем fallback rm
        await rm(itemSrc, { recursive: true, force: true }).catch(() => {});
      }
    }

    // 3. Восстанавливаем Data/Saved Games
    if (hasSavedGames && existsSync(tempSavedPath)) {
      await mkdir(join(cleanRoot, "Data"), { recursive: true });
      await rename(tempSavedPath, savedGamesPath);
    }

    // 4. Удаляем корзину в фоне (non-blocking)
    rm(trashPath, { recursive: true, force: true }).catch((err) => {
      logger.error("clean", "Background trash deletion error:", err);
    });

    logger.info("clean", `Cleaned game directory successfully: ${cleanRoot}`);
    return true;
  } catch (err) {
    if (existsSync(tempSavedPath)) {
      try {
        await mkdir(join(cleanRoot, "Data"), { recursive: true });
        await rename(tempSavedPath, savedGamesPath);
      } catch {}
    }
    logger.error("clean", `Failed cleaning directory at ${cleanRoot}:`, err);
    return false;
  }
}
