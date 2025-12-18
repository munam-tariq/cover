import { z } from "zod";

export const listProjectsTool = {
  name: "list_projects",
  description:
    "List all chatbot projects for the authenticated user. Returns project IDs, names, and basic stats.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of projects to return (default: 10)",
      },
      offset: {
        type: "number",
        description: "Number of projects to skip (for pagination)",
      },
    },
    required: [],
  },
  execute: async (
    args: unknown,
    _userId: string
  ): Promise<{
    projects: {
      id: string;
      name: string;
      knowledgeSources: number;
      apiEndpoints: number;
      createdAt: string;
    }[];
    total: number;
  }> => {
    const schema = z.object({
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    });

    const { limit, offset } = schema.parse(args || {});

    // TODO: Implement project listing with Supabase in database-setup feature
    // For now, return empty list
    return {
      projects: [],
      total: 0,
    };
  },
};
