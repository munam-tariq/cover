import Script from "next/script";

import { CursorGlow } from "./components/cursor-glow";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { ScrollProgress } from "./components/scroll-progress";
import { ScrollReveal } from "./components/scroll-reveal";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-light min-h-screen">
      <ScrollProgress />
      <CursorGlow />
      <ScrollReveal />
      <Header />
      {children}
      <Footer />
      {/* FrontFace Help Chat Widget */}
      <Script
        src="https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js"
        data-project-id="ad7d8196-e719-4522-9f08-a9a3beb4c3d8"
        data-api-url="https://api.frontface.app"
        data-title="Help"
        data-greeting="Hi! Have questions about FrontFace? I'm here to help."
        data-primary-color="#11151b"
        data-position="bottom-right"
        strategy="lazyOnload"
      />
    </div>
  );
}
