# Feature: MCP Server

## Overview

**Feature ID**: `mcp-server`
**Category**: Core (V1)
**Priority**: P0 (Core functionality)
**Complexity**: M
**Estimated Effort**: 3-4 days

### Summary
Model Context Protocol (MCP) server that allows AI development platforms (Lovable, Bolt.new, Cursor, Claude Code) to programmatically configure and manage chatbots. Enables "vibe coders" to add a chatbot with a single prompt like "add a customer support chatbot to my site."

### Dependencies
- `chat-engine` - Core chat functionality must work for end-to-end testing
- `auth-system` - API key authentication for MCP access

### Success Criteria
- [ ] MCP server implements all 5 core tools
- [ ] Authentication works via API key
- [ ] Tools can be called from Lovable/Cursor/Claude Code
- [ ] `create_project` creates functional project
- [ ] `upload_knowledge` processes and indexes content
- [ ] `add_api_endpoint` configures working tool
- [ ] `get_embed_code` returns valid script tag
- [ ] Error handling is clear and actionable

---

## User Stories

### Primary User Story
> As a vibe coder using Lovable, I want to prompt "add a customer support chatbot" and have the AI configure everything automatically.

### Additional Stories
1. As a developer, I want to generate an API key so that my MCP client can authenticate.
2. As a vibe coder, I want the AI to handle all configuration so I can focus on my app.
3. As a developer, I want clear error messages so I can debug integration issues.

---

## MCP Tools

### Tool 1: create_project

**Purpose**: Create a new chatbot project for the authenticated user

**Input Schema**:
```json
{
  "name": "create_project",
  "description": "Create a new chatbot project. Returns the project ID needed for other operations. Call this first before uploading knowledge or adding endpoints.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Name for the chatbot project (e.g., 'My Store Support', 'Customer Help')"
      }
    },
    "required": ["name"]
  }
}
```

**Output**:
```json
{
  "project_id": "proj_abc123def456",
  "name": "My Store Support",
  "created_at": "2024-12-15T10:30:00Z"
}
```

### Tool 2: upload_knowledge

**Purpose**: Add knowledge content that the chatbot will use to answer questions

**Input Schema**:
```json
{
  "name": "upload_knowledge",
  "description": "Add knowledge content that the chatbot will use to answer questions. Can be FAQ content, product information, policies, documentation, etc. The chatbot will search this content when answering user questions.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "project_id": {
        "type": "string",
        "description": "The project ID from create_project"
      },
      "name": {
        "type": "string",
        "description": "Name for this knowledge source (e.g., 'FAQ', 'Return Policy', 'Product Catalog')"
      },
      "content": {
        "type": "string",
        "description": "The text content to add as knowledge. Can be long-form text, Q&A pairs, documentation, etc."
      }
    },
    "required": ["project_id", "name", "content"]
  }
}
```

**Output**:
```json
{
  "source_id": "src_xyz789",
  "name": "FAQ",
  "status": "processing",
  "message": "Knowledge is being processed. It will be available for the chatbot shortly."
}
```

### Tool 3: add_api_endpoint

**Purpose**: Configure an API endpoint for the chatbot to call for real-time data

**Input Schema**:
```json
{
  "name": "add_api_endpoint",
  "description": "Configure an API endpoint that the chatbot can call to fetch real-time data. The chatbot will automatically call this API when users ask relevant questions. Use {param} syntax in the URL for dynamic values.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "project_id": {
        "type": "string",
        "description": "The project ID from create_project"
      },
      "name": {
        "type": "string",
        "description": "Name for this endpoint (e.g., 'Order Status', 'Product Inventory')"
      },
      "description": {
        "type": "string",
        "description": "Description of when to use this API. Be specific about what questions should trigger it. Example: 'Get order status and tracking info. Use when customer asks about their order, shipping, or delivery. Requires order_id.'"
      },
      "url": {
        "type": "string",
        "description": "API URL. Use {param} for dynamic values that the AI will extract from the conversation. Example: 'https://api.store.com/orders/{order_id}'"
      },
      "method": {
        "type": "string",
        "enum": ["GET", "POST"],
        "description": "HTTP method (default: GET)"
      },
      "auth_type": {
        "type": "string",
        "enum": ["none", "api_key", "bearer"],
        "description": "Authentication type (default: none)"
      },
      "auth_value": {
        "type": "string",
        "description": "API key or bearer token value (required if auth_type is not 'none')"
      }
    },
    "required": ["project_id", "name", "description", "url"]
  }
}
```

**Output**:
```json
{
  "endpoint_id": "ep_123abc",
  "name": "Order Status",
  "status": "active",
  "message": "Endpoint configured. The chatbot will call this API when users ask about orders."
}
```

### Tool 4: get_embed_code

**Purpose**: Get the script tag to embed the chatbot on a website

**Input Schema**:
```json
{
  "name": "get_embed_code",
  "description": "Get the script tag to embed the chatbot widget on a website. Add this code to the HTML just before the closing </body> tag.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "project_id": {
        "type": "string",
        "description": "The project ID"
      }
    },
    "required": ["project_id"]
  }
}
```

**Output**:
```json
{
  "embed_code": "<script src=\"https://cdn.yourproduct.com/widget.js\" data-project-id=\"proj_abc123def456\" async></script>",
  "instructions": "Add this script tag to your HTML just before the closing </body> tag. The chat widget will appear in the bottom-right corner of the page."
}
```

### Tool 5: list_projects

**Purpose**: List all chatbot projects for the authenticated user

**Input Schema**:
```json
{
  "name": "list_projects",
  "description": "List all chatbot projects for the authenticated user. Use this to find existing project IDs.",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

**Output**:
```json
{
  "projects": [
    {
      "project_id": "proj_abc123",
      "name": "My Store Support",
      "created_at": "2024-12-15T10:30:00Z"
    }
  ]
}
```

---

## Authentication

### API Key Generation

Users generate API keys from the dashboard:

1. Navigate to Settings > API Keys
2. Click "Create API Key"
3. Enter a name (e.g., "Lovable MCP")
4. Copy the key (shown only once)

**Key Format**: `sk_live_` + 32 random characters

### MCP Configuration

```json
// Claude Code / Cursor MCP config
{
  "mcpServers": {
    "yourproduct": {
      "command": "npx",
      "args": ["@yourproduct/mcp-server"],
      "env": {
        "YOURPRODUCT_API_KEY": "sk_live_xxxxxxxxxxxxx"
      }
    }
  }
}
```

### Authentication Flow

```typescript
// MCP server reads API key from environment
const apiKey = process.env.YOURPRODUCT_API_KEY;

// Validate on each request
async function validateApiKey(key: string): Promise<User | null> {
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  const { data } = await supabase.rpc('get_user_by_api_key', {
    p_key_hash: keyHash,
  });

  return data?.[0] || null;
}
```

---

## Technical Implementation

### MCP Server Entry Point

```typescript
// apps/mcp-server/src/index.ts
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createProject } from './tools/create-project.js';
import { uploadKnowledge } from './tools/upload-knowledge.js';
import { addApiEndpoint } from './tools/add-api-endpoint.js';
import { getEmbedCode } from './tools/get-embed-code.js';
import { listProjects } from './tools/list-projects.js';
import { validateApiKey } from './auth.js';

const API_KEY = process.env.YOURPRODUCT_API_KEY;

if (!API_KEY) {
  console.error('Error: YOURPRODUCT_API_KEY environment variable is required');
  process.exit(1);
}

// Validate API key on startup
const user = await validateApiKey(API_KEY);
if (!user) {
  console.error('Error: Invalid API key');
  process.exit(1);
}

const server = new Server(
  {
    name: 'yourproduct-chatbot',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_project',
        description: 'Create a new chatbot project...',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the chatbot project' },
          },
          required: ['name'],
        },
      },
      {
        name: 'upload_knowledge',
        description: 'Add knowledge content...',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
            name: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['project_id', 'name', 'content'],
        },
      },
      {
        name: 'add_api_endpoint',
        description: 'Configure an API endpoint...',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            url: { type: 'string' },
            method: { type: 'string', enum: ['GET', 'POST'] },
            auth_type: { type: 'string', enum: ['none', 'api_key', 'bearer'] },
            auth_value: { type: 'string' },
          },
          required: ['project_id', 'name', 'description', 'url'],
        },
      },
      {
        name: 'get_embed_code',
        description: 'Get the embed script tag...',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all chatbot projects...',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'create_project':
        result = await createProject(user.id, args as { name: string });
        break;
      case 'upload_knowledge':
        result = await uploadKnowledge(user.id, args as any);
        break;
      case 'add_api_endpoint':
        result = await addApiEndpoint(user.id, args as any);
        break;
      case 'get_embed_code':
        result = await getEmbedCode(user.id, args as { project_id: string });
        break;
      case 'list_projects':
        result = await listProjects(user.id);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Implementation: create_project

```typescript
// apps/mcp-server/src/tools/create-project.ts
import { createServerClient } from '@chatbot/db';

interface CreateProjectArgs {
  name: string;
}

export async function createProject(
  userId: string,
  args: CreateProjectArgs
) {
  const supabase = createServerClient();

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: args.name,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return {
    project_id: project.id,
    name: project.name,
    created_at: project.created_at,
  };
}
```

### Tool Implementation: upload_knowledge

```typescript
// apps/mcp-server/src/tools/upload-knowledge.ts
import { createServerClient } from '@chatbot/db';

interface UploadKnowledgeArgs {
  project_id: string;
  name: string;
  content: string;
}

export async function uploadKnowledge(
  userId: string,
  args: UploadKnowledgeArgs
) {
  const supabase = createServerClient();

  // Verify user owns the project
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', args.project_id)
    .eq('user_id', userId)
    .single();

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  // Create knowledge source
  const { data: source, error } = await supabase
    .from('knowledge_sources')
    .insert({
      project_id: args.project_id,
      type: 'text',
      name: args.name,
      content: args.content,
      status: 'processing',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create knowledge source: ${error.message}`);
  }

  // Queue background processing (same as dashboard upload)
  await queueKnowledgeProcessing({
    sourceId: source.id,
    content: args.content,
    filePath: null,
  });

  return {
    source_id: source.id,
    name: source.name,
    status: 'processing',
    message: 'Knowledge is being processed. It will be available shortly.',
  };
}
```

---

## Example Vibe Coding Session

**User prompt to Lovable**:
> "Add a customer support chatbot to my e-commerce site. It should answer questions about products using this FAQ content: [paste FAQ]. Also let customers check order status using my API at https://api.mystore.com/orders/{order_id} with bearer token 'xyz123'."

**Lovable executes (via MCP)**:
```
1. create_project(name: "E-commerce Support")
   → Returns: project_id: "proj_abc123"

2. upload_knowledge(
     project_id: "proj_abc123",
     name: "Product FAQ",
     content: [pasted FAQ content]
   )
   → Returns: Processing, 15 chunks will be created

3. add_api_endpoint(
     project_id: "proj_abc123",
     name: "Order Status",
     description: "Get order status and tracking. Use when customer asks about their order.",
     url: "https://api.mystore.com/orders/{order_id}",
     method: "GET",
     auth_type: "bearer",
     auth_value: "xyz123"
   )
   → Returns: Endpoint configured

4. get_embed_code(project_id: "proj_abc123")
   → Returns: <script src="..."></script>

5. [Lovable adds script to index.html]
```

**Result**: Working chatbot in ~30 seconds.

---

## Error Handling

### Error Response Format

```json
{
  "error": true,
  "code": "PROJECT_NOT_FOUND",
  "message": "The specified project was not found or you don't have access to it."
}
```

### Error Codes

| Code | When It Occurs | Message |
|------|----------------|---------|
| INVALID_API_KEY | API key not found/invalid | "Invalid API key. Generate a new one at..." |
| PROJECT_NOT_FOUND | Project ID doesn't exist or no access | "Project not found or access denied" |
| INVALID_INPUT | Required field missing | "Missing required field: {field}" |
| LIMIT_REACHED | Too many projects/sources | "Limit reached. Upgrade plan or delete existing." |
| PROCESSING_ERROR | Background job failed | "Failed to process. Please try again." |

---

## Package Configuration

### package.json

```json
{
  "name": "@yourproduct/mcp-server",
  "version": "1.0.0",
  "description": "MCP server for YourProduct chatbot platform",
  "type": "module",
  "bin": {
    "yourproduct-mcp": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

---

## Testing Requirements

### Unit Tests
- [ ] API key validation works
- [ ] Each tool returns correct schema
- [ ] Project ownership is verified

### Integration Tests
- [ ] create_project creates real project
- [ ] upload_knowledge triggers processing
- [ ] add_api_endpoint stores encrypted config
- [ ] get_embed_code returns valid script

### E2E Tests
- [ ] Full flow from MCP client
- [ ] Error handling for all tools

---

## Acceptance Criteria

### Definition of Done
- [ ] MCP server implements 5 tools
- [ ] API key authentication works
- [ ] Tools callable from Lovable/Cursor
- [ ] Knowledge processing works
- [ ] Embed code is correct
- [ ] Error messages are helpful
- [ ] Published to npm

### Demo Checklist
- [ ] Configure MCP in Cursor
- [ ] Run "add chatbot" prompt
- [ ] Show tools being called
- [ ] Show working widget on page

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Morgan (PM) | Initial spec |
