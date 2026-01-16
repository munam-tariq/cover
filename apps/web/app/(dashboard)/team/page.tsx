"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { useAgent } from "@/contexts/agent-context";
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
      const errorMessage = err instanceof Error ? err.message : "Failed to send invitation";
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
          <h2 className="text-lg font-semibold">Invite Team Member</h2>
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
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@company.com"
              required
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "agent")}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="agent">Agent - Can handle conversations</option>
              <option value="admin">Admin - Full project access</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {role === "admin"
                ? "Admins can manage settings, team, and handle conversations"
                : "Agents can view and respond to customer conversations"}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !email.trim() || !name.trim()}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {sending ? "Sending..." : "Send Invitation"}
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {member.email.charAt(0).toUpperCase()}
              </span>
            </div>
            {member.status === "active" && member.availability && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                  statusColors[member.availability.status]
                }`}
              />
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{member.name || member.email}</span>
              {member.status === "pending" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">
                  Pending
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{member.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">
                {member.role}
              </span>
              {member.status === "active" && member.availability && (
                <span className="text-xs text-muted-foreground">
                  {member.availability.currentChatCount}/{member.maxConcurrentChats} chats
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions for active members */}
        {isOwner && member.status === "active" && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-muted"
            >
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-card border rounded-md shadow-lg py-1 z-10">
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    onRemove(member);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
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
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Max Concurrent Chats</label>
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
              {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
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
      setError("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

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
      setSuccess("Member updated successfully");
      setTimeout(() => setSuccess(null), 3000);
      fetchTeam();
    } catch (err) {
      console.error("Failed to update member:", err);
      setError("Failed to update member");
    }
  };

  // Remove member
  const handleRemoveMember = async (member: TeamMember) => {
    if (!currentProject) return;

    const confirmed = confirm(
      `Are you sure you want to remove ${member.email} from the team?`
    );
    if (!confirmed) return;

    try {
      await apiClient(`/api/projects/${currentProject.id}/members/${member.id}`, {
        method: "DELETE",
      });
      setSuccess("Member removed successfully");
      setTimeout(() => setSuccess(null), 3000);
      fetchTeam();
    } catch (err) {
      console.error("Failed to remove member:", err);
      setError("Failed to remove member");
    }
  };

  // Cancel invitation
  const handleCancelInvitation = async (member: TeamMember) => {
    if (!currentProject) return;

    const confirmed = confirm(
      `Are you sure you want to cancel the invitation for ${member.email}? The invitation link will no longer work.`
    );
    if (!confirmed) return;

    try {
      await apiClient(`/api/projects/${currentProject.id}/members/${member.id}`, {
        method: "DELETE",
      });
      setSuccess("Invitation cancelled successfully");
      setTimeout(() => setSuccess(null), 3000);
      fetchTeam();
    } catch (err) {
      console.error("Failed to cancel invitation:", err);
      setError("Failed to cancel invitation");
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
        <h1 className="text-2xl font-bold">Team</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No project selected</p>
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
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            {activeMembers.length} member{activeMembers.length !== 1 ? "s" : ""} ({onlineCount}{" "}
            online)
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
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
          <h2 className="font-semibold mb-4">Team Members</h2>

          {members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No team members yet</p>
              {isOwner && (
                <Button onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Your First Team Member
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
