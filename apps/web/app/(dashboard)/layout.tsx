import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ProjectProvider } from "@/contexts/project-context";
import { AgentProvider } from "@/contexts/agent-context";
import { InboxPollingProvider } from "@/contexts/inbox-polling-context";
import { TourProvider } from "@/components/onboarding";
import { ProjectGuard } from "@/components/layout/project-guard";

// Force dynamic rendering for all dashboard pages (auth required)
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      <AgentProvider>
        <InboxPollingProvider>
          <TourProvider>
            <div className="min-h-screen flex">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 p-6 bg-muted/30">
                  <ProjectGuard>{children}</ProjectGuard>
                </main>
              </div>
            </div>
          </TourProvider>
        </InboxPollingProvider>
      </AgentProvider>
    </ProjectProvider>
  );
}
