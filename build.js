import { build } from "esbuild";
import alias from "esbuild-plugin-alias";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  platform: "node",
  tsconfig: "./tsconfig.json",
  plugins: [
    alias({
      "@/": "./src",
    }),
  ],
  banner: {
    js: 'import { createRequire } from "module"; import url from "url"; const require = createRequire(import.meta.url); const __filename = url.fileURLToPath(import.meta.url); const __dirname = url.fileURLToPath(new URL(".", import.meta.url));',
  },
  loader: { ".node": "file" },
});
