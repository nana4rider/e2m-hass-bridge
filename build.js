import tsconfigPathsPlugin from "@esbuild-plugins/tsconfig-paths";
import { build } from "esbuild";

const tsconfig = "tsconfig.json";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  minify: true,
  format: "esm",
  platform: "node",
  tsconfig,
  plugins: [tsconfigPathsPlugin.default({ tsconfig })],
  banner: {
    js: 'import { createRequire } from "module"; import url from "url"; const require = createRequire(import.meta.url); const __filename = url.fileURLToPath(import.meta.url); const __dirname = url.fileURLToPath(new URL(".", import.meta.url));',
  },
  loader: { ".node": "file" },
});
