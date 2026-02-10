import Script from "next/script";
import { Header } from "./components/header";
import { CursorGlow } from "./components/cursor-glow";
import { ScrollProgress } from "./components/scroll-progress";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-light min-h-screen bg-white text-[#09090b]">
      <ScrollProgress />
      <CursorGlow />
      <Header />
      {children}
      {/* FrontFace Help Chat Widget */}
      <Script
        src="https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js"
        data-project-id="ad7d8196-e719-4522-9f08-a9a3beb4c3d8"
        data-api-url="https://api.frontface.app"
        data-title="Help"
        data-greeting="Hi! Have questions about FrontFace? I'm here to help."
        data-primary-color="#3b82f6"
        data-position="bottom-right"
        strategy="lazyOnload"
      />
    </div>
  );
}
