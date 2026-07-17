import type { InboxSort } from "./inbox-query";

export interface InboxTimeLabels {
  lessThanMinute: string;
  waitingFor: (values: { duration: string }) => string;
  customerReplied: (values: { relative: string }) => string;
  yesterdayAt: (values: { time: string }) => string;
}

export interface InboxTimeInput {
  sort: InboxSort;
  priorityReason: "waiting" | "customer_reply" | "activity";
  priorityAt: string;
  meaningfulActivityAt: string;
  locale: string;
  labels: InboxTimeLabels;
  now?: Date;
}

export interface InboxTimeOutput {
  text: string;
  full: string;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatElapsed(
  elapsedMs: number,
  locale: string,
  lessThanMinute: string
): string {
  if (elapsedMs < MINUTE_MS) return lessThanMinute;

  const [value, unit]: [number, Intl.NumberFormatOptions["unit"]] =
    elapsedMs < HOUR_MS
      ? [Math.floor(elapsedMs / MINUTE_MS), "minute"]
      : elapsedMs < DAY_MS
        ? [Math.floor(elapsedMs / HOUR_MS), "hour"]
        : [Math.floor(elapsedMs / DAY_MS), "day"];

  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "short",
  }).format(value);
}

function formatRelative(elapsedMs: number, locale: string): string {
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    elapsedMs < HOUR_MS
      ? [Math.round(elapsedMs / MINUTE_MS), "minute"]
      : elapsedMs < DAY_MS
        ? [Math.round(elapsedMs / HOUR_MS), "hour"]
        : [Math.round(elapsedMs / DAY_MS), "day"];

  return new Intl.RelativeTimeFormat(locale, {
    numeric: "always",
    style: "short",
  }).format(-value, unit);
}

function formatAbsolute(
  date: Date,
  now: Date,
  locale: string,
  labels: InboxTimeLabels
): string {
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (isSameDay(date, now)) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return labels.yesterdayAt({ time });

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear()
      ? {}
      : { year: "numeric" as const }),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatInboxTime(input: InboxTimeInput): InboxTimeOutput {
  const now = input.now ?? new Date();
  const priorityDate = new Date(input.priorityAt);
  const activityDate = new Date(input.meaningfulActivityAt);
  const displayDate =
    input.sort === "attention" && input.priorityReason !== "activity"
      ? priorityDate
      : activityDate;

  if (Number.isNaN(displayDate.getTime())) return { text: "", full: "" };

  const elapsedMs = Math.max(0, now.getTime() - displayDate.getTime());
  let text: string;

  if (input.sort === "attention" && input.priorityReason === "waiting") {
    text = input.labels.waitingFor({
      duration: formatElapsed(
        elapsedMs,
        input.locale,
        input.labels.lessThanMinute
      ),
    });
  } else if (
    input.sort === "attention" &&
    input.priorityReason === "customer_reply"
  ) {
    text = input.labels.customerReplied({
      relative: formatRelative(elapsedMs, input.locale),
    });
  } else {
    text = formatAbsolute(displayDate, now, input.locale, input.labels);
  }

  const full = new Intl.DateTimeFormat(input.locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "long",
  }).format(displayDate);

  return { text, full };
}
