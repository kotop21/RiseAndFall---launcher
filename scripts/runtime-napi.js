if (typeof process !== "undefined" && process.platform === "win32") {
  try {
    let exePath = "";
    const denoObj = globalThis.Deno;
    if (denoObj && typeof denoObj.execPath === "function") {
      exePath = denoObj.execPath();
    } else if (process.execPath) {
      exePath = process.execPath;
    } else if (process.argv && process.argv[0]) {
      exePath = process.argv[0];
    }

    if (exePath) {
      const normalized = exePath.replace(/\\/g, "/");
      const lastSlash = normalized.lastIndexOf("/");
      const exeDir = lastSlash !== -1 ? normalized.slice(0, lastSlash) : ".";
      const candidate = (exeDir + "/gpuix-native.win32-x64-msvc.node").replace(/\//g, "\\");

      let exists = false;
      if (denoObj && typeof denoObj.statSync === "function") {
        try {
          denoObj.statSync(candidate);
          exists = true;
        } catch (_) {}
      }

      if (exists) {
        process.env.NAPI_RS_NATIVE_LIBRARY_PATH = candidate;
      }
    }
  } catch (_) {}
}
