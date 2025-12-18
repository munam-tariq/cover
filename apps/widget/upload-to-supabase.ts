/**
 * Upload widget.js to Supabase Storage
 * Run: npx tsx upload-to-supabase.ts
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

async function uploadWidget() {
  const widgetPath = path.join(__dirname, "dist", "widget.js");

  if (!fs.existsSync(widgetPath)) {
    console.error("Error: dist/widget.js not found. Run 'npm run build' first.");
    process.exit(1);
  }

  const widgetContent = fs.readFileSync(widgetPath);

  console.log("Uploading widget.js to Supabase Storage...");

  const { data, error } = await supabase.storage
    .from("assets")
    .upload("widget.js", widgetContent, {
      contentType: "application/javascript",
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error("Upload failed:", error.message);
    process.exit(1);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("assets")
    .getPublicUrl("widget.js");

  console.log("\n✅ Upload successful!");
  console.log("\nPublic URL:");
  console.log(urlData.publicUrl);
  console.log("\nEmbed code:");
  console.log(`<script
  src="${urlData.publicUrl}"
  data-project-id="YOUR_PROJECT_ID"
  async>
</script>`);
}

uploadWidget();
