#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { createProjectTool } from "./tools/create-project";
import { uploadKnowledgeTool } from "./tools/upload-knowledge";
import { addApiEndpointTool } from "./tools/add-api-endpoint";
import { getEmbedCodeTool } from "./tools/get-embed-code";
import { listProjectsTool } from "./tools/list-projects";
import { authenticate } from "./auth";

const server = new Server(
  {
    name: "chatbot-mcp",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  createProjectTool,
  uploadKnowledgeTool,
  addApiEndpointTool,
  getEmbedCodeTool,
  listProjectsTool,
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Find the tool
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  }

  try {
    // Authenticate if needed
    const authResult = await authenticate();
    if (!authResult.authenticated) {
      return {
        content: [
          {
            type: "text",
            text: `Authentication required. Please configure your API key in the environment.`,
          },
        ],
        isError: true,
      };
    }

    // Execute the tool
    const result = await tool.execute(args, authResult.userId!);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Chatbot MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
