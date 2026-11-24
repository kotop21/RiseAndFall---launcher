import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pkg from "../package.json" with { type: "json" };

const version = pkg.version || "0.0.0";
const targetVersionPath = join(import.meta.dir, "../lib/utils/version.generated.ts");
const targetFeaturesPath = join(import.meta.dir, "../lib/features/generated-features.ts");

const versionContent = `// Generated at build time - DO NOT EDIT MANUALLY
export const BUILD_VERSION = ${JSON.stringify(version)};
`;

await writeFile(targetVersionPath, versionContent, "utf-8");
console.log(`Version: generated build target with version v${version}`);

// Collect all feature IDs from app/ and components/
const featureIdRegex = /featureId\s*=\s*["']([^"']+)["']/g;
const collected = new Set();

async function scanDirectory(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        const text = await readFile(fullPath, "utf-8");
        let match;
        while ((match = featureIdRegex.exec(text)) !== null) {
          if (match[1]?.trim()) {
            collected.add(match[1].trim());
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Features: failed scanning ${dir}:`, err);
  }
}

const rootDir = join(import.meta.dir, "..");
await scanDirectory(join(rootDir, "app"));
await scanDirectory(join(rootDir, "components"));

const sortedFeatures = Array.from(collected).sort();
const featuresContent = `// Generated at build time by scripts/generate-version.js - DO NOT EDIT MANUALLY
export const ALL_CURRENT_FEATURE_IDS: string[] = ${JSON.stringify(sortedFeatures, null, 2)};
`;

await writeFile(targetFeaturesPath, featuresContent, "utf-8");
console.log(`Features: collected ${sortedFeatures.length} feature IDs into generated-features.ts`);
