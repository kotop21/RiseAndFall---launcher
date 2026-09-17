import { writeFile } from "node:fs/promises";
import { pack } from "msgpackr";
import { getConfigPath } from "./dir";
import type { LauncherConfig } from "./types";
import { logger } from "@/lib/logger";

export async function saveConfig(config: LauncherConfig): Promise<void> {
  const path = getConfigPath();
  try {
    await writeFile(path, pack(config));
  } catch (err) {
    logger.error("config", `Failed saving configuration to ${path}:`, err);
    throw err;
  }
}
