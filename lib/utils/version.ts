import pkg from "@/package.json";
import { BUILD_VERSION } from "./version.generated";

export function getLauncherVersion(): string {
  if (BUILD_VERSION && typeof BUILD_VERSION === "string") {
    return BUILD_VERSION;
  }
  return pkg.version || "0.0.0";
}
