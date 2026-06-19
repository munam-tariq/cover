import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { MarketingWidgetLauncher } from "./components/marketing-widget-launcher";
import { ScrollReveal } from "./components/scroll-reveal";

export const dynamic = "force-static";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-light min-h-screen">
      <ScrollReveal />
      <Header />
      {children}
      <Footer />
      <MarketingWidgetLauncher />
    </div>
  );
}
