import fs from "node:fs";
import path from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".turbo",
  ".next",
  "build",
]);

function processDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        processDir(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      try {
        const raw = fs.readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(raw);
        fs.writeFileSync(fullPath, JSON.stringify(parsed), "utf8");
      } catch (err) {
        console.error(`Skipping invalid JSON: ${fullPath}`, err.message);
      }
    }
  }
}

processDir(process.cwd());
