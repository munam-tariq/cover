import { z } from "zod";

export const createProjectTool = {
  name: "create_project",
  description:
    "Create a new chatbot project. Returns the project ID and configuration details.",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Name for the chatbot project",
      },
      systemPrompt: {
        type: "string",
        description:
          "Optional custom system prompt for the chatbot. Defaults to a helpful assistant prompt.",
      },
    },
    required: ["name"],
  },
  execute: async (
    args: unknown,
    _userId: string
  ): Promise<{
    projectId: string;
    name: string;
    systemPrompt: string;
    createdAt: string;
  }> => {
    const schema = z.object({
      name: z.string().min(1).max(100),
      systemPrompt: z.string().optional(),
    });

    const { name, systemPrompt } = schema.parse(args);

    // TODO: Implement project creation with Supabase in database-setup feature
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      projectId,
      name,
      systemPrompt:
        systemPrompt ||
        "You are a helpful assistant. Answer questions based on the provided knowledge base.",
      createdAt: new Date().toISOString(),
    };
  },
};
