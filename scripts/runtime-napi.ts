import * as __path from "node:path";
import * as __fs from "node:fs";

if (typeof process !== "undefined" && process.platform === "win32") {
  const exePath = process.execPath || process.argv[0] || "";
  const exeDir = __path.dirname(exePath);
  const candidate = __path.join(exeDir, "gpuix-native.win32-x64-msvc.node");
  if (__fs.existsSync(candidate)) {
    process.env.NAPI_RS_NATIVE_LIBRARY_PATH = candidate;
  }
}
