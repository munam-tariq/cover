import { DirectionProvider } from "@chatbot/ui";
import { getLocale } from "next-intl/server";

import { DashboardContentTransition } from "@/components/layout/dashboard-content-transition";
import { Header } from "@/components/layout/header";
import { ProjectGuard } from "@/components/layout/project-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { TourProvider } from "@/components/onboarding";
import { AgentProvider } from "@/contexts/agent-context";
import { InboxPollingProvider } from "@/contexts/inbox-polling-context";
import { ProjectProvider } from "@/contexts/project-context";

// Force dynamic rendering for all dashboard pages (auth required)
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <DirectionProvider dir={locale === "ar" ? "rtl" : "ltr"}>
      <ProjectProvider>
        <AgentProvider>
          <InboxPollingProvider>
            <TourProvider>
              <div className="min-h-screen flex">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Header />
                  <main className="min-w-0 flex-1 p-6 bg-muted/30">
                    <ProjectGuard>
                      <DashboardContentTransition>
                        {children}
                      </DashboardContentTransition>
                    </ProjectGuard>
                  </main>
                </div>
              </div>
            </TourProvider>
          </InboxPollingProvider>
        </AgentProvider>
      </ProjectProvider>
    </DirectionProvider>
  );
}
