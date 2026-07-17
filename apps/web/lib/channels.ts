export interface ChannelMeta {
  labelKey: string;
  icon: string;
  color: string;
}

export interface ChannelOption extends ChannelMeta {
  source: string;
}

interface ChannelDefinition extends ChannelOption {
  /** Historical sources still need readable metadata but should not appear as current filters. */
  filterable?: boolean;
}

const DEFAULT_CHANNEL_COLOR = "currentColor";

const CHANNELS: readonly ChannelDefinition[] = [
  {
    source: "widget",
    labelKey: "sources.widget",
    icon: "MessageSquare",
    color: DEFAULT_CHANNEL_COLOR,
  },
  {
    source: "whatsapp",
    labelKey: "sources.whatsapp",
    icon: "MessageCircle",
    color: "#25D366",
  },
  {
    source: "public",
    labelKey: "sources.public",
    icon: "Globe",
    color: DEFAULT_CHANNEL_COLOR,
  },
  {
    source: "voice",
    labelKey: "sources.voice",
    icon: "Phone",
    color: DEFAULT_CHANNEL_COLOR,
    filterable: false,
  },
  {
    source: "mobile",
    labelKey: "sources.mobile",
    icon: "Smartphone",
    color: DEFAULT_CHANNEL_COLOR,
  },
  {
    source: "playground",
    labelKey: "sources.playground",
    icon: "Play",
    color: DEFAULT_CHANNEL_COLOR,
  },
  {
    source: "api",
    labelKey: "sources.api",
    icon: "Code",
    color: DEFAULT_CHANNEL_COLOR,
  },
  {
    source: "mcp",
    labelKey: "sources.mcp",
    icon: "Terminal",
    color: DEFAULT_CHANNEL_COLOR,
  },
] as const;

const CHANNEL_MAP = new Map<string, ChannelMeta>(
  CHANNELS.map(({ source, filterable: _filterable, ...meta }) => [source, meta])
);

const FILTERABLE_CHANNELS: readonly ChannelOption[] = CHANNELS.filter(
  ({ filterable }) => filterable !== false
).map(({ source, labelKey, icon, color }) => ({
  source,
  labelKey,
  icon,
  color,
}));

const FALLBACK: ChannelMeta = {
  labelKey: "sources.chat",
  icon: "MessageSquare",
  color: DEFAULT_CHANNEL_COLOR,
};

export function getChannelMeta(source: string): ChannelMeta {
  return CHANNEL_MAP.get(source) ?? FALLBACK;
}

export function getChannelOptions(): readonly ChannelOption[] {
  return FILTERABLE_CHANNELS;
}
