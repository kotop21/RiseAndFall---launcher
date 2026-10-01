import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { updateLauncher } from "@/lib/updater";

describe("Updater: Dev Mode Execution Test", () => {
  it("downloads, unpacks and verifies update in staging without altering dev process", async () => {
    // 1. Create a dummy zip archive representing a launcher release package
    const testDir = join(tmpdir(), `raf-test-pkg-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    const dummyExe = join(testDir, "raf-launcher.exe");
    await writeFile(dummyExe, "MZ_DUMMY_BINARY_DATA");

    const dummyNode = join(testDir, "gpuix-native.win32-x64-msvc.node");
    await writeFile(dummyNode, "NODE_ADDON_DUMMY_DATA");

    const zipPath = join(tmpdir(), `raf-test-release-${Date.now()}.zip`);

    // Create zip archive
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("zip", ["-r", "-j", zipPath, testDir]);
      proc.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`zip failed with code ${code}`)),
      );
      proc.on("error", reject);
    });

    // 2. Start a mock local HTTP server serving this zip file
    const server = Bun.serve({
      port: 0,
      fetch(_req) {
        return new Response(Bun.file(zipPath));
      },
    });

    const mockRelease = {
      version: "v2.0.1",
      title: "Test Release",
      url: "https://github.com",
      downloadUrl: `http://localhost:${server.port}/release.zip`,
    };

    let progressCount = 0;
    const result = await updateLauncher(mockRelease, {
      onProgress: (_p) => {
        progressCount++;
      },
    });

    server.stop(true);
    await rm(testDir, { recursive: true, force: true });
    await rm(zipPath, { force: true });

    expect(result.success).toBe(true);
    expect(result.isDev).toBe(true);
    expect(result.stagedDir).toBeDefined();
    expect(progressCount).toBeGreaterThan(0);
  });
});
