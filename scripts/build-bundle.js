import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const rootDir = resolve(import.meta.dir, "..");

function parseDotEnv(filePath) {
  const result = {};
  if (!existsSync(filePath)) return result;

  const content = readFileSync(filePath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) result[key] = val;
  }
  return result;
}

function isLocalUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("0.0.0.0");
}

function stripTrailingSlashes(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

function resolveMode() {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--mode=prod" || arg === "--prod") return "prod";
    if (arg === "--mode=dev" || arg === "--dev") return "dev";
    if (arg === "--mode" && (process.argv[i + 1] === "prod" || process.argv[i + 1] === "dev")) {
      return process.argv[i + 1];
    }
  }
  const relEnv = (process.env.RELEASE || "").toLowerCase();
  if (relEnv === "1" || relEnv === "true") return "prod";
  return "dev";
}

const mode = resolveMode();
const isProd = mode === "prod";
const dotEnv = parseDotEnv(join(rootDir, ".env"));

function getVar(name) {
  const fromEnv = process.env[name]?.trim();
  if (fromEnv) return fromEnv;
  const fromFile = dotEnv[name]?.trim();
  if (fromFile) return fromFile;
  return "";
}

const rawLegacyApi = stripTrailingSlashes(getVar("API_URL"));
const rawExplicitProd = stripTrailingSlashes(getVar("PROD_API_URL"));
const rawExplicitDev = stripTrailingSlashes(getVar("DEV_API_URL"));

const prodUrl =
  rawExplicitProd || (!isLocalUrl(rawLegacyApi) ? rawLegacyApi : "") || "https://raf-game.com";

const devUrl = isProd ? "" : rawExplicitDev || rawLegacyApi || "http://localhost:3000";

console.log(`Bundle: building in ${isProd ? "PRODUCTION" : "DEV"} mode`);
console.log(`Bundle: PROD_API_URL = ${prodUrl}`);
if (!isProd) {
  console.log(`Bundle: DEV_API_URL  = ${devUrl}`);
}

const devLibStub = join(rootDir, "lib/dev/prod-stub.ts");
const devComponentsStub = join(rootDir, "components/dev/prod-stub.tsx");

/** @type {import("bun").BunPlugin} */
const stripDevModulesPlugin = {
  name: "strip-dev-modules",
  setup(build) {
    build.onResolve({ filter: /^@\/lib\/dev(\/.*)?$/ }, () => ({
      path: devLibStub,
    }));

    build.onResolve({ filter: /^@\/components\/dev(\/.*)?$/ }, () => ({
      path: devComponentsStub,
    }));

    build.onResolve({ filter: /^\.\.?\/.*$/ }, (args) => {
      if (!args.importer) return undefined;
      const target = resolve(dirname(args.importer), args.path);
      const libDevDir = join(rootDir, "lib/dev");
      const compDevDir = join(rootDir, "components/dev");

      if (
        (target === libDevDir || target.startsWith(`${libDevDir}/`) || target.startsWith(`${libDevDir}\\`)) &&
        !target.endsWith("prod-stub.ts")
      ) {
        return { path: devLibStub };
      }

      if (
        (target === compDevDir || target.startsWith(`${compDevDir}/`) || target.startsWith(`${compDevDir}\\`)) &&
        !target.endsWith("prod-stub.tsx")
      ) {
        return { path: devComponentsStub };
      }

      return undefined;
    });
  },
};

const outDir = join(rootDir, "dist/build");
await mkdir(outDir, { recursive: true });

const buildResult = await Bun.build({
  entrypoints: [join(rootDir, "index.tsx")],
  outdir: outDir,
  target: "node",
  minify: true,
  sourcemap: "external",
  external: [
    "@gpuix/native-darwin-arm64",
    "@gpuix/native-darwin-universal",
    "@gpuix/native-win32-x64-msvc",
  ],
  define: {
    "process.env.IS_DEV": JSON.stringify(isProd ? "false" : "true"),
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.API_URL": JSON.stringify(prodUrl),
    "process.env.PROD_API_URL": JSON.stringify(prodUrl),
    "process.env.DEV_API_URL": JSON.stringify(devUrl),
  },
  plugins: isProd ? [stripDevModulesPlugin] : [],
});

if (!buildResult.success) {
  console.error("Bundle build failed:");
  for (const log of buildResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`Bundle: output written to dist/build (${buildResult.outputs.length} files)`);
