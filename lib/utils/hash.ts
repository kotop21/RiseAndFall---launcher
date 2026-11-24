import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";

export async function calculateFileSha256(filePath: string): Promise<string | null> {
  const cleanPath = filePath.trim();
  if (!cleanPath || !existsSync(cleanPath)) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const hash = createHash("sha256");
      const stream = createReadStream(cleanPath);

      stream.on("data", (chunk) => {
        hash.update(chunk);
      });

      stream.on("end", () => {
        resolve(hash.digest("hex").toLowerCase());
      });

      stream.on("error", () => {
        try {
          stream.destroy();
        } catch {}
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}
