/* window-mark.tsx — FrontFace window logo glyph (inner mark only, no tile).
   Server-safe: pure SVG, no hooks or client APIs. Inherits color via
   `currentColor`, so render it inside a colored tile (ink tile → white mark,
   white tile → ink mark). Single source for every in-app brand tile. */

type WindowMarkProps = {
  /** Rendered width/height in px. The glyph is inset ~24% inside the box. */
  size?: number;
  className?: string;
};

export function WindowMark({ size = 20, className }: WindowMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect x="24" y="26" width="52" height="48" rx="11" stroke="currentColor" strokeWidth="7" />
      <circle cx="34" cy="37" r="3" fill="currentColor" />
      <g fill="currentColor">
        <rect x="40" y="46" width="5.5" height="20" rx="2" />
        <rect x="40" y="46" width="17" height="5.5" rx="2" />
        <rect x="40" y="55" width="12" height="5.5" rx="2" />
      </g>
    </svg>
  );
}
