"use client";

import { Button, Skeleton } from "@chatbot/ui";
import { Check, FolderOpen, Menu, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileDrawer } from "@/components/mobile-drawer";
import { useAgent, type AgentStatus } from "@/contexts/agent-context";
import { useProject } from "@/contexts/project-context";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { statusConfig } from "./agent-status-dropdown";
// import { NotificationsButton } from "./notifications-button"; // not wired up yet
import { SidebarContent } from "./sidebar";

// Hamburger + slide-in drawer, shown only below `md`. Desktop keeps the
// persistent Sidebar/Header controls (see sidebar.tsx, header.tsx).
export function MobileNav() {
  const t = useTranslations("dashboard.shell.mobileNav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation, matching the sidebar's own pendingHref reset.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 rounded-md hover:bg-muted transition-colors md:hidden"
        aria-label={t("open")}
      >
        <Menu className="h-5 w-5" />
      </button>
      <MobileDrawer
        open={open}
        onOpenChange={setOpen}
        side="start"
        title={t("title")}
        description={t("description")}
        closeLabel={t("close")}
      >
        <SidebarContent />

        <div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-3">
          <MobileProjectPicker onSelectProject={() => setOpen(false)} />
          <MobileStatusPicker />
          <LocaleSwitcher variant="chips" className="flex gap-1.5" />
          {/* <NotificationsButton /> — not wired up yet */}
        </div>
      </MobileDrawer>
    </>
  );
}

// Compact inline status picker for the drawer — a floating popover (like the
// desktop AgentStatusDropdown) doesn't fit this narrow, scrollable context, so
// this renders all options inline instead of behind a collapsed trigger.
function MobileStatusPicker() {
  const t = useTranslations("dashboard.status");
  const { availability, updateStatus, isLoading, role } = useAgent();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!role?.isAgent || isLoading) return null;

  const currentStatus = availability?.status || "offline";

  const handleStatusChange = async (status: AgentStatus) => {
    if (status === currentStatus || isUpdating) return;
    setIsUpdating(true);
    try {
      await updateStatus(status);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // No label here — SidebarContent's own "Agent Status" footer (rendered just
  // above this card) already gives that context; repeating it read as duplicated.
  return (
    <div className="flex gap-1.5">
      {(Object.keys(statusConfig) as AgentStatus[]).map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => handleStatusChange(status)}
          disabled={isUpdating}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
            status === currentStatus
              ? `${statusConfig[status].bgColor} font-semibold`
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[status].color}`} />
          {t(status)}
        </button>
      ))}
    </div>
  );
}

// Compact inline project ("agent") switcher for the drawer — same reasoning as
// MobileStatusPicker: a floating popover doesn't suit this narrow context, so
// the project list renders inline with the current one highlighted.
function MobileProjectPicker({
  onSelectProject,
}: {
  onSelectProject?: () => void;
}) {
  const t = useTranslations("dashboard.shell.projectSwitcher");
  const router = useRouter();
  const { currentProject, projects, isLoading, switchProject } = useProject();

  const truncateName = (name: string, maxLength: number = 30) =>
    name.length <= maxLength ? name : `${name.slice(0, maxLength)}...`;

  const handleSelectProject = (projectId: string) => {
    switchProject(projectId);
    router.refresh();
    onSelectProject?.();
  };

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!currentProject) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/projects")}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        {t("createAgent")}
      </Button>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-xs text-muted-foreground">{t("switchAgent")}</p>
      <div className="space-y-0.5">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => handleSelectProject(project.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-sm transition-colors",
              project.id === currentProject.id
                ? "bg-background font-medium"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="truncate">{truncateName(project.name)}</span>
            {project.id === currentProject.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-1.5 space-y-0.5 border-t pt-1.5">
        <button
          type="button"
          onClick={() => router.push("/projects?create=true")}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          {t("newAgent")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-muted"
        >
          <FolderOpen className="h-4 w-4" />
          {t("viewAllAgents")}
        </button>
      </div>
    </div>
  );
}
