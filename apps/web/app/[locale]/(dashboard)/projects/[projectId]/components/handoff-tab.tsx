"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Switch,
  Label,
} from "@chatbot/ui";
import { AlertCircle, Check, Loader2, Users, Clock, MessageSquare, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback, useMemo } from "react";

import { type Project } from "@/contexts/project-context";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";


// Types
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
  businessHours: Record<string, { start: string; end: string; enabled: boolean }>;
  offlineMessage: string;
  queueMessage: string;
  agentJoinedMessage: string;
  maxQueueSize: number;
  assignmentMode: "round_robin" | "least_busy" | "manual";
}

interface HandoffSettingsResponse {
  settings: HandoffSettings;
}

interface HandoffTabProps {
  project: Project;
}

// Constants
const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
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
  offlineMessage:
    "Our team is currently offline. Please leave your email and we'll get back to you soon.",
  queueMessage: "Please wait while we connect you with an agent. You are number {position} in the queue.",
  agentJoinedMessage: "You're now connected with {agent_name}.",
  maxQueueSize: 50,
  assignmentMode: "least_busy",
};

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

export function HandoffTab({ project }: HandoffTabProps) {
  const t = useTranslations("dashboard.pages.projectDetail.handoff");
  const localizedDefaults = useMemo<HandoffSettings>(
    () => ({
      ...DEFAULT_SETTINGS,
      buttonText: t("defaults.buttonText"),
      offlineMessage: t("defaults.offlineMessage"),
      queueMessage: t("defaults.queueMessage"),
      agentJoinedMessage: t("defaults.agentJoinedMessage"),
    }),
    [t]
  );
  const [settings, setSettings] = useState<HandoffSettings>(localizedDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [keywordsInput, setKeywordsInput] = useState("");

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!project) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<HandoffSettingsResponse>(
        `/api/projects/${project.id}/handoff-settings`
      );
      const loadedSettings = response.settings || localizedDefaults;
      setSettings(loadedSettings);
      setKeywordsInput(loadedSettings.autoTriggers.keywords.keywords.join(", "));
    } catch (err) {
      console.error("Failed to fetch handoff settings:", err);
      setSettings(localizedDefaults);
      setKeywordsInput(localizedDefaults.autoTriggers.keywords.keywords.join(", "));
    } finally {
      setLoading(false);
    }
  }, [project, localizedDefaults]);

  useEffect(() => {
    if (project) {
      fetchSettings();
    }
  }, [project, fetchSettings]);

  // Save settings
  const handleSave = async () => {
    if (!project) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient(`/api/projects/${project.id}/handoff-settings`, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSuccess(t("saved"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save handoff settings:", err);
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  // Update nested settings
  const updateSetting = <K extends keyof HandoffSettings>(key: K, value: HandoffSettings[K]) => {
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

  if (loading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="handoff-toggle" className="text-base">
                {t("enableTitle")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("enableDescription")}
              </p>
            </div>
            <Switch
              id="handoff-toggle"
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {t("triggerConfiguration")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trigger Mode */}
              <div>
                <Label className="text-sm font-medium">{t("triggerMode")}</Label>
                <p className="text-xs text-muted-foreground mb-2">{t("triggerModeHelp")}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { value: "auto", label: t("triggerModes.auto"), desc: t("triggerModes.autoDescription") },
                    { value: "manual", label: t("triggerModes.manual"), desc: t("triggerModes.manualDescription") },
                    { value: "both", label: t("triggerModes.both"), desc: t("triggerModes.bothDescription") },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() =>
                        updateSetting("triggerMode", mode.value as "auto" | "manual" | "both")
                      }
                      className={`p-3 rounded-lg border text-start transition-colors ${
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
                  <h3 className="text-sm font-medium">{t("autoTriggerConditions")}</h3>

                  {/* Low Confidence */}
                  <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{t("lowConfidence")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("lowConfidenceHelp")}
                      </p>
                      {settings.autoTriggers.lowConfidence.enabled && (
                        <div className="mt-2 flex items-center gap-2">
                          <Label className="text-xs">{t("threshold")}</Label>
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
                        <Label className="text-sm font-medium">{t("keywordDetection")}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t("keywordDetectionHelp")}
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
                        <Label className="text-xs">{t("keywords")}</Label>
                        <input
                          type="text"
                          value={keywordsInput}
                          onChange={(e) => setKeywordsInput(e.target.value)}
                          onBlur={() => {
                            const keywords = keywordsInput
                              .split(",")
                              .map((k) => k.trim())
                              .filter(Boolean);
                            updateAutoTrigger("keywords", { keywords });
                            setKeywordsInput(keywords.join(", "));
                          }}
                          placeholder={t("keywordsPlaceholder")}
                          className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    )}
                  </div>

                  {/* Customer Request */}
                  <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{t("customerRequestDetection")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("customerRequestDetectionHelp")}
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
                  <h3 className="text-sm font-medium">{t("manualTriggerButton")}</h3>

                  <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{t("showHumanButton")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("showHumanButtonHelp")}
                      </p>
                      {settings.showHumanButton && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={settings.buttonText}
                            onChange={(e) => updateSetting("buttonText", e.target.value)}
                            placeholder={t("buttonTextPlaceholder")}
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
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("businessHours")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Label className="text-sm font-medium">{t("enableBusinessHours")}</Label>
                  <p className="text-xs text-muted-foreground">{t("enableBusinessHoursHelp")}</p>
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
                    <Label className="text-sm font-medium">{t("timezone")}</Label>
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
                    <Label className="text-sm font-medium">{t("hours")}</Label>
                    <div className="space-y-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div
                          key={day}
                          className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg sm:flex-row sm:items-center sm:gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={settings.businessHours[day]?.enabled ?? false}
                              onCheckedChange={(checked) =>
                                updateBusinessHours(day, { enabled: checked })
                              }
                            />
                            <span className="w-24 text-sm font-medium">{t(`days.${day}`)}</span>
                          </div>
                          {settings.businessHours[day]?.enabled ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="time"
                                value={settings.businessHours[day]?.start || "09:00"}
                                onChange={(e) =>
                                  updateBusinessHours(day, { start: e.target.value })
                                }
                                className="px-2 py-1 text-sm border border-input rounded-md"
                              />
                              <span className="text-muted-foreground">{t("to")}</span>
                              <input
                                type="time"
                                value={settings.businessHours[day]?.end || "17:00"}
                                onChange={(e) =>
                                  updateBusinessHours(day, { end: e.target.value })
                                }
                                className="px-2 py-1 text-sm border border-input rounded-md"
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t("closed")}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Offline Message */}
                  <div>
                    <Label className="text-sm font-medium">{t("offlineMessage")}</Label>
                    <p className="text-xs text-muted-foreground mb-1">{t("offlineMessageHelp")}</p>
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
            </CardContent>
          </Card>

          {/* Queue & Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t("queueAndMessages")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assignment Mode */}
              <div>
                <Label className="text-sm font-medium">{t("assignmentMode")}</Label>
                <p className="text-xs text-muted-foreground mb-2">{t("assignmentModeHelp")}</p>
                <select
                  value={settings.assignmentMode}
                  onChange={(e) =>
                    updateSetting(
                      "assignmentMode",
                      e.target.value as "round_robin" | "least_busy" | "manual"
                    )
                  }
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="least_busy">{t("assignmentModes.leastBusy")}</option>
                  <option value="round_robin">{t("assignmentModes.roundRobin")}</option>
                  <option value="manual">{t("assignmentModes.manual")}</option>
                </select>
              </div>

              {/* Max Queue Size */}
              <div>
                <Label className="text-sm font-medium">{t("maxQueueSize")}</Label>
                <p className="text-xs text-muted-foreground mb-1">{t("maxQueueSizeHelp")}</p>
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
                <Label className="text-sm font-medium">{t("queueMessage")}</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("queueMessageHelp")}
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
                <Label className="text-sm font-medium">{t("agentJoinedMessage")}</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("agentJoinedMessageHelp")}
                </p>
                <textarea
                  value={settings.agentJoinedMessage}
                  onChange={(e) => updateSetting("agentJoinedMessage", e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Team Link */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{t("teamMembers")}</h2>
                  <p className="text-sm text-muted-foreground">{t("teamMembersHelp")}</p>
                </div>
                <Link href="/team">
                  <Button variant="outline">
                    <Users className="h-4 w-4 me-2" />
                    {t("manageTeam")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
