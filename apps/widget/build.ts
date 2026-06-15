import * as esbuild from "esbuild";
import * as fs from "fs";
import * as http from "http";
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

function startDevServer(): void {
  const port = Number(process.env.WIDGET_DEV_PORT || 7001);
  const distDir = path.join(__dirname, "dist");
  const contentTypes: Record<string, string> = {
    ".js": "text/javascript; charset=utf-8",
    ".map": "application/json; charset=utf-8",
  };

  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    const relativePath = pathname.replace(/^\/+/, "");
    const filePath = path.resolve(__dirname, relativePath);

    if (!relativePath.startsWith("dist/") || !filePath.startsWith(distDir)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    fs.stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type":
          contentTypes[path.extname(filePath)] || "application/octet-stream",
      });
      fs.createReadStream(filePath).pipe(response);
    });
  });

  server.on("error", (error) => {
    console.error(`Widget dev server failed on port ${port}:`, error);
  });
  server.listen(port, () => {
    console.log(`Widget dev server: http://localhost:${port}/dist/widget.js`);
  });
}

async function build() {
  const version = generateVersion();

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
    define: {
      "process.env.NODE_ENV": isDev ? '"development"' : '"production"',
      __WIDGET_CSS__: JSON.stringify(cssContent),
      global: "globalThis",
    },
    banner: {
      js: `/* FrontFace Widget v${version} */`,
    },
  });

  const loaderCtx = await esbuild.context({
    entryPoints: ["src/loader.ts"],
    bundle: true,
    minify: !isDev,
    format: "iife",
    target: ["es2018"],
    outfile: "dist/widget.js",
    sourcemap: isDev,
    define: {
      __WIDGET_VERSION__: JSON.stringify(version),
    },
    banner: {
      js: `/* FrontFace Loader */`,
    },
  });

  if (isDev) {
    await Promise.all([widgetCtx.watch(), loaderCtx.watch()]);
    startDevServer();
    console.log("Watching for changes...");
  } else {
    await Promise.all([widgetCtx.rebuild(), loaderCtx.rebuild()]);
    await Promise.all([widgetCtx.dispose(), loaderCtx.dispose()]);
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
