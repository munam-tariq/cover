import {
  Code,
  Globe,
  MessageCircle,
  MessageSquare,
  Phone,
  Play,
  Smartphone,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

import { getChannelMeta } from "@/lib/channels";

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  MessageCircle,
  MessageSquare,
  Globe,
  Phone,
  Smartphone,
  Play,
  Code,
  Terminal,
};

interface ConversationMetadataChipProps {
  icon: LucideIcon;
  label: string;
  iconStyle?: CSSProperties;
}

export function ConversationMetadataChip({
  icon: Icon,
  label,
  iconStyle,
}: ConversationMetadataChipProps) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-normal">
      <Icon aria-hidden="true" className="h-3 w-3" style={iconStyle} />
      <span>{label}</span>
    </span>
  );
}

export function ChannelChip({
  source,
  label,
}: {
  source: string;
  label: string;
}) {
  const meta = getChannelMeta(source);
  const Icon = CHANNEL_ICONS[meta.icon] ?? MessageSquare;

  return (
    <ConversationMetadataChip
      icon={Icon}
      label={label}
      iconStyle={{ color: meta.color }}
    />
  );
}
