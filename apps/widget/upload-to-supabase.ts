/**
 * Upload widget files to Supabase Storage
 *
 * Uploads:
 * - widget.js (loader, short cache 5 min) - what users embed (backward compatible)
 * - widget-app.js (actual widget) - loaded by loader with version param
 *
 * Run: SUPABASE_SERVICE_KEY=your-key npx tsx upload-to-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://hynaqwwofkpaafvlckdm.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_KEY environment variable is required");
  console.log("\nRun with: SUPABASE_SERVICE_KEY=your-key npx tsx upload-to-supabase.ts");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadFile(
  filename: string,
  displayName: string,
  cacheControl?: string
): Promise<string | null> {
  const filePath = path.join(__dirname, "dist", filename);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: dist/${filename} not found. Run 'npm run build' first.`);
    return null;
  }

  const fileContent = fs.readFileSync(filePath);

  console.log(`Uploading ${displayName}...`);

  const uploadOptions: {
    contentType: string;
    upsert: boolean;
    cacheControl?: string;
  } = {
    contentType: "application/javascript",
    upsert: true,
  };

  // Add cache control if specified
  if (cacheControl) {
    uploadOptions.cacheControl = cacheControl;
  }

  const { data, error } = await supabase.storage
    .from("assets")
    .upload(filename, fileContent, uploadOptions);

  if (error) {
    console.error(`Upload failed for ${filename}:`, error.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("assets")
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

async function uploadWidget() {
  console.log("Uploading widget files to Supabase Storage...\n");

  // Upload loader as widget.js (backward compatible - what users already embed)
  // Short cache (300 seconds = 5 minutes)
  const loaderUrl = await uploadFile(
    "widget.js",
    "widget.js (loader, cache: 5 min)",
    "300"
  );

  // Upload actual widget as widget-app.js (version param handles cache busting)
  const widgetAppUrl = await uploadFile(
    "widget-app.js",
    "widget-app.js (actual widget)"
  );

  if (!loaderUrl || !widgetAppUrl) {
    console.error("\n❌ Upload failed!");
    process.exit(1);
  }

  console.log("\n✅ Upload successful!");
  console.log("\n" + "=".repeat(60));
  console.log("PUBLIC URLs:");
  console.log("=".repeat(60));
  console.log(`Loader (embed this): ${loaderUrl}`);
  console.log(`Widget App: ${widgetAppUrl}`);

  console.log("\n" + "=".repeat(60));
  console.log("EMBED CODE (unchanged for existing users):");
  console.log("=".repeat(60));
  console.log(`<script
  src="${loaderUrl}"
  data-project-id="YOUR_PROJECT_ID"
  async>
</script>`);

  console.log("\n" + "=".repeat(60));
  console.log("HOW IT WORKS:");
  console.log("=".repeat(60));
  console.log("- widget.js is now a tiny loader (cached 5 min)");
  console.log("- Loader dynamically loads widget-app.js?v=<version>");
  console.log("- Existing integrations work without any changes!");
  console.log("- When you deploy updates, users get them within 5 minutes");
}

uploadWidget();
