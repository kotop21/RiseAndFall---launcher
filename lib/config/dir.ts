import { homedir, platform } from "node:os";
import { join } from "node:path";

export function getConfigPath(): string {
  const os = platform();
  const home = homedir();

  if (os === "win32") {
    return join(
      process.env.APPDATA || join(home, "AppData", "Roaming"),
      "RafLauncher",
      "config.bin",
    );
  }

  if (os === "darwin") {
    return join(
      home,
      "Library",
      "Application Support",
      "RafLauncher",
      "config.bin",
    );
  }

  return join(
    process.env.XDG_CONFIG_HOME || join(home, ".config"),
    "raf-launcher",
    "config.bin",
  );
}
