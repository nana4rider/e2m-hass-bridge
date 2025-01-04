import * as fs from "fs";
import { pathsToModuleNameMapper } from "ts-jest";

const tsconfig = JSON.parse(fs.readFileSync("./tsconfig.json", "utf-8"));

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: "<rootDir>/",
  }),
  setupFiles: ["<rootDir>/jest.setup.js"],
};
