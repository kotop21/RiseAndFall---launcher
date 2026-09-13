import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";

const root = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
);
const repo = path.resolve(root, "..");
const nodeModules = path.join(repo, "node_modules");
const shimAutomation = path.join(root, "shim-automation.js");
const shimSafeMdx = path.join(root, "shim-safe-mdx.js");

const entryFile = path.join(repo, "index.tsx");
const outDir = path.join(root, "dist");
const outFile = path.join(outDir, "launcher.cjs");

fs.mkdirSync(outDir, { recursive: true });

const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

const common: esbuild.BuildOptions = {
  absWorkingDir: repo,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "es2022",
  external: ["@gpuix/native"],
  jsx: "automatic",
  jsxImportSource: "@gpuix/react",
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta": "{}",
  },
  alias: {
    "@/ui": path.join(repo, "components/ui"),
    "@/icon": path.join(repo, "components/icon"),
    "@/components": path.join(repo, "components"),
    "@/lib": path.join(repo, "lib"),
  },
  plugins: [
    {
      name: "bypass-pnp-resolver",
      setup(build) {
        build.onResolve({ filter: /^[^./]|^\.[^./]|^\.\.[^/]/ }, (args) => {
          if (args.path === "@gpuix/native" || nodeBuiltins.has(args.path)) {
            return { path: args.path, external: true };
          }

          if (args.path.startsWith(".")) return undefined;

          try {
            const resolved = require.resolve(args.path, {
              paths: [nodeModules, path.join(nodeModules, "@gpuix/react")],
            });
            return { path: resolved };
          } catch {
            return undefined;
          }
        });
      },
    },
    {
      name: "stub-automation",
      setup(build) {
        build.onResolve({ filter: /automation\/client/ }, () => ({
          path: shimAutomation,
        }));
      },
    },
    {
      name: "stub-safe-mdx",
      setup(build) {
        build.onResolve({ filter: /^safe-mdx(\/|$)/ }, () => ({
          path: shimSafeMdx,
        }));
      },
    },
    {
      name: "svg-as-text",
      setup(build) {
        build.onLoad({ filter: /\.svg$/ }, (args) => ({
          contents: fs.readFileSync(args.path, "utf8"),
          loader: "text",
        }));
      },
    },
  ],
  banner: {
    js: 'if(typeof queueMicrotask!=="function"){globalThis.queueMicrotask=function(fn){process.nextTick(fn)};}if(typeof performance==="undefined"){globalThis.performance={now:function(){var t=process.hrtime();return t[0]*1e3+t[1]/1e6;}}};',
  },
  logLevel: "info",
};

await esbuild.build({
  ...common,
  entryPoints: [entryFile],
  outfile: outFile,
});
