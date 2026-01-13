import { Header } from "./components/header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />
      {children}
    </div>
  );
}
