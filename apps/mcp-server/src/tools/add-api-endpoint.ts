import { z } from "zod";

export const addApiEndpointTool = {
  name: "add_api_endpoint",
  description:
    "Configure an external API endpoint for the chatbot to call. The chatbot will use this to fetch real-time data when answering questions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: {
        type: "string",
        description: "The project ID to add the endpoint to",
      },
      name: {
        type: "string",
        description:
          "A descriptive name for the endpoint (e.g., 'Order Status API')",
      },
      url: {
        type: "string",
        description: "The full URL of the API endpoint",
      },
      method: {
        type: "string",
        enum: ["GET", "POST"],
        description: "HTTP method to use",
      },
      description: {
        type: "string",
        description:
          "Description of what data this endpoint provides. The chatbot uses this to decide when to call the API.",
      },
      headers: {
        type: "object",
        description:
          "Optional headers to include in API requests (e.g., authentication)",
      },
    },
    required: ["projectId", "name", "url", "method", "description"],
  },
  execute: async (
    args: unknown,
    _userId: string
  ): Promise<{
    endpointId: string;
    name: string;
    url: string;
    method: string;
    status: string;
  }> => {
    const schema = z.object({
      projectId: z.string(),
      name: z.string().min(1).max(100),
      url: z.string().url(),
      method: z.enum(["GET", "POST"]),
      description: z.string().min(1),
      headers: z.record(z.string()).optional(),
    });

    const { projectId, name, url, method, description, headers } =
      schema.parse(args);

    // TODO: Implement endpoint creation with Supabase in api-endpoints feature
    const endpointId = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      endpointId,
      name,
      url,
      method,
      status: "active",
    };
  },
};
