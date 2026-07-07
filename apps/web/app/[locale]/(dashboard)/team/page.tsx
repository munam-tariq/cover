"use client";

import { Button, Card, CardContent, Skeleton } from "@chatbot/ui";
import {
  AlertCircle,
  Check,
  Loader2,
  UserPlus,
  MoreHorizontal,
  Trash2,
  Settings,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";

import { useAgent } from "@/contexts/agent-context";
import { useProject } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  id: string;
  userId: string | null;
  email: string;
  name?: string;
  role: "admin" | "agent";
  status: "pending" | "active" | "suspended";
  maxConcurrentChats: number;
  createdAt: string;
  availability?: {
    status: "online" | "away" | "offline";
    currentChatCount: number;
  };
}

interface TeamListResponse {
  members: TeamMember[];
}

// ============================================================================
// Invite Modal Component
// ============================================================================

function InviteModal({
  isOpen,
  onClose,
  onInvite,
  projectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: () => void;
  projectId: string;
}) {
  const t = useTranslations("dashboard.pages.team");
  const actionsT = useTranslations("dashboard.actions");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setSending(true);
    setError(null);

    try {
      await apiClient(`/api/projects/${projectId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role,
        }),
      });
      setEmail("");
      setName("");
      setRole("agent");
      onInvite();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to send invitation:", err);
      const errorMessage = err instanceof Error ? err.message : t("modal.sendError");
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("modal.title")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t("modal.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("modal.namePlaceholder")}
              required
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("modal.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("modal.emailPlaceholder")}
              required
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("modal.role")}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "agent")}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="agent">{t("modal.agentOption")}</option>
              <option value="admin">{t("modal.adminOption")}</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {role === "admin"
                ? t("modal.adminHelp")
                : t("modal.agentHelp")}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
              {actionsT("cancel")}
            </Button>
            <Button type="submit" disabled={sending || !email.trim() || !name.trim()}>
              {sending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {sending ? t("modal.sending") : t("modal.sendInvitation")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Member Card Component
// ============================================================================

function MemberCard({
  member,
  isOwner,
  onUpdate,
  onRemove,
  onCancelInvite,
}: {
  member: TeamMember;
  isOwner: boolean;
  onUpdate: (member: TeamMember, updates: Partial<TeamMember>) => void;
  onRemove: (member: TeamMember) => void;
  onCancelInvite: (member: TeamMember) => void;
}) {
  const t = useTranslations("dashboard.pages.team");
  const actionsT = useTranslations("dashboard.actions");
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [maxChats, setMaxChats] = useState(member.maxConcurrentChats);
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    await onUpdate(member, { maxConcurrentChats: maxChats });
    setSaving(false);
    setShowSettings(false);
  };

  const statusColors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    offline: "bg-gray-400",
  };

  return (
    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {member.email.charAt(0).toUpperCase()}
              </span>
            </div>
            {member.status === "active" && member.availability && (
              <span
                className={`absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-card ${
                  statusColors[member.availability.status]
                }`}
              />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate min-w-0 flex-1">{member.name || member.email}</span>
              {member.status === "pending" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 shrink-0">
                  {t("pending")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">
                {member.role}
              </span>
              {member.status === "active" && member.availability && (
                <span className="text-xs text-muted-foreground">
                  {t("chats", {
                    current: member.availability.currentChatCount,
                    max: member.maxConcurrentChats,
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions for active members */}
        {isOwner && member.status === "active" && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-muted"
            >
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </button>

            {showMenu && (
              <div className="absolute end-0 top-full mt-1 w-40 bg-card border rounded-md shadow-lg py-1 z-10">
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-start hover:bg-muted flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {t("settings")}
                </button>
                <button
                  onClick={() => {
                    onRemove(member);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-start hover:bg-muted flex items-center gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("remove")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancel button for pending invitations */}
        {isOwner && member.status === "pending" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCancelInvite(member)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 me-1" />
            {t("cancel")}
          </Button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("maxConcurrentChats")}</label>
            <input
              type="number"
              value={maxChats}
              onChange={(e) => setMaxChats(parseInt(e.target.value) || 1)}
              min={1}
              max={20}
              className="w-24 px-3 py-2 border border-input rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
              {saving && <Loader2 className="h-3 w-3 me-1 animate-spin" />}
              {actionsT("save")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSettings(false)}>
              {actionsT("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function TeamPage() {
  const t = useTranslations("dashboard.pages.team");
  const { currentProject, isLoading: projectLoading } = useProject();
  const { role } = useAgent();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch team members
  const fetchTeam = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<TeamListResponse>(
        `/api/projects/${currentProject.id}/members`
      );
      setMembers(response.members || []);
    } catch (err) {
      console.error("Failed to fetch team:", err);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentProject, t]);

  useEffect(() => {
    if (currentProject) {
      fetchTeam();
    }
  }, [currentProject, fetchTeam]);

  // Update member
  const handleUpdateMember = async (member: TeamMember, updates: Partial<TeamMember>) => {
    if (!currentProject) return;

    try {
      await apiClient(`/api/projects/${currentProject.id}/members/${member.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      setSuccess(t("updateSuccess"));
      setTimeout(() => setSuccess(null), 3000);
      fetchTeam();
    } catch (err) {
      console.error("Failed to update member:", err);
      setError(t("updateError"));
    }
  };

  // Remove member
  const handleRemoveMember = async (member: TeamMember) => {
    if (!currentProject) return;

    const confirmed = confirm(
      t("removeConfirm", { email: member.email })
    );
    if (!confirmed) return;

    try {
      await apiClient(`/api/projects/${currentProject.id}/members/${member.id}`, {
        method: "DELETE",
      });
      setSuccess(t("removeSuccess"));
      setTimeout(() => setSuccess(null), 3000);
      fetchTeam();
    } catch (err) {
      console.error("Failed to remove member:", err);
      setError(t("removeError"));
    }
  };

  // Cancel invitation
  const handleCancelInvitation = async (member: TeamMember) => {
    if (!currentProject) return;

    const confirmed = confirm(
      t("cancelInviteConfirm", { email: member.email })
    );
    if (!confirmed) return;

    try {
      await apiClient(`/api/projects/${currentProject.id}/members/${member.id}`, {
        method: "DELETE",
      });
      setSuccess(t("cancelInviteSuccess"));
      setTimeout(() => setSuccess(null), 3000);
      fetchTeam();
    } catch (err) {
      console.error("Failed to cancel invitation:", err);
      setError(t("cancelInviteError"));
    }
  };

  // Loading state
  if (projectLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{t("noProjectSelected")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = role?.isOwner;
  const activeMembers = members.filter((m) => m.status === "active");
  const onlineCount = activeMembers.filter(
    (m) => m.availability?.status === "online"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("summary", { members: activeMembers.length, online: onlineCount })}
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4 me-2" />
            {t("inviteMember")}
          </Button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ms-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-green-500/10 text-green-600">
          <Check className="h-4 w-4" />
          <p>{success}</p>
        </div>
      )}

      {/* Team Members */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">{t("teamMembers")}</h2>

          {members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t("noTeamMembers")}</p>
              {isOwner && (
                <Button onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="h-4 w-4 me-2" />
                  {t("inviteFirst")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isOwner={!!isOwner}
                  onUpdate={handleUpdateMember}
                  onRemove={handleRemoveMember}
                  onCancelInvite={handleCancelInvitation}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={fetchTeam}
        projectId={currentProject.id}
      />
    </div>
  );
}
