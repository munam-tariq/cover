"use client";

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
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

import { useProject, type Project } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";

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

interface QualifyingQuestion {
  question: string;
  enabled: boolean;
  mandatory: boolean;
  qualified_response: string;
  alternate_question_1: string;   // saved to DB as followup_questions
  alternate_question_2: string;   // saved to DB as probe_question
}

export function LeadCaptureTab({ project }: LeadCaptureTabProps) {
  const t = useTranslations("dashboard.pages.projectDetail.leadCapture");
  const { refreshProjects } = useProject();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lead capture V2 state
  const [lcV2Enabled, setLcV2Enabled] = useState(false);
  const [lcV2Field2Enabled, setLcV2Field2Enabled] = useState(false);
  const [lcV2Field2Label, setLcV2Field2Label] = useState(t("phoneNumber"));
  const [lcV2Field2Required, setLcV2Field2Required] = useState(false);
  const [lcV2Field3Enabled, setLcV2Field3Enabled] = useState(false);
  const [lcV2Field3Label, setLcV2Field3Label] = useState(t("company"));
  const [lcV2Field3Required, setLcV2Field3Required] = useState(false);
  const [qualifyingQuestions, setQualifyingQuestions] = useState<QualifyingQuestion[]>([]);
  const [expandedQIndex, setExpandedQIndex] = useState<number | null>(null);
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
            setLcV2Field2Label((f2.label as string) || t("phoneNumber"));
            setLcV2Field2Required(f2.required === true);
          }
          const f3 = formFields.field_3 as Record<string, unknown> | undefined;
          if (f3) {
            setLcV2Field3Enabled(f3.enabled === true);
            setLcV2Field3Label((f3.label as string) || t("company"));
            setLcV2Field3Required(f3.required === true);
          }
        }
        const qs = lcV2.qualifying_questions as Array<Record<string, unknown>> | undefined;
        setQualifyingQuestions(
          qs && qs.length > 0
            ? qs.map(q => ({
                question: (q.question as string) || "",
                enabled: q.enabled === true,
                mandatory: q.mandatory === true,
                qualified_response: (q.qualified_response as string) || "",
                alternate_question_1: (q.followup_questions as string) || "",  // read from DB key
                alternate_question_2: (q.probe_question as string) || "",      // read from DB key
              }))
            : []
        );
        setLcV2NotifEmail((lcV2.notification_email as string) || "");
        setLcV2NotifsEnabled(lcV2.notifications_enabled !== false);
      }
    }
  }, [project, t]);

  const updateQuestion = (index: number, field: keyof QualifyingQuestion, value: string | boolean) => {
    setQualifyingQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const addQuestion = () => {
    setQualifyingQuestions(prev => [
      ...prev,
      { question: "", enabled: true, mandatory: false, qualified_response: "", alternate_question_1: "", alternate_question_2: "" },
    ]);
    setExpandedQIndex(qualifyingQuestions.length);
  };

  const removeQuestion = (index: number) => {
    setQualifyingQuestions(prev => prev.filter((_, i) => i !== index));
    setExpandedQIndex(null);
  };

  const handleSave = async () => {
    // Validate notification email if enabled
    if (lcV2Enabled && lcV2NotifsEnabled && lcV2NotifEmail.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(lcV2NotifEmail.trim())) {
        setError(t("invalidEmail"));
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
              label: lcV2Field2Label.trim() || t("phoneNumber"),
              required: lcV2Field2Required,
            },
            field_3: {
              enabled: lcV2Field3Enabled,
              label: lcV2Field3Label.trim() || t("company"),
              required: lcV2Field3Required,
            },
          },
          qualifying_questions: qualifyingQuestions
            .filter(q => q.question.trim())
            .map(q => ({
              question: q.question.trim(),
              enabled: q.enabled,
              mandatory: q.mandatory,
              ...(q.qualified_response.trim() ? { qualified_response: q.qualified_response.trim() } : {}),
              ...(q.alternate_question_1.trim() ? { followup_questions: q.alternate_question_1.trim() } : {}),  // save to DB key
              ...(q.alternate_question_2.trim() ? { probe_question: q.alternate_question_2.trim() } : {}),      // save to DB key
            })),
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

      setSuccess(t("saved"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving lead capture settings:", err);
      setError(t("saveError"));
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
            {t("title")}
          </CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="lc-v2-toggle" className="text-base">
                {t("enableTitle")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("enableDescription")}
              </p>
            </div>
            <Switch id="lc-v2-toggle" checked={lcV2Enabled} onCheckedChange={setLcV2Enabled} />
          </div>

          {lcV2Enabled && (
            <div className="space-y-6 border-t pt-6">
              {/* Form Fields Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("formFields")}</h3>
                <div className="space-y-3">
                  {/* Email - always required */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t("email")}</p>
                      <p className="text-xs text-muted-foreground">{t("alwaysRequired")}</p>
                    </div>
                    <Badge variant="secondary">{t("required")}</Badge>
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
                        placeholder={t("fieldLabelPlaceholder")}
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
                      {t("required")}
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
                        placeholder={t("fieldLabelPlaceholder")}
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
                      {t("required")}
                    </label>
                  </div>
                </div>
              </div>

              {/* Qualifying Questions Section */}
              <div>
                <h3 className="text-sm font-semibold mb-1">{t("qualifyingQuestions")}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("qualifyingDescription")}
                </p>
                <div className="space-y-2">
                  {qualifyingQuestions.map((q, i) => (
                    <div key={i} className="border rounded-lg overflow-hidden">
                      {/* Card Header - always visible */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30"
                        onClick={() => setExpandedQIndex(expandedQIndex === i ? null : i)}
                      >
                        <span className="text-muted-foreground text-xs w-4 shrink-0">
                          {expandedQIndex === i ? "▼" : "►"}
                        </span>
                        <Switch
                          checked={q.enabled}
                          onCheckedChange={(v) => updateQuestion(i, "enabled", v)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="flex-1 text-sm truncate text-muted-foreground">
                          {q.question || t("questionFallback", { number: i + 1 })}
                        </span>
                        {q.mandatory && (
                          <Badge variant="secondary" className="text-xs shrink-0">{t("mandatory")}</Badge>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeQuestion(i); }}
                          className="text-muted-foreground hover:text-destructive shrink-0 text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Expanded Card Body */}
                      {expandedQIndex === i && (
                        <div className="px-4 pb-4 space-y-4 border-t pt-4">
                          {/* Question text */}
                          <div>
                            <Label className="text-xs">{t("question")}</Label>
                            <textarea
                              value={q.question}
                              onChange={(e) => updateQuestion(i, "question", e.target.value)}
                              placeholder={t("questionPlaceholder")}
                              maxLength={300}
                              rows={2}
                              className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                          </div>

                          {/* Mandatory toggle */}
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={q.mandatory}
                              onCheckedChange={(v) => updateQuestion(i, "mandatory", v)}
                            />
                            <div>
                              <Label className="text-xs">{t("mandatory")}</Label>
                              <p className="text-xs text-muted-foreground">
                                {t("mandatoryDescription")}
                              </p>
                            </div>
                          </div>

                          {/* Qualified Response (criteria) */}
                          <div>
                            <Label className="text-xs">{t("qualifiedResponse")}</Label>
                            <textarea
                              value={q.qualified_response}
                              onChange={(e) => updateQuestion(i, "qualified_response", e.target.value)}
                              placeholder={t("qualifiedResponsePlaceholder")}
                              maxLength={400}
                              rows={2}
                              className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("qualifiedResponseHelp")}
                            </p>
                          </div>

                          {/* Alternate Question 1 */}
                          <div>
                            <Label className="text-xs">{t("alternateQuestion1")}</Label>
                            <textarea
                              value={q.alternate_question_1}
                              onChange={(e) => updateQuestion(i, "alternate_question_1", e.target.value)}
                              placeholder={t("alternateQuestion1Placeholder")}
                              maxLength={400}
                              rows={2}
                              className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("alternateQuestion1Help")}
                            </p>
                          </div>

                          {/* Alternate Question 2 */}
                          <div>
                            <Label className="text-xs">{t("alternateQuestion2")}</Label>
                            <textarea
                              value={q.alternate_question_2}
                              onChange={(e) => updateQuestion(i, "alternate_question_2", e.target.value)}
                              placeholder={t("alternateQuestion2Placeholder")}
                              maxLength={400}
                              rows={2}
                              className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("alternateQuestion2Help")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  {t("addQuestion")}
                </button>
              </div>

              {/* Notifications Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("notifications")}</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="lc-v2-notif-email" className="text-sm">
                      {t("notificationEmail")}
                    </Label>
                    <input
                      id="lc-v2-notif-email"
                      type="email"
                      value={lcV2NotifEmail}
                      onChange={(e) => setLcV2NotifEmail(e.target.value)}
                      placeholder={t("notificationEmailPlaceholder")}
                      className="w-full mt-1.5 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("notificationEmailHelp")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="lc-v2-notifs-toggle" className="text-sm">
                        {t("enableNotifications")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("enableNotificationsHelp")}
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
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
