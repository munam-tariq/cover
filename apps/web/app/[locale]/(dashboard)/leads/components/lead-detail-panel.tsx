"use client";

import { Card, CardContent, Badge } from "@chatbot/ui";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/i18n/navigation";

import {
  Lead,
  STATUS_VARIANTS,
  getLeadDisplayName,
} from "../constants";

interface LeadDetailPanelProps {
  lead: Lead;
}

export function LeadDetailPanel({ lead }: LeadDetailPanelProps) {
  const t = useTranslations("dashboard.pages.leads");
  const [questionsExpanded, setQuestionsExpanded] = useState(false);
  const displayName = getLeadDisplayName(lead);
  const statusLabel = t(`statuses.${lead.qualificationStatus}`);
  const statusVariant = STATUS_VARIANTS[lead.qualificationStatus] || "outline";

  // Extract phone and company from formData
  const formEntries = Object.values(lead.formData || {});
  const phoneField = formEntries.find((f) => f.label && /phone/i.test(f.label));
  const companyField = formEntries.find((f) => f.label && /company|organization|business/i.test(f.label));

  const totalQuestions = lead.qualifyingAnswers?.length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold">{t("detail.leadDetails")}</h2>
        <Badge variant={statusVariant} className="text-sm">
          {statusLabel}
        </Badge>
      </div>

      {/* Contact Info Card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <ContactRow icon={User} label={t("detail.name")} value={displayName} />
          <ContactRow icon={Mail} label={t("detail.email")} value={lead.email} />
          <ContactRow
            icon={Phone}
            label={t("detail.phone")}
            value={lead.phone || phoneField?.value || t("detail.notProvided")}
            muted={!lead.phone && !phoneField?.value}
          />
          <ContactRow
            icon={Building2}
            label={t("detail.company")}
            value={companyField?.value || t("detail.notProvided")}
            muted={!companyField?.value}
          />
          {/* Additional form fields */}
          {formEntries
            .filter((f) => f.value && !/name|phone|company|organization|business|email/i.test(f.label))
            .map((f, i) => (
              <ContactRow key={i} icon={User} label={f.label} value={f.value} />
            ))}
        </CardContent>
      </Card>

      {/* Qualification Scoring */}
      {totalQuestions > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t("detail.qualificationScoring")}</h3>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          {lead.qualificationReasoning && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {lead.qualificationReasoning}
            </p>
          )}

          {/* Expandable questions */}
          <button
            onClick={() => setQuestionsExpanded(!questionsExpanded)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {questionsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {t("detail.questionsEvaluated", { count: totalQuestions })}
          </button>

          {questionsExpanded && (
            <div className="space-y-3">
              {lead.qualifyingAnswers.map((qa, i) => {
                const isSkipped = qa.answer === "[skipped]" || qa.answer === "N/A";
                const lateAnswer = lead.lateQualifyingAnswers?.find(
                  (la) => la.question_text === qa.question || la.question_index === i
                );
                const displayAnswer = isSkipped && lateAnswer ? lateAnswer.answer : qa.answer;
                const isLateCapture = isSkipped && lateAnswer;

                return (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium">{qa.question}</h4>
                        {!isSkipped && !isLateCapture && (
                          <Badge
                            variant={qa.answer_reasoning?.toLowerCase().includes("not") ? "destructive" : "default"}
                            className="shrink-0 text-xs"
                          >
                            {qa.answer_reasoning?.toLowerCase().includes("not")
                              ? t("detail.notQualified")
                              : t("statuses.qualified")}
                          </Badge>
                        )}
                      </div>
                      {qa.actual_question && (
                        <p className="text-xs text-muted-foreground/70 italic mb-1">
                          {t("detail.askedAs")} &quot;{qa.actual_question}&quot;
                        </p>
                      )}
                      <div className="space-y-1.5">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t("detail.prospectResponse")}
                          </p>
                          <p className={`text-sm mt-0.5 ${isSkipped && !lateAnswer ? "text-muted-foreground italic" : ""}`}>
                            {displayAnswer}
                            {isLateCapture && (
                              <Badge variant="outline" className="ms-2 text-xs px-1.5 py-0">
                                {t("detail.lateCapture")}
                              </Badge>
                            )}
                          </p>
                        </div>
                        {qa.answer_reasoning && !isSkipped && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {t("detail.reasoning")}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {qa.answer_reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Submission Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{t("detail.submissionInfo")}</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("detail.submittedAt")}</span>
          </div>
          <p className="text-sm font-medium ms-6">
            {new Date(lead.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            {t("detail.at")}{" "}
            {new Date(lead.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {lead.captureSource && (
            <div className="flex items-center gap-2 ms-6">
              <span className="text-xs text-muted-foreground">{t("detail.source")}</span>
              <Badge variant="outline" className="text-xs">
                {t(`sources.${lead.captureSource}`)}
              </Badge>
            </div>
          )}

          {/* View Conversations Link */}
          <div className="flex items-center gap-2 text-sm ms-6 mt-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            {lead.conversationId ? (
              <Link
                href={`/inbox/${lead.conversationId}?from=leads`}
                className="text-primary hover:underline font-medium"
              >
                {t("detail.viewConversations")}
              </Link>
            ) : (
              <span className="text-muted-foreground">{t("detail.noConversation")}</span>
            )}
          </div>
        </div>
      </div>

      {/* First Message */}
      {lead.firstMessage && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("detail.firstMessage")}</h3>
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            {lead.firstMessage}
          </p>
        </div>
      )}

      {/* Send Email */}
      <a
        href={`mailto:${lead.email}`}
        className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-muted transition-colors"
      >
        <Mail className="h-4 w-4" />
        {t("detail.sendEmail")}
      </a>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: typeof User;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm ${muted ? "text-muted-foreground" : "font-medium"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
