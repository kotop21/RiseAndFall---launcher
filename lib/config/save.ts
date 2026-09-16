import { writeFile } from "node:fs/promises";
import { pack } from "msgpackr";
import { getConfigPath } from "./dir";
import type { LauncherConfig } from "./types";
import { createLauncherError } from "@/lib/errors";

export async function saveConfig(config: LauncherConfig): Promise<void> {
  try {
    await writeFile(getConfigPath(), pack(config));
  } catch (err) {
    throw createLauncherError("CONFIG_WRITE_FAILED", `Failed writing configuration: ${String(err)}`, err);
  }
}
