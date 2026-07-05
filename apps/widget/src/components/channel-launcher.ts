import type { ChannelButton } from "../utils/widget-appearance";
import { isAllowedUrl, isAllowedIconUrl } from "../utils/widget-appearance";

export interface ChannelLauncherOptions {
  channels: ChannelButton[];
  position: "bottom-right" | "bottom-left";
}

const BRAND_ICONS: Record<string, { svg: string; color: string }> = {
  whatsapp: {
    svg: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.108-1.134l-.29-.174-3.012.79.804-2.94-.192-.302A8 8 0 1112 20z" fill="currentColor"/>',
    color: "#25D366",
  },
  instagram: {
    svg: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>',
    color: "#E4405F",
  },
  facebook: {
    svg: '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: "#1877F2",
  },
  email: {
    svg: '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M22 7l-10 7L2 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: "#6B7280",
  },
  phone: {
    svg: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: "#6B7280",
  },
};

const DEFAULT_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  email: "Email",
  phone: "Call us",
};

export class ChannelLauncher {
  element: HTMLDivElement;
  private expanded = false;

  constructor(private options: ChannelLauncherOptions) {
    this.element = this.createElement();
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement("div");
    container.className = "channel-launcher";
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Contact channels");

    for (const channel of this.options.channels) {
      if (!isAllowedUrl(channel.url)) continue;
      if (channel.iconUrl && !isAllowedIconUrl(channel.iconUrl)) continue;
      container.appendChild(this.createButton(channel));
    }

    return container;
  }

  private createButton(channel: ChannelButton): HTMLAnchorElement {
    const link = document.createElement("a");
    link.className = `channel-btn channel-btn--${channel.type}`;
    link.href = channel.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute(
      "aria-label",
      channel.label || DEFAULT_LABELS[channel.type] || channel.type
    );

    const brand = BRAND_ICONS[channel.type];

    if (channel.type === "custom" && channel.iconUrl) {
      const img = document.createElement("img");
      img.src = channel.iconUrl;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.className = "channel-btn__icon";
      img.onerror = () => { img.style.display = "none"; };
      link.appendChild(img);
    } else if (brand) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "channel-btn__icon");
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = brand.svg;
      if (brand.color) link.style.setProperty("--channel-color", brand.color);
      link.appendChild(svg);
    }

    if (channel.label) {
      const span = document.createElement("span");
      span.className = "channel-btn__label";
      span.textContent = channel.label;
      link.appendChild(span);
    }

    link.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        link.click();
      }
    });

    return link;
  }

  setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.element.classList.toggle("channel-launcher--expanded", expanded);
    this.element.setAttribute("aria-hidden", expanded ? "false" : "true");
  }

  destroy(): void {
    this.element.remove();
  }
}
