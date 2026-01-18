# Chat Widget

Embeddable chat widget that can be added to any website with a single script tag.

## Features

- Shadow DOM isolation (styles don't leak in or out)
- Mobile responsive (fullscreen on small screens)
- Session persistence (messages survive page refresh)
- Keyboard accessible (Tab navigation, Escape to close)
- Lightweight (~8KB gzipped)

## Development

```bash
# Build the widget
npm run build

# Output: dist/widget.js
```

## Testing Locally

Open `test.html` in a browser to test the widget locally:

```bash
# From the widget directory
open test.html
```

Make sure the API server is running (`npm run dev` from root).

## Deploying to Supabase Storage

After making changes, rebuild and re-upload:

```bash
# 1. Build the widget (generates widget.js + widget-loader.js)
npm run build

# 2. Upload to Supabase Storage
SUPABASE_SERVICE_KEY=your-service-key npx tsx upload-to-supabase.ts
```

The service key can be found in `apps/api/.env` or the Supabase dashboard.

**Current hosted URLs:**
```
Loader: https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js
Widget: https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget-app.js
```

## Cache Busting Strategy

The widget uses a **loader pattern** for automatic cache busting:

1. **widget.js** - Tiny loader (~500 bytes), cached for 5 minutes (backward compatible embed URL)
2. **widget-app.js?v=<version>** - Main widget, loaded by loader with version param

When you deploy updates:
- The loader is re-fetched within 5 minutes
- The loader loads the new widget version automatically
- **No hard refresh needed by end users!**

## Embed Code

Existing integrations continue to work - no changes needed!

```html
<script
  src="https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js"
  data-project-id="YOUR_PROJECT_ID"
  async>
</script>
```

## Configuration Options

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-project-id` | required | Your project ID from the dashboard |
| `data-api-url` | `https://api.yoursite.com` | API server URL |
| `data-position` | `bottom-right` | `bottom-right` or `bottom-left` |
| `data-primary-color` | `#0a0a0a` | Primary theme color |
| `data-title` | `Chat with us` | Chat window title |
| `data-greeting` | `Hi! How can I help?` | Initial greeting message |

## Example with Custom Options

```html
<script
  src="https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js"
  data-project-id="your-project-id"
  data-position="bottom-left"
  data-primary-color="#6366f1"
  data-title="Support Chat"
  data-greeting="Hello! How can we help you today?"
  async>
</script>
```

## Architecture

```
src/
├── widget.ts          # Main entry point, initialization
├── components/
│   ├── bubble.ts      # Chat bubble button
│   ├── chat-window.ts # Main chat interface
│   ├── message.ts     # Message component
│   ├── input.ts       # Input field
│   └── typing-indicator.ts
├── utils/
│   ├── api.ts         # API client with error handling
│   ├── storage.ts     # Session/visitor persistence
│   └── helpers.ts     # Utility functions
└── styles/
    └── widget.css     # All widget styles
```

## Moving to CDN (Production)

For production, consider moving to a proper CDN:

1. Upload `dist/widget.js` to your CDN (CloudFront, Cloudflare, etc.)
2. Update the URL in `apps/web/app/(dashboard)/embed/page.tsx`
3. Update this README with the new URL
