import Script from "next/script";
import { Header } from "./components/header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      {children}
      {/* SupportBase Help Chat Widget */}
      <Script
        src="https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js"
        data-project-id="ad7d8196-e719-4522-9f08-a9a3beb4c3d8"
        data-api-url="https://api.supportbase.app"
        data-title="Help"
        data-greeting="Hi! Have questions about SupportBase? I'm here to help."
        data-primary-color="#2563eb"
        data-position="bottom-right"
        strategy="lazyOnload"
      />
    </div>
  );
}
