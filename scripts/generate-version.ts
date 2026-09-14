import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import pkg from "../package.json";

const version = pkg.version || "0.0.0";
const targetPath = join(import.meta.dir, "../lib/utils/version.generated.ts");

const content = `// Generated at build time - DO NOT EDIT MANUALLY
export const BUILD_VERSION = ${JSON.stringify(version)};
`;

await writeFile(targetPath, content, "utf-8");
console.log(`Version: generated build target with version v${version}`);
