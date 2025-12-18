import { z } from "zod";

export const getEmbedCodeTool = {
  name: "get_embed_code",
  description:
    "Get the embed code to add the chatbot widget to a website. Returns HTML script tag that can be pasted into any webpage.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: {
        type: "string",
        description: "The project ID to get embed code for",
      },
    },
    required: ["projectId"],
  },
  execute: async (
    args: unknown,
    _userId: string
  ): Promise<{
    embedCode: string;
    projectId: string;
    widgetUrl: string;
  }> => {
    const schema = z.object({
      projectId: z.string(),
    });

    const { projectId } = schema.parse(args);

    const cdnUrl = process.env.CDN_URL || "https://cdn.chatbot.example";
    const embedCode = `<script src="${cdnUrl}/widget.js" data-chatbot-id="${projectId}"></script>`;

    return {
      embedCode,
      projectId,
      widgetUrl: `${cdnUrl}/widget.js`,
    };
  },
};
