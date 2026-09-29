import * as __path from "node:path";
import * as __fs from "node:fs";

declare const Deno: any;

if (typeof process !== "undefined" && process.platform === "win32") {
  let exePath = "";
  try {
    if (typeof Deno !== "undefined" && typeof Deno.execPath === "function") {
      exePath = Deno.execPath();
    }
  } catch {}

  if (!exePath) {
    exePath = process.execPath || process.argv[0] || "";
  }

  if (exePath) {
    exePath = __path.resolve(exePath);
    const exeDir = __path.dirname(exePath);
    const candidate = __path.join(exeDir, "gpuix-native.win32-x64-msvc.node");
    if (__fs.existsSync(candidate)) {
      process.env.NAPI_RS_NATIVE_LIBRARY_PATH = candidate;
    }
  }
}
