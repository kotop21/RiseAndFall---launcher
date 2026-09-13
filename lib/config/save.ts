import { writeFile } from "node:fs/promises";
import { pack } from "msgpackr";
import { getConfigPath } from "./dir";
import type { LauncherConfig } from "./types";

export async function saveConfig(config: LauncherConfig): Promise<void> {
  const filePath = getConfigPath();
  const binaryData = pack(config);
  await writeFile(filePath, binaryData);
}
