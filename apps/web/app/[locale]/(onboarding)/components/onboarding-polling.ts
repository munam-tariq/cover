interface OnboardingPollingStatus {
  status?: string;
  crawlProgress?: {
    pagesFound?: number;
    pagesProcessed?: number;
    maxPages?: number;
  };
  structureProgress?: {
    total?: number;
    completed?: number;
  };
  crawledUrls?: unknown[];
  pages?: unknown[];
  totals?: {
    pages?: number;
    words?: number;
    estimatedChunks?: number;
    imported?: number;
  };
  selfTest?: {
    status?: string;
    questions?: unknown[];
  };
}

const ACTIVE_POLL_DELAY_MS = 4_000;
const STABLE_POLL_DELAYS_MS = [8_000, 12_000, 15_000] as const;

export function getOnboardingProgressSignature(status: OnboardingPollingStatus): string {
  return JSON.stringify({
    status: status.status,
    crawl: status.crawlProgress,
    structure: status.structureProgress,
    crawledUrlCount: status.crawledUrls?.length,
    pageCount: status.pages?.length,
    totals: status.totals,
    selfTestStatus: status.selfTest?.status,
    selfTestQuestionCount: status.selfTest?.questions?.length,
  });
}

export function getNextOnboardingPoll(
  previousSignature: string | null,
  currentSignature: string,
  unchangedPolls: number
): { delayMs: number; unchangedPolls: number } {
  if (previousSignature === null || previousSignature !== currentSignature) {
    return { delayMs: ACTIVE_POLL_DELAY_MS, unchangedPolls: 0 };
  }

  const nextUnchangedPolls = Math.min(unchangedPolls + 1, STABLE_POLL_DELAYS_MS.length);
  return {
    delayMs: STABLE_POLL_DELAYS_MS[nextUnchangedPolls - 1],
    unchangedPolls: nextUnchangedPolls,
  };
}
