export interface WidgetPreviewKeyCandidate {
  id: string;
  key: string;
  platform: string;
  active: boolean;
  revokedAt: string | null;
}

const PREVIEW_KEY_PLATFORMS = new Set(["web", "all"]);

export function selectReusableWidgetPreviewKey<
  T extends WidgetPreviewKeyCandidate,
>(keys: readonly T[]): T | null {
  return (
    keys.find(
      (key) =>
        key.active &&
        !key.revokedAt &&
        PREVIEW_KEY_PLATFORMS.has(key.platform)
    ) ?? null
  );
}
