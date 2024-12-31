import { build } from "esbuild";
import alias from "esbuild-plugin-alias";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  tsconfig: "./tsconfig.json",
  plugins: [
    alias({
      "@/": "./src",
    }),
  ],
});
