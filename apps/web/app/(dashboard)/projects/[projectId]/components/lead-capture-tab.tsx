"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useProject, type Project } from "@/contexts/project-context";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Label,
  Badge,
} from "@chatbot/ui";
import { Mail, Loader2, AlertCircle, Check } from "lucide-react";

interface LeadCaptureTabProps {
  project: Project;
}

interface ProjectUpdateResponse {
  project: {
    id: string;
    name: string;
    settings: Record<string, unknown>;
    updatedAt: string;
  };
}

export function LeadCaptureTab({ project }: LeadCaptureTabProps) {
  const { refreshProjects } = useProject();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lead capture V2 state
  const [lcV2Enabled, setLcV2Enabled] = useState(false);
  const [lcV2Field2Enabled, setLcV2Field2Enabled] = useState(false);
  const [lcV2Field2Label, setLcV2Field2Label] = useState("Phone Number");
  const [lcV2Field2Required, setLcV2Field2Required] = useState(false);
  const [lcV2Field3Enabled, setLcV2Field3Enabled] = useState(false);
  const [lcV2Field3Label, setLcV2Field3Label] = useState("Company");
  const [lcV2Field3Required, setLcV2Field3Required] = useState(false);
  const [lcV2Q1Enabled, setLcV2Q1Enabled] = useState(false);
  const [lcV2Q1Text, setLcV2Q1Text] = useState("");
  const [lcV2Q2Enabled, setLcV2Q2Enabled] = useState(false);
  const [lcV2Q2Text, setLcV2Q2Text] = useState("");
  const [lcV2Q3Enabled, setLcV2Q3Enabled] = useState(false);
  const [lcV2Q3Text, setLcV2Q3Text] = useState("");
  const [lcV2NotifEmail, setLcV2NotifEmail] = useState("");
  const [lcV2NotifsEnabled, setLcV2NotifsEnabled] = useState(true);

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      const settings = project.settings || {};

      // Load V2 lead capture settings
      const lcV2 = settings.lead_capture_v2 as Record<string, unknown> | undefined;
      if (lcV2) {
        setLcV2Enabled(lcV2.enabled === true);
        const formFields = lcV2.form_fields as Record<string, unknown> | undefined;
        if (formFields) {
          const f2 = formFields.field_2 as Record<string, unknown> | undefined;
          if (f2) {
            setLcV2Field2Enabled(f2.enabled === true);
            setLcV2Field2Label((f2.label as string) || "Phone Number");
            setLcV2Field2Required(f2.required === true);
          }
          const f3 = formFields.field_3 as Record<string, unknown> | undefined;
          if (f3) {
            setLcV2Field3Enabled(f3.enabled === true);
            setLcV2Field3Label((f3.label as string) || "Company");
            setLcV2Field3Required(f3.required === true);
          }
        }
        const qs = lcV2.qualifying_questions as Array<Record<string, unknown>> | undefined;
        if (qs) {
          if (qs[0]) {
            setLcV2Q1Enabled(qs[0].enabled === true);
            setLcV2Q1Text((qs[0].question as string) || "");
          }
          if (qs[1]) {
            setLcV2Q2Enabled(qs[1].enabled === true);
            setLcV2Q2Text((qs[1].question as string) || "");
          }
          if (qs[2]) {
            setLcV2Q3Enabled(qs[2].enabled === true);
            setLcV2Q3Text((qs[2].question as string) || "");
          }
        }
        setLcV2NotifEmail((lcV2.notification_email as string) || "");
        setLcV2NotifsEnabled(lcV2.notifications_enabled !== false);
      }
    }
  }, [project]);

  const handleSave = async () => {
    // Validate notification email if enabled
    if (lcV2Enabled && lcV2NotifsEnabled && lcV2NotifEmail.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(lcV2NotifEmail.trim())) {
        setError("Please enter a valid notification email address");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Merge with existing settings
      const existingSettings = project.settings || {};
      const updatedSettings = {
        ...existingSettings,
        // V2 settings
        lead_capture_v2: {
          enabled: lcV2Enabled,
          form_fields: {
            email: { required: true },
            field_2: {
              enabled: lcV2Field2Enabled,
              label: lcV2Field2Label.trim() || "Phone Number",
              required: lcV2Field2Required,
            },
            field_3: {
              enabled: lcV2Field3Enabled,
              label: lcV2Field3Label.trim() || "Company",
              required: lcV2Field3Required,
            },
          },
          qualifying_questions: [
            { question: lcV2Q1Text.trim(), enabled: lcV2Q1Enabled && !!lcV2Q1Text.trim() },
            { question: lcV2Q2Text.trim(), enabled: lcV2Q2Enabled && !!lcV2Q2Text.trim() },
            { question: lcV2Q3Text.trim(), enabled: lcV2Q3Enabled && !!lcV2Q3Text.trim() },
          ],
          notification_email: lcV2NotifEmail.trim() || null,
          notifications_enabled: lcV2NotifsEnabled,
        },
      };

      await apiClient<ProjectUpdateResponse>(`/api/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: project.name,
          settings: updatedSettings,
        }),
      });

      // Refresh projects to update context
      await refreshProjects();

      setSuccess("Lead capture settings saved");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving lead capture settings:", err);
      setError("Failed to save lead capture settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Lead Capture Form
          </CardTitle>
          <CardDescription>
            Show an inline form after the first message to capture visitor contact info and qualify
            leads with follow-up questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="lc-v2-toggle" className="text-base">
                Enable Lead Capture Form
              </Label>
              <p className="text-sm text-muted-foreground">
                Show a form after the first AI response to collect visitor info
              </p>
            </div>
            <Switch id="lc-v2-toggle" checked={lcV2Enabled} onCheckedChange={setLcV2Enabled} />
          </div>

          {lcV2Enabled && (
            <div className="space-y-6 border-t pt-6">
              {/* Form Fields Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Form Fields</h3>
                <div className="space-y-3">
                  {/* Email - always required */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">Always required</p>
                    </div>
                    <Badge variant="secondary">Required</Badge>
                  </div>

                  {/* Field 2 */}
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      id="lc-v2-field2-toggle"
                      checked={lcV2Field2Enabled}
                      onCheckedChange={setLcV2Field2Enabled}
                    />
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={lcV2Field2Label}
                        onChange={(e) => setLcV2Field2Label(e.target.value)}
                        placeholder="Field label"
                        maxLength={30}
                        disabled={!lcV2Field2Enabled}
                        className="w-full px-2 py-1 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={lcV2Field2Required}
                        onChange={(e) => setLcV2Field2Required(e.target.checked)}
                        disabled={!lcV2Field2Enabled}
                        className="rounded"
                      />
                      Required
                    </label>
                  </div>

                  {/* Field 3 */}
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Switch
                      id="lc-v2-field3-toggle"
                      checked={lcV2Field3Enabled}
                      onCheckedChange={setLcV2Field3Enabled}
                    />
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={lcV2Field3Label}
                        onChange={(e) => setLcV2Field3Label(e.target.value)}
                        placeholder="Field label"
                        maxLength={30}
                        disabled={!lcV2Field3Enabled}
                        className="w-full px-2 py-1 text-sm border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={lcV2Field3Required}
                        onChange={(e) => setLcV2Field3Required(e.target.checked)}
                        disabled={!lcV2Field3Enabled}
                        className="rounded"
                      />
                      Required
                    </label>
                  </div>
                </div>
              </div>

              {/* Qualifying Questions Section */}
              <div>
                <h3 className="text-sm font-semibold mb-1">Qualifying Questions</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  After the form, your AI agent will ask these questions one by one in the chat
                </p>
                <div className="space-y-3">
                  {/* Q1 */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="lc-v2-q1-toggle"
                      checked={lcV2Q1Enabled}
                      onCheckedChange={setLcV2Q1Enabled}
                    />
                    <input
                      type="text"
                      value={lcV2Q1Text}
                      onChange={(e) => setLcV2Q1Text(e.target.value)}
                      placeholder="e.g. What's your team size?"
                      maxLength={200}
                      disabled={!lcV2Q1Enabled}
                      className="flex-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>

                  {/* Q2 */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="lc-v2-q2-toggle"
                      checked={lcV2Q2Enabled}
                      onCheckedChange={setLcV2Q2Enabled}
                    />
                    <input
                      type="text"
                      value={lcV2Q2Text}
                      onChange={(e) => setLcV2Q2Text(e.target.value)}
                      placeholder="e.g. How did you hear about us?"
                      maxLength={200}
                      disabled={!lcV2Q2Enabled}
                      className="flex-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>

                  {/* Q3 */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="lc-v2-q3-toggle"
                      checked={lcV2Q3Enabled}
                      onCheckedChange={setLcV2Q3Enabled}
                    />
                    <input
                      type="text"
                      value={lcV2Q3Text}
                      onChange={(e) => setLcV2Q3Text(e.target.value)}
                      placeholder="e.g. What problem are you looking to solve?"
                      maxLength={200}
                      disabled={!lcV2Q3Enabled}
                      className="flex-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Notifications Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Notifications</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="lc-v2-notif-email" className="text-sm">
                      Notification Email
                    </Label>
                    <input
                      id="lc-v2-notif-email"
                      type="email"
                      value={lcV2NotifEmail}
                      onChange={(e) => setLcV2NotifEmail(e.target.value)}
                      placeholder="leads@yourbusiness.com"
                      className="w-full mt-1.5 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Receive notifications when new leads are captured
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="lc-v2-notifs-toggle" className="text-sm">
                        Enable Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Send email when a new lead is captured
                      </p>
                    </div>
                    <Switch
                      id="lc-v2-notifs-toggle"
                      checked={lcV2NotifsEnabled}
                      onCheckedChange={setLcV2NotifsEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saving ? "Saving..." : "Save Lead Capture Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
