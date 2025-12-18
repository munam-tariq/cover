import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const isDev = process.argv.includes("--dev");

// Read CSS file and inline it
const cssPath = path.join(__dirname, "src/styles/widget.css");
const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf-8") : "";

async function build() {
  const ctx = await esbuild.context({
    entryPoints: ["src/widget.ts"],
    bundle: true,
    minify: !isDev,
    format: "iife",
    target: ["es2018"],
    outfile: "dist/widget.js",
    sourcemap: isDev,
    define: {
      "process.env.NODE_ENV": isDev ? '"development"' : '"production"',
      __WIDGET_CSS__: JSON.stringify(cssContent),
    },
    banner: {
      js: `/* Chatbot Widget v0.0.1 */`,
    },
  });

  if (isDev) {
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log("Build complete! Output: dist/widget.js");
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
