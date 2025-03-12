import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
  },
  plugins: [tsconfigPaths()],
});
