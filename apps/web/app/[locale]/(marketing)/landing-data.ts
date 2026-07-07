/* landing-data.ts — typed structure + per-locale selector for the FrontFace
   landing content. Display strings live in landing-data.en.ts /
   landing-data.ar.ts; loose UI strings live in messages/{locale}/marketing.json. */

import type { Locale } from "@/i18n/routing";

import type { IconName } from "./components/marketing-kit";
import { LANDING_AR } from "./landing-data.ar";
import { LANDING_EN } from "./landing-data.en";

export interface Demo {
  name: string;
  domain: string;
  mono: string;
  tag: string;
  pages: string[];
  greeting: string;
  q: string;
  cites: string[];
  a: string;
  q2: string;
  a2: string;
}

/* capabilities grid — [icon, title, description, featured?] */
export type Cap = [IconName, string, string, boolean?];

/* how-it-works steps — [icon, title, description] */
export type Step = [IconName, string, string];

export interface LandingData {
  demos: Demo[];
  caps: Cap[];
  steps: Step[];
  stats: [string, string][];
  /* nav — [label, href]. Anchors are prefixed with "/" so they navigate to
     the landing page first when clicked from another marketing route. */
  nav: [string, string][];
  /* resources mega-menu — [label, href, description, icon] */
  resourceLinks: [string, string, string, IconName][];
  /* footer columns — [title, [label, href][]] */
  footCols: [string, [string, string][]][];
}

export function getLandingData(locale: Locale): LandingData {
  return locale === "ar" ? LANDING_AR : LANDING_EN;
}
