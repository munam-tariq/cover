"use client";

import { useState, useRef } from "react";
import { Card, Button, Badge, cn, Input, Label } from "@chatbot/ui";
import {
  Copy,
  Check,
  Code,
  Eye,
  ExternalLink,
  Smartphone,
  Monitor,
  RefreshCw,
  Palette,
} from "lucide-react";
import { useProject } from "@/contexts/project-context";

interface WidgetConfig {
  position: "bottom-right" | "bottom-left";
  primaryColor: string;
  title: string;
  greeting: string;
}

export default function EmbedPage() {
  const { currentProject, isLoading: loading } = useProject();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Customization state
  const [config, setConfig] = useState<WidgetConfig>({
    position: "bottom-right",
    primaryColor: "#0a0a0a",
    title: "Chat with us",
    greeting: "Hi! How can I help you today?",
  });

  // Build embed code
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.supportbase.app";
  // Widget hosted on Supabase Storage
  const widgetUrl = "https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js";

  const embedCode = currentProject
    ? `<script
  src="${widgetUrl}"
  data-project-id="${currentProject.id}"
  data-api-url="${apiUrl}"
  data-position="${config.position}"
  data-primary-color="${config.primaryColor}"
  data-title="${config.title}"
  data-greeting="${config.greeting}"
  async>
</script>`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const refreshPreview = () => {
    setPreviewKey((prev) => prev + 1);
  };

  const updateConfig = (key: keyof WidgetConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    // Auto-refresh preview when config changes
    setPreviewKey((prev) => prev + 1);
  };

  // Generate preview HTML with the REAL widget
  const previewHtml = currentProject
    ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
      min-height: calc(100vh - 40px);
    }
    .sample-content {
      max-width: 600px;
      margin: 0 auto;
    }
    h1 { color: #333; font-size: 24px; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
    .hint {
      position: fixed;
      bottom: 100px;
      ${config.position === "bottom-right" ? "right: 100px;" : "left: 100px;"}
      background: #333;
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      animation: fadeInOut 4s ease-in-out forwards;
    }
    @keyframes fadeInOut {
      0%, 100% { opacity: 0; transform: translateY(10px); }
      10%, 90% { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="sample-content">
    <h1>Your Website</h1>
    <p>This is a live preview with your actual chatbot. Click the chat bubble to test it with your real knowledge base!</p>
    <p>The widget is fully isolated using Shadow DOM, so it won't interfere with your existing styles.</p>
  </div>
  <div class="hint">👋 Try your live chatbot!</div>

  <!-- Load the REAL widget with user's project ID and custom config -->
  <script
    src="${widgetUrl}"
    data-project-id="${currentProject.id}"
    data-api-url="${apiUrl}"
    data-position="${config.position}"
    data-primary-color="${config.primaryColor}"
    data-title="${config.title}"
    data-greeting="${config.greeting}"
    async>
  </script>
</body>
</html>
`
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No project found.</p>
          <Button asChild>
            <a href="/projects?create=true">Create Project</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6" />
            Embed Widget
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize and embed your chatbot on any website
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Project: {currentProject.name}
        </Badge>
      </div>

      {/* Two column layout: Preview + Customization */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Widget Preview Section - Takes 2 columns */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("desktop")}
                  className={cn(
                    "px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors",
                    viewMode === "desktop"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Monitor className="h-4 w-4" />
                  Desktop
                </button>
                <button
                  onClick={() => setViewMode("mobile")}
                  className={cn(
                    "px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors",
                    viewMode === "mobile"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={refreshPreview}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "bg-muted rounded-lg overflow-hidden mx-auto transition-all duration-300",
              viewMode === "desktop"
                ? "w-full aspect-video"
                : "w-[375px] h-[667px]"
            )}
          >
            <iframe
              key={previewKey}
              ref={iframeRef}
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Widget Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            This is your live widget connected to your knowledge base. Test it here before embedding!
          </p>
        </Card>

        {/* Customization Options - 1 column */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Customize Widget
          </h2>
          <div className="space-y-4">
            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position" className="text-sm font-medium">Position</Label>
              <select
                id="position"
                value={config.position}
                onChange={(e) => updateConfig("position", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>

            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="text-sm font-medium">Primary Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="primaryColor"
                  value={config.primaryColor}
                  onChange={(e) => updateConfig("primaryColor", e.target.value)}
                  className="w-12 h-10 p-1 border border-input rounded-md cursor-pointer"
                />
                <Input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => updateConfig("primaryColor", e.target.value)}
                  placeholder="#0a0a0a"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Chat Title</Label>
              <Input
                id="title"
                type="text"
                value={config.title}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Chat with us"
              />
            </div>

            {/* Greeting */}
            <div className="space-y-2">
              <Label htmlFor="greeting" className="text-sm font-medium">Greeting Message</Label>
              <textarea
                id="greeting"
                value={config.greeting}
                onChange={(e) => updateConfig("greeting", e.target.value)}
                placeholder="Hi! How can I help you today?"
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Reset to defaults */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setConfig({
                  position: "bottom-right",
                  primaryColor: "#0a0a0a",
                  title: "Chat with us",
                  greeting: "Hi! How can I help you today?",
                });
                setPreviewKey((prev) => prev + 1);
              }}
            >
              Reset to Defaults
            </Button>
          </div>
        </Card>
      </div>

      {/* Embed Code Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Code className="h-4 w-4" />
            Your Embed Code
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="min-w-[100px]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-lg overflow-x-auto text-sm font-mono">
            <code>{embedCode}</code>
          </pre>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          Paste this code just before the closing <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag on your website.
        </p>
      </Card>

      {/* Integration Guides */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Integration Guides
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">HTML / Static Sites</span>
            <Badge variant="outline" className="text-xs ml-auto">Available</Badge>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors opacity-60"
          >
            <span className="h-2 w-2 rounded-full bg-muted" />
            <span className="text-sm font-medium">WordPress</span>
            <Badge variant="outline" className="text-xs ml-auto">Soon</Badge>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors opacity-60"
          >
            <span className="h-2 w-2 rounded-full bg-muted" />
            <span className="text-sm font-medium">Shopify</span>
            <Badge variant="outline" className="text-xs ml-auto">Soon</Badge>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors opacity-60"
          >
            <span className="h-2 w-2 rounded-full bg-muted" />
            <span className="text-sm font-medium">React / Next.js</span>
            <Badge variant="outline" className="text-xs ml-auto">Soon</Badge>
          </a>
        </div>
      </Card>
    </div>
  );
}
