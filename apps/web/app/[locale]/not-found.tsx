import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>{t("title")}</h1>
        <p style={{ marginTop: 8, color: "var(--ff-soft)" }}>{t("description")}</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/" style={{ textDecoration: "underline" }}>{t("backHome")}</Link>
        </p>
      </div>
    </main>
  );
}
