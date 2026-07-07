import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { type Locale } from "@/i18n/routing";
import { localizedAlternates, ogLocale } from "@/lib/seo";

import { LegalPage, type LegalSection } from "../components/legal-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms.meta" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://frontface.app/terms",
      type: "website",
      siteName: "FrontFace",
      locale: ogLocale(locale as Locale),
      images: [
        { url: "https://frontface.app/og-image.png", width: 1200, height: 630, alt: t("ogImageAlt") },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@frontface",
      creator: "@frontface",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [
        { url: "https://frontface.app/og-image.png", width: 1200, height: 630, alt: t("ogImageAlt") },
      ],
    },
    alternates: localizedAlternates("/terms"),
  };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = await getTranslations("legal.terms");
  const common = await getTranslations("common");
  const sections = t.raw("sections") as LegalSection[];

  return (
    <LegalPage
      eyebrow={t("eyebrow")}
      title={t("title")}
      sub={t("sub")}
      lastUpdated={t("lastUpdated")}
      legalNotice={locale === "ar" ? common("legalNotice") : undefined}
      sections={sections}
    />
  );
}
