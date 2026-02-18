import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const isDev = process.argv.includes("--dev");

// Read CSS file and inline it
const cssPath = path.join(__dirname, "src/styles/widget.css");
const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf-8") : "";

// Generate version based on timestamp (changes on each build)
const generateVersion = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(2).toString("hex");
  return `${timestamp}-${random}`;
};

async function build() {
  const version = generateVersion();

  // Resolve the `events` polyfill for browser usage (needed by @vapi-ai/web)
  const eventsPolyfill = require.resolve("events/");

  // Build main widget (widget-app.js - loaded by the loader)
  const widgetCtx = await esbuild.context({
    entryPoints: ["src/widget.ts"],
    bundle: true,
    minify: !isDev,
    format: "iife",
    target: ["es2018"],
    outfile: "dist/widget-app.js",
    sourcemap: isDev,
    platform: "browser",
    alias: {
      events: eventsPolyfill,
    },
    define: {
      "process.env.NODE_ENV": isDev ? '"development"' : '"production"',
      __WIDGET_CSS__: JSON.stringify(cssContent),
      global: "globalThis",
    },
    banner: {
      js: `/* FrontFace Widget v${version} */`,
    },
  });

  // Build loader as widget.js (what users embed - backward compatible)
  if (!isDev) {
    await esbuild.build({
      entryPoints: ["src/loader.ts"],
      bundle: true,
      minify: true,
      format: "iife",
      target: ["es2018"],
      outfile: "dist/widget.js",
      define: {
        __WIDGET_VERSION__: JSON.stringify(version),
      },
      banner: {
        js: `/* FrontFace Loader */`,
      },
    });
  }

  if (isDev) {
    await widgetCtx.watch();
    console.log("Watching for changes...");
  } else {
    await widgetCtx.rebuild();
    await widgetCtx.dispose();
    console.log(`Build complete! Version: ${version}`);
    console.log("Output:");
    console.log("  - dist/widget.js (loader - what users embed)");
    console.log("  - dist/widget-app.js (actual widget - loaded by loader)");
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
