export interface ChannelMeta {
  label: string;
  icon: string;
  color: string;
}

const DEFAULT_CHANNEL_COLOR = "currentColor";

const CHANNEL_MAP: Record<string, ChannelMeta> = {
  whatsapp: { label: "WhatsApp", icon: "MessageCircle", color: "#25D366" },
  widget: { label: "Widget", icon: "MessageSquare", color: DEFAULT_CHANNEL_COLOR },
  public: { label: "Public Page", icon: "Globe", color: DEFAULT_CHANNEL_COLOR },
  voice: { label: "Voice", icon: "Phone", color: DEFAULT_CHANNEL_COLOR },
  mobile: { label: "Mobile", icon: "Smartphone", color: DEFAULT_CHANNEL_COLOR },
  playground: { label: "Playground", icon: "Play", color: DEFAULT_CHANNEL_COLOR },
  api: { label: "API", icon: "Code", color: DEFAULT_CHANNEL_COLOR },
  mcp: { label: "MCP", icon: "Terminal", color: DEFAULT_CHANNEL_COLOR },
};

const FALLBACK: ChannelMeta = { label: "Chat", icon: "MessageSquare", color: DEFAULT_CHANNEL_COLOR };

export function getChannelMeta(source: string): ChannelMeta {
  return CHANNEL_MAP[source] ?? FALLBACK;
}
