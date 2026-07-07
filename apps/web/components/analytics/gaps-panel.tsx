"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@chatbot/ui";
import { Check, HelpCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";

interface Gap {
  question: string;
  count: number;
  lastOccurred: string;
}

interface GapsPanelProps {
  projectId: string;
  days: number;
}

export function GapsPanel({ projectId, days }: GapsPanelProps) {
  const t = useTranslations("dashboard.pages.analytics.gaps");
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Set<string>>(new Set());

  // Add-to-KB dialog state
  const [activeGap, setActiveGap] = useState<Gap | null>(null);
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ gaps: Gap[] }>(
        `/api/analytics/gaps?projectId=${projectId}&days=${days}`
      );
      setGaps(data.gaps);
    } catch (err) {
      console.error("Failed to load gaps:", err);
      setGaps([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, days]);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = (gap: Gap) => {
    setActiveGap(gap);
    setName(gap.question);
    setAnswer("");
    setSaveError(null);
  };

  const closeDialog = () => {
    setActiveGap(null);
    setSaving(false);
  };

  const submit = async () => {
    if (!activeGap || !name.trim() || !answer.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiClient(`/api/knowledge?projectId=${projectId}`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          content: `Q: ${activeGap.question}\n\nA: ${answer.trim()}`,
        }),
      });
      setAdded((prev) => new Set(prev).add(activeGap.question));
      closeDialog();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("saveError"));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("loadingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">{t("emptyTitle")}</p>
            <p className="text-sm">
              {t("emptyDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("descriptionAction")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gaps.map((gap) => {
              const isAdded = added.has(gap.question);
              return (
                <div
                  key={gap.question}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{gap.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("askedCount", { count: gap.count })}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge variant="outline" className="tabular-nums">
                      {gap.count}
                    </Badge>
                    {isAdded ? (
                      <Button variant="ghost" size="sm" disabled>
                        <Check className="me-1 h-4 w-4 text-emerald-500" />
                        {t("added")}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openDialog(gap)}>
                        <Plus className="me-1 h-4 w-4" />
                        {t("addToKb")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={activeGap !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kb-name">{t("titleLabel")}</Label>
              <Input
                id="kb-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("titlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-answer">{t("answerLabel")}</Label>
              <Textarea
                id="kb-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t("answerPlaceholder")}
                rows={5}
              />
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button onClick={submit} disabled={saving || !name.trim() || !answer.trim()}>
              {saving ? t("adding") : t("addToKnowledgeBase")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
