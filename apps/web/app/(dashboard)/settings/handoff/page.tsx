"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import { Button, Card, CardContent, Skeleton, Switch, Label } from "@chatbot/ui";
import {
  AlertCircle,
  Check,
  Loader2,
  ChevronLeft,
  Users,
  Clock,
  MessageSquare,
  Zap,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface HandoffSettings {
  enabled: boolean;
  triggerMode: "auto" | "manual" | "both";
  autoTriggers: {
    lowConfidence: { enabled: boolean; threshold: number };
    keywords: { enabled: boolean; keywords: string[] };
    customerRequest: { enabled: boolean };
  };
  showHumanButton: boolean;
  buttonText: string;
  businessHoursEnabled: boolean;
  timezone: string;
  businessHours: Record<
    string,
    { start: string; end: string; enabled: boolean }
  >;
  offlineMessage: string;
  queueMessage: string;
  agentJoinedMessage: string;
  maxQueueSize: number;
  assignmentMode: "round_robin" | "least_busy" | "manual";
}

interface HandoffSettingsResponse {
  settings: HandoffSettings;
}

// ============================================================================
// Constants
// ============================================================================

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const DEFAULT_SETTINGS: HandoffSettings = {
  enabled: false,
  triggerMode: "both",
  autoTriggers: {
    lowConfidence: { enabled: true, threshold: 0.3 },
    keywords: { enabled: true, keywords: ["speak to human", "talk to agent", "human please"] },
    customerRequest: { enabled: true },
  },
  showHumanButton: true,
  buttonText: "Talk to a human",
  businessHoursEnabled: false,
  timezone: "America/New_York",
  businessHours: {
    monday: { start: "09:00", end: "17:00", enabled: true },
    tuesday: { start: "09:00", end: "17:00", enabled: true },
    wednesday: { start: "09:00", end: "17:00", enabled: true },
    thursday: { start: "09:00", end: "17:00", enabled: true },
    friday: { start: "09:00", end: "17:00", enabled: true },
    saturday: { start: "09:00", end: "17:00", enabled: false },
    sunday: { start: "09:00", end: "17:00", enabled: false },
  },
  offlineMessage: "Our team is currently offline. Please leave your email and we'll get back to you soon.",
  queueMessage: "Please wait while we connect you with an agent. You are number {position} in the queue.",
  agentJoinedMessage: "You're now connected with {agent_name}.",
  maxQueueSize: 50,
  assignmentMode: "least_busy",
};

// Common timezones
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (AZ)" },
  { value: "America/Anchorage", label: "Alaska (AK)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HI)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "UTC", label: "UTC" },
];

// ============================================================================
// Component
// ============================================================================

export default function HandoffSettingsPage() {
  const { currentProject, isLoading: projectLoading } = useProject();
  const [settings, setSettings] = useState<HandoffSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Local state for keywords input to allow typing commas
  const [keywordsInput, setKeywordsInput] = useState("");

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<HandoffSettingsResponse>(
        `/api/projects/${currentProject.id}/handoff-settings`
      );
      const loadedSettings = response.settings || DEFAULT_SETTINGS;
      setSettings(loadedSettings);
      setKeywordsInput(loadedSettings.autoTriggers.keywords.keywords.join(", "));
    } catch (err) {
      console.error("Failed to fetch handoff settings:", err);
      // Use defaults if no settings exist yet
      setSettings(DEFAULT_SETTINGS);
      setKeywordsInput(DEFAULT_SETTINGS.autoTriggers.keywords.keywords.join(", "));
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentProject) {
      fetchSettings();
    }
  }, [currentProject, fetchSettings]);

  // Save settings
  const handleSave = async () => {
    if (!currentProject) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient(`/api/projects/${currentProject.id}/handoff-settings`, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSuccess("Handoff settings saved successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save handoff settings:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Update nested settings
  const updateSetting = <K extends keyof HandoffSettings>(
    key: K,
    value: HandoffSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateAutoTrigger = (
    trigger: keyof HandoffSettings["autoTriggers"],
    value: Partial<HandoffSettings["autoTriggers"][typeof trigger]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      autoTriggers: {
        ...prev.autoTriggers,
        [trigger]: { ...prev.autoTriggers[trigger], ...value },
      },
    }));
  };

  const updateBusinessHours = (
    day: string,
    value: Partial<{ start: string; end: string; enabled: boolean }>
  ) => {
    setSettings((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], ...value },
      },
    }));
  };

  // Loading state
  if (projectLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Human Handoff Settings</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No project selected</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Human Handoff Settings</h1>
            <p className="text-muted-foreground">
              Configure when and how customers can connect with human agents
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-green-500/10 text-green-600">
          <Check className="h-4 w-4" />
          <p>{success}</p>
        </div>
      )}

      {/* Main Enable Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Enable Human Handoff</h2>
                <p className="text-sm text-muted-foreground">
                  Allow customers to connect with human agents when AI can&apos;t help
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting("enabled", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings (shown when enabled) */}
      {settings.enabled && (
        <>
          {/* Trigger Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Trigger Configuration</h2>
              </div>

              {/* Trigger Mode */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Trigger Mode</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose how handoff can be initiated
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "auto", label: "Auto Only", desc: "AI triggers handoff" },
                      { value: "manual", label: "Manual Only", desc: "Customer requests" },
                      { value: "both", label: "Both", desc: "Auto + Manual" },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => updateSetting("triggerMode", mode.value as "auto" | "manual" | "both")}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          settings.triggerMode === mode.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <p className="font-medium text-sm">{mode.label}</p>
                        <p className="text-xs text-muted-foreground">{mode.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Triggers */}
                {(settings.triggerMode === "auto" || settings.triggerMode === "both") && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium">Auto Trigger Conditions</h3>

                    {/* Low Confidence */}
                    <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Low Confidence Response</Label>
                        <p className="text-xs text-muted-foreground">
                          Trigger when AI confidence is below threshold
                        </p>
                        {settings.autoTriggers.lowConfidence.enabled && (
                          <div className="mt-2 flex items-center gap-2">
                            <Label className="text-xs">Threshold:</Label>
                            <input
                              type="range"
                              min="0.1"
                              max="0.9"
                              step="0.1"
                              value={settings.autoTriggers.lowConfidence.threshold}
                              onChange={(e) =>
                                updateAutoTrigger("lowConfidence", { threshold: parseFloat(e.target.value) })
                              }
                              className="w-24"
                            />
                            <span className="text-xs text-muted-foreground">
                              {(settings.autoTriggers.lowConfidence.threshold * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={settings.autoTriggers.lowConfidence.enabled}
                        onCheckedChange={(checked) =>
                          updateAutoTrigger("lowConfidence", { enabled: checked })
                        }
                      />
                    </div>

                    {/* Keywords */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">Keyword Detection</Label>
                          <p className="text-xs text-muted-foreground">
                            Trigger when customer uses specific phrases
                          </p>
                        </div>
                        <Switch
                          checked={settings.autoTriggers.keywords.enabled}
                          onCheckedChange={(checked) =>
                            updateAutoTrigger("keywords", { enabled: checked })
                          }
                        />
                      </div>
                      {settings.autoTriggers.keywords.enabled && (
                        <div className="mt-3">
                          <Label className="text-xs">Keywords (comma separated)</Label>
                          <input
                            type="text"
                            value={keywordsInput}
                            onChange={(e) => setKeywordsInput(e.target.value)}
                            onBlur={() => {
                              // Parse keywords on blur and update settings
                              const keywords = keywordsInput
                                .split(",")
                                .map((k) => k.trim())
                                .filter(Boolean);
                              updateAutoTrigger("keywords", { keywords });
                              // Also normalize the display (clean up extra spaces)
                              setKeywordsInput(keywords.join(", "));
                            }}
                            placeholder="speak to human, talk to agent, human please"
                            className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      )}
                    </div>

                    {/* Customer Request */}
                    <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Customer Request Detection</Label>
                        <p className="text-xs text-muted-foreground">
                          AI detects when customer wants human help
                        </p>
                      </div>
                      <Switch
                        checked={settings.autoTriggers.customerRequest.enabled}
                        onCheckedChange={(checked) =>
                          updateAutoTrigger("customerRequest", { enabled: checked })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Manual Trigger Button */}
                {(settings.triggerMode === "manual" || settings.triggerMode === "both") && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium">Manual Trigger Button</h3>

                    <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Show &quot;Talk to Human&quot; Button</Label>
                        <p className="text-xs text-muted-foreground">
                          Display button in widget for customer to request agent
                        </p>
                        {settings.showHumanButton && (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={settings.buttonText}
                              onChange={(e) => updateSetting("buttonText", e.target.value)}
                              placeholder="Talk to a human"
                              maxLength={30}
                              className="w-full max-w-xs px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={settings.showHumanButton}
                        onCheckedChange={(checked) => updateSetting("showHumanButton", checked)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Business Hours</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Label className="text-sm font-medium">Enable Business Hours</Label>
                    <p className="text-xs text-muted-foreground">
                      Only allow handoff during specified hours
                    </p>
                  </div>
                  <Switch
                    checked={settings.businessHoursEnabled}
                    onCheckedChange={(checked) => updateSetting("businessHoursEnabled", checked)}
                  />
                </div>

                {settings.businessHoursEnabled && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Timezone */}
                    <div>
                      <Label className="text-sm font-medium">Timezone</Label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateSetting("timezone", e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Hours Grid */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Hours</Label>
                      <div className="space-y-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <div
                            key={day.key}
                            className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                          >
                            <Switch
                              checked={settings.businessHours[day.key]?.enabled ?? false}
                              onCheckedChange={(checked) =>
                                updateBusinessHours(day.key, { enabled: checked })
                              }
                            />
                            <span className="w-24 text-sm font-medium">{day.label}</span>
                            {settings.businessHours[day.key]?.enabled && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={settings.businessHours[day.key]?.start || "09:00"}
                                  onChange={(e) =>
                                    updateBusinessHours(day.key, { start: e.target.value })
                                  }
                                  className="px-2 py-1 text-sm border border-input rounded-md"
                                />
                                <span className="text-muted-foreground">to</span>
                                <input
                                  type="time"
                                  value={settings.businessHours[day.key]?.end || "17:00"}
                                  onChange={(e) =>
                                    updateBusinessHours(day.key, { end: e.target.value })
                                  }
                                  className="px-2 py-1 text-sm border border-input rounded-md"
                                />
                              </div>
                            )}
                            {!settings.businessHours[day.key]?.enabled && (
                              <span className="text-sm text-muted-foreground">Closed</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Offline Message */}
                    <div>
                      <Label className="text-sm font-medium">Offline Message</Label>
                      <p className="text-xs text-muted-foreground mb-1">
                        Shown when outside business hours
                      </p>
                      <textarea
                        value={settings.offlineMessage}
                        onChange={(e) => updateSetting("offlineMessage", e.target.value)}
                        rows={2}
                        maxLength={500}
                        className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Queue & Messages */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Queue & Messages</h2>
              </div>

              <div className="space-y-4">
                {/* Assignment Mode */}
                <div>
                  <Label className="text-sm font-medium">Assignment Mode</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    How conversations are assigned to agents
                  </p>
                  <select
                    value={settings.assignmentMode}
                    onChange={(e) =>
                      updateSetting("assignmentMode", e.target.value as "round_robin" | "least_busy" | "manual")
                    }
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="least_busy">Least Busy (Recommended)</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="manual">Manual Claim</option>
                  </select>
                </div>

                {/* Max Queue Size */}
                <div>
                  <Label className="text-sm font-medium">Max Queue Size</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Maximum waiting customers (0 = unlimited)
                  </p>
                  <input
                    type="number"
                    value={settings.maxQueueSize}
                    onChange={(e) => updateSetting("maxQueueSize", parseInt(e.target.value) || 0)}
                    min={0}
                    max={1000}
                    className="w-32 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Queue Message */}
                <div>
                  <Label className="text-sm font-medium">Queue Message</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Shown while customer waits. Use {"{position}"} for queue position.
                  </p>
                  <textarea
                    value={settings.queueMessage}
                    onChange={(e) => updateSetting("queueMessage", e.target.value)}
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                {/* Agent Joined Message */}
                <div>
                  <Label className="text-sm font-medium">Agent Joined Message</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Shown when agent connects. Use {"{agent_name}"} for agent name.
                  </p>
                  <textarea
                    value={settings.agentJoinedMessage}
                    onChange={(e) => updateSetting("agentJoinedMessage", e.target.value)}
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Link */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Team Members</h2>
                  <p className="text-sm text-muted-foreground">
                    Invite agents to handle conversations
                  </p>
                </div>
                <Link href="/team">
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Team
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
