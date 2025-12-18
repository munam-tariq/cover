# MCP Server

Model Context Protocol (MCP) server for the AI Chatbot Platform. This enables AI development tools like **Cursor**, **Claude Code**, **Windsurf**, and others to programmatically manage your chatbot using natural language.

## Important: Two Implementations

This project has **two MCP implementations**:

| Location | Transport | Use Case |
|----------|-----------|----------|
| **`apps/api/src/routes/mcp.ts`** | HTTP | **ACTIVE** - URL-based, like Context7 |
| `apps/mcp-server/` (this folder) | stdio | **FUTURE** - For npm package distribution |

**The HTTP implementation is currently active.** This folder contains scaffolded code for a potential future npm package (`npx @yourproduct/mcp-server`).

---

## Overview (HTTP Implementation)

The MCP server is integrated into the main API server and uses the **Streamable HTTP transport** (MCP spec 2025-06-18). Users authenticate using their **Project ID** from the Settings page - no separate API keys needed.

## Quick Start

### 1. Get Your Project ID

1. Log into the dashboard at `http://localhost:3000`
2. Go to **Settings**
3. Copy your **Project ID** (UUID format)

### 2. Add MCP Configuration

Add this to your AI tool's MCP configuration:

#### Claude Code

Add to `~/.claude/claude_desktop_config.json` (or your project's `.claude/mcp.json`):

```json
{
  "mcpServers": {
    "chatbot-platform": {
      "type": "http",
      "url": "http://localhost:3001/mcp",
      "headers": {
        "X-Project-ID": "your-project-uuid-here"
      }
    }
  }
}
```

#### Cursor

Add to your MCP settings (Settings → MCP):

```json
{
  "chatbot-platform": {
    "type": "http",
    "url": "http://localhost:3001/mcp",
    "headers": {
      "X-Project-ID": "your-project-uuid-here"
    }
  }
}
```

#### Windsurf / Other MCP Clients

Use the same configuration format - the MCP server follows the standard HTTP transport spec.

### 3. Start Using

Once configured, you can use natural language to manage your chatbot:

- "List my chatbot's knowledge sources"
- "Add FAQ content about returns and shipping"
- "Get the embed code for my chatbot"
- "Ask my chatbot about the return policy"

## Available Tools

### Project Management

#### `get_project_info`
Get information about your chatbot project including name, settings, and statistics.

**Example prompt:** "Show me my chatbot project details"

**Returns:**
```json
{
  "project_id": "uuid",
  "name": "My Chatbot",
  "system_prompt": "...",
  "welcome_message": "...",
  "knowledge_sources_count": 3,
  "api_endpoints_count": 1,
  "created_at": "2025-12-17T..."
}
```

#### `update_project_settings`
Update your chatbot project name, system prompt, or welcome message.

**Parameters:**
- `name` (optional): New name for the project
- `system_prompt` (optional): Custom instructions for how the chatbot behaves
- `welcome_message` (optional): Greeting shown when chat opens

**Example prompt:** "Set my chatbot's welcome message to 'Hi! How can I help you today?'"

---

### Knowledge Management

#### `list_knowledge`
List all knowledge sources in your chatbot.

**Example prompt:** "What knowledge sources does my chatbot have?"

**Returns:**
```json
{
  "count": 3,
  "max_allowed": 20,
  "sources": [
    {
      "id": "uuid",
      "name": "FAQ",
      "type": "text",
      "status": "ready",
      "chunk_count": 5
    }
  ]
}
```

#### `upload_knowledge`
Add text content as a knowledge source. The content will be processed through the RAG pipeline (chunking, embedding, indexing).

**Parameters:**
- `name` (required): Name for the knowledge source
- `content` (required): Text content to add (max 100,000 characters)

**Example prompt:** "Add this FAQ to my chatbot: Q: What are your hours? A: We're open 9-5 Monday through Friday."

#### `delete_knowledge`
Delete a knowledge source and all its indexed content.

**Parameters:**
- `source_id` (required): UUID of the knowledge source

**Example prompt:** "Delete the FAQ knowledge source"

---

### API Endpoint Management

#### `list_api_endpoints`
List all configured API endpoints that the chatbot can call.

**Example prompt:** "What APIs can my chatbot access?"

#### `add_api_endpoint`
Configure an external API that the chatbot can call for real-time data.

**Parameters:**
- `name` (required): Name for the endpoint
- `description` (required): When to use this API (be specific!)
- `url` (required): API URL with `{param}` placeholders
- `method` (optional): GET or POST (default: GET)
- `auth_type` (optional): none, api_key, or bearer (default: none)
- `api_key` (optional): API key value
- `api_key_header` (optional): Header name for API key (default: X-API-Key)
- `bearer_token` (optional): Bearer token value

**Example prompt:** "Add an API endpoint to check order status at https://api.mystore.com/orders/{order_id} with bearer token xyz123"

#### `delete_api_endpoint`
Delete an API endpoint configuration.

**Parameters:**
- `endpoint_id` (required): UUID of the endpoint

---

### Widget & Chat

#### `get_embed_code`
Get the embed code to add the chatbot widget to a website.

**Parameters:**
- `position` (optional): bottom-right or bottom-left
- `primary_color` (optional): Hex color (e.g., #2563eb)
- `title` (optional): Chat widget header title
- `greeting` (optional): Greeting message

**Example prompt:** "Get the embed code for my chatbot with a red color scheme"

**Returns:**
```json
{
  "embed_code": "<script src=\".../widget.js\" data-project-id=\"...\" data-color=\"#ff0000\" async></script>",
  "instructions": "Add this script tag just before </body>"
}
```

#### `ask_question`
Send a question to the chatbot and get an answer. Great for testing!

**Parameters:**
- `question` (required): The question to ask

**Example prompt:** "Ask my chatbot what the return policy is"

**Returns:**
```json
{
  "answer": "Our return policy allows...",
  "sources": [
    { "name": "Return Policy", "relevance": "85%" }
  ],
  "tool_calls": null,
  "processing_time_ms": 2500
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Tool (Cursor/Claude Code)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (Streamable HTTP Transport)
                              │ X-Project-ID header for auth
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Server (/mcp)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              MCP Route Handler                        │  │
│  │  - Session management (UUID sessions)                 │  │
│  │  - Project authentication                             │  │
│  │  - 10 MCP tools                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│  ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │  RAG Pipeline   │ │  Encryption │ │   Chat Engine   │   │
│  │  (chunking,     │ │  (AES-256)  │ │  (OpenAI GPT)   │   │
│  │   embeddings)   │ │             │ │                 │   │
│  └─────────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase PostgreSQL                       │
│  - projects, knowledge_sources, knowledge_chunks            │
│  - api_endpoints, chat_sessions                             │
│  - pgvector for embeddings                                  │
└─────────────────────────────────────────────────────────────┘
```

## Development

### Running Locally

```bash
# Start the API server (includes MCP endpoint)
cd apps/api
pnpm dev

# Server runs at http://localhost:3001
# MCP endpoint at http://localhost:3001/mcp
```

### Testing with curl

```bash
# Initialize a session
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'X-Project-ID: your-project-uuid' \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'

# List tools (use session ID from initialize response)
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'X-Project-ID: your-project-uuid' \
  -H 'Mcp-Session-Id: session-uuid-from-init' \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'

# Call a tool
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'X-Project-ID: your-project-uuid' \
  -H 'Mcp-Session-Id: session-uuid-from-init' \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_project_info","arguments":{}},"id":3}'
```

## Security

- **Authentication**: Project ID (UUID) serves as the authentication token
- **Session Management**: Sessions are server-managed with UUID session IDs
- **Encryption**: API endpoint credentials are encrypted with AES-256-GCM
- **CORS**: Open CORS for MCP endpoint (AI tools can connect from anywhere)
- **Rate Limiting**: Inherits from chat engine rate limits for `ask_question`

## Troubleshooting

### "Unauthorized: Invalid or missing X-Project-ID header"

Make sure you've added the `X-Project-ID` header with your valid project UUID from the Settings page.

### "Bad Request: Invalid session or missing initialize request"

MCP clients must send an `initialize` request first. Most MCP clients handle this automatically. If testing manually, ensure you send the initialize request and use the returned session ID.

### Tools not appearing in your AI tool

1. Restart your AI tool after adding the MCP configuration
2. Check that the API server is running (`http://localhost:3001/health`)
3. Verify your project ID is correct

### Knowledge upload shows "processing" forever

Check the API server logs for errors. Common issues:
- OpenAI API key not configured
- Content too large (max 100,000 characters)
- Network issues connecting to OpenAI

## License

Part of the AI Chatbot Platform. See root LICENSE file.
