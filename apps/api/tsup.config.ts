import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/instrument.ts"],
  format: ["esm"],
  noExternal: ["@chatbot/shared"],
});
