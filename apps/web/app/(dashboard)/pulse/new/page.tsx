"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@chatbot/ui";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  MessageSquare,
  SmilePlus,
  FileText,
  Check,
} from "lucide-react";

type CampaignType = "nps" | "poll" | "sentiment" | "feedback";
type Step = "type" | "question" | "targeting" | "styling" | "review";

const STEPS: Step[] = ["type", "question", "targeting", "styling", "review"];

const TYPE_CARDS: {
  type: CampaignType;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultQuestion: string;
}[] = [
  {
    type: "nps",
    label: "NPS Score",
    description: "0-10 scale with optional follow-up",
    icon: <BarChart3 className="h-6 w-6" />,
    defaultQuestion: "How likely are you to recommend us to a friend?",
  },
  {
    type: "poll",
    label: "Quick Poll",
    description: "Multiple choice options",
    icon: <MessageSquare className="h-6 w-6" />,
    defaultQuestion: "What feature should we build next?",
  },
  {
    type: "sentiment",
    label: "Sentiment Check",
    description: "Emoji reaction, single tap",
    icon: <SmilePlus className="h-6 w-6" />,
    defaultQuestion: "How do you feel about our product?",
  },
  {
    type: "feedback",
    label: "Open Feedback",
    description: "Free text response",
    icon: <FileText className="h-6 w-6" />,
    defaultQuestion: "What's one thing we could improve?",
  },
];

const SHAPES = [
  { value: "random", label: "Random" },
  { value: "sticky", label: "Sticky Note" },
  { value: "holo", label: "Holographic" },
  { value: "envelope", label: "Envelope" },
  { value: "notebook", label: "Notebook" },
  { value: "ticket", label: "Ticket" },
  { value: "polaroid", label: "Polaroid" },
];

const POSITIONS = [
  { value: "smart", label: "Smart (auto)" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

const SENTIMENT_EMOJIS = ["\ud83d\ude21", "\ud83d\ude1e", "\ud83d\ude10", "\ud83d\ude42", "\ud83d\ude0d"];

const SHAPE_LABELS: Record<string, string> = {
  sticky: "Sticky Note",
  holo: "Holographic",
  envelope: "Envelope",
  notebook: "Notebook",
  ticket: "Ticket",
  polaroid: "Polaroid",
};

function getShapeContainerStyle(shape: string, accentColor: string): React.CSSProperties {
  switch (shape) {
    case "sticky":
      return {
        background: "linear-gradient(145deg, #fff9c4 0%, #fff176 60%, #ffee58 100%)",
        borderRadius: 3,
        transform: "rotate(-1.5deg)",
        padding: "28px 16px 16px",
        boxShadow: "2px 3px 15px rgba(0,0,0,0.12), 1px 1px 3px rgba(0,0,0,0.08), inset 0 -2px 6px rgba(0,0,0,0.03)",
      };
    case "holo":
      return {
        background: "linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)) padding-box, conic-gradient(from 45deg, #ff6b9d, #c084fc, #60a5fa, #34d399, #fbbf24, #ff6b9d) border-box",
        border: "2.5px solid transparent",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 0 20px rgba(147,130,220,0.12)",
        overflow: "hidden" as const,
      };
    case "envelope":
      return {
        background: "linear-gradient(180deg, #fffdf7 0%, #faf6ee 100%)",
        borderRadius: 4,
        border: "1px solid #e0d5c5",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)",
        marginTop: 24,
        padding: "24px 16px 16px",
      };
    case "notebook":
      return {
        background: "repeating-linear-gradient(transparent 0px, transparent 27px, #e8e8f0 27px, #e8e8f0 28px), linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
        borderRadius: "2px 8px 8px 2px",
        border: "1px solid #e0e0e0",
        borderLeft: `4px solid ${accentColor}`,
        padding: "16px 16px 16px 32px",
        boxShadow: "3px 3px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
      };
    case "ticket":
      return {
        background: "#fff",
        borderRadius: 12,
        border: `2px solid ${accentColor}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        padding: "28px 16px 16px",
      };
    case "polaroid":
      return {
        background: "#fff",
        borderRadius: 4,
        transform: "rotate(1.5deg)",
        padding: "14px 14px 36px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08), 4px 6px 0px -1px #f5f5f0, 6px 8px 8px rgba(0,0,0,0.08)",
      };
    default:
      return {
        background: "#fff",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      };
  }
}

function ShapeDecorations({ shape, accentColor }: { shape: string; accentColor: string }) {
  switch (shape) {
    case "sticky":
      return (
        <>
          {/* Pushpin */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full z-10"
            style={{
              top: -8,
              width: 16,
              height: 16,
              background: "radial-gradient(circle at 40% 35%, #ff8a80, #e53935 60%, #b71c1c 100%)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.35), inset 0 -1px 2px rgba(0,0,0,0.2)",
            }}
          />
          {/* Folded corner */}
          <div
            className="absolute bottom-0 right-0"
            style={{
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 0 18px 18px",
              borderColor: "transparent transparent #f0e060 transparent",
            }}
          />
        </>
      );
    case "holo":
      return (
        <div
          className="absolute top-0 h-full pointer-events-none"
          style={{
            left: "30%",
            width: "40%",
            background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
          }}
        />
      );
    case "envelope":
      return (
        <>
          {/* V-shaped flap */}
          <div
            className="absolute"
            style={{
              top: -20,
              left: -1,
              right: -1,
              height: 24,
              background: accentColor,
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            }}
          />
          {/* Wax seal */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full z-10"
            style={{
              top: -4,
              width: 20,
              height: 20,
              background: accentColor,
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          />
        </>
      );
    case "notebook":
      return (
        <>
          {/* Spiral holes */}
          <div
            className="absolute"
            style={{
              left: 6,
              top: 10,
              width: 8,
              height: "calc(100% - 20px)",
              backgroundImage: "radial-gradient(circle, #aaa 2.5px, transparent 2.5px)",
              backgroundSize: "8px 18px",
              backgroundRepeat: "repeat-y",
              backgroundPosition: "center",
            }}
          />
          {/* Red margin line */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: 24, width: 1, background: "#ffb3b3" }}
          />
        </>
      );
    case "ticket":
      return (
        <>
          {/* Gradient header bar */}
          <div
            className="absolute"
            style={{
              top: -2,
              left: -2,
              right: -2,
              height: 6,
              background: `linear-gradient(90deg, ${accentColor}, #ff6b9d)`,
              borderRadius: "12px 12px 0 0",
            }}
          />
          {/* Dashed tear line */}
          <div
            className="absolute"
            style={{
              top: 12,
              left: 8,
              right: 8,
              borderTop: "1.5px dashed rgba(0,0,0,0.1)",
            }}
          />
        </>
      );
    case "polaroid":
      return (
        <>
          {/* Inner photo border */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 6,
              left: 6,
              right: 6,
              bottom: 30,
              border: "1px solid #eee",
              borderRadius: 2,
              background: "linear-gradient(180deg, rgba(0,0,0,0.01), rgba(0,0,0,0.03))",
            }}
          />
          {/* Caption line */}
          <div
            className="absolute"
            style={{ bottom: 14, left: 20, right: 20, height: 1, background: "#e0e0e0" }}
          />
        </>
      );
    default:
      return null;
  }
}

function PopupPreview({
  campaignType,
  question,
  pollOptions,
  allowOther,
  accentColor,
  shape,
  avatarUrl,
  avatarName,
}: {
  campaignType: CampaignType | null;
  question: string;
  pollOptions: string[];
  allowOther: boolean;
  accentColor: string;
  shape: string;
  avatarUrl?: string;
  avatarName?: string;
}) {
  const resolvedShape = shape === "random" ? "sticky" : shape;
  const textColor = resolvedShape === "sticky" ? "#5d4e37" : "#1a1a1a";

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
        Preview
      </p>
      <div
        className="relative w-[240px] min-h-[160px]"
        style={getShapeContainerStyle(resolvedShape, accentColor)}
      >
        <ShapeDecorations shape={resolvedShape} accentColor={accentColor} />

        {/* Close button */}
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/5 flex items-center justify-center text-gray-400 text-xs pointer-events-none z-10">
          &times;
        </div>

        {/* Avatar */}
        {avatarUrl && (
          <div className="flex items-center gap-2 mb-2 pr-5">
            <img
              src={avatarUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover border-2 border-white/80 shadow-sm flex-shrink-0"
            />
            {avatarName && (
              <span
                className="text-[10px] font-semibold"
                style={{ color: resolvedShape === "sticky" ? "#5d4e37" : "#555" }}
              >
                {avatarName}
              </span>
            )}
          </div>
        )}

        {/* Question */}
        <p
          className="text-[13px] font-semibold pr-5 mb-3 leading-snug"
          style={{ color: textColor }}
        >
          {question || "Your question here..."}
        </p>

        {/* Type-specific body */}
        {campaignType === "nps" && (
          <div>
            <div className="flex flex-wrap gap-[3px] mb-1">
              {Array.from({ length: 11 }, (_, i) => (
                <div
                  key={i}
                  className="w-[17px] h-[17px] rounded-[3px] flex items-center justify-center text-white text-[8px] font-bold"
                  style={{
                    backgroundColor:
                      i <= 6 ? "#ef4444" : i <= 8 ? "#eab308" : "#22c55e",
                    opacity: 0.75,
                  }}
                >
                  {i}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[8px] text-gray-400 mt-0.5">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </div>
        )}

        {campaignType === "poll" && (
          <div className="space-y-1.5">
            {pollOptions
              .filter((o) => o.trim())
              .map((opt, i) => (
                <div
                  key={i}
                  className="w-full px-2 py-1.5 rounded-md text-[10px] font-medium text-center border border-gray-200 text-gray-700"
                >
                  {opt}
                </div>
              ))}
            {allowOther && (
              <div className="w-full px-2 py-1.5 rounded-md text-[10px] text-center border border-gray-200 text-gray-400">
                Other
              </div>
            )}
          </div>
        )}

        {campaignType === "sentiment" && (
          <div className="flex justify-center gap-2">
            {SENTIMENT_EMOJIS.map((emoji, i) => (
              <div
                key={i}
                className="w-7 h-7 flex items-center justify-center rounded-full text-base cursor-default"
              >
                {emoji}
              </div>
            ))}
          </div>
        )}

        {campaignType === "feedback" && (
          <div>
            <div className="w-full h-12 rounded-md border border-gray-200 bg-gray-50/50 px-2 pt-1 text-[9px] text-gray-400">
              Share your thoughts...
            </div>
            <button
              className="mt-1.5 w-full py-1 rounded-md text-white text-[10px] font-medium pointer-events-none"
              style={{ backgroundColor: accentColor }}
            >
              Submit
            </button>
          </div>
        )}

        {!campaignType && (
          <div className="text-[10px] text-gray-400 text-center py-4">
            Select a campaign type
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        {SHAPE_LABELS[resolvedShape] || resolvedShape}
      </p>
    </div>
  );
}

export default function NewCampaignPage() {
  const { currentProject } = useProject();
  const router = useRouter();

  const [step, setStep] = useState<Step>("type");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [campaignType, setCampaignType] = useState<CampaignType | null>(null);
  const [question, setQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [allowOther, setAllowOther] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [pages, setPages] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [shape, setShape] = useState("random");
  const [position, setPosition] = useState("smart");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarName, setAvatarName] = useState("");
  const [publishNow, setPublishNow] = useState(true);

  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1]);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case "type":
        return !!campaignType;
      case "question":
        if (!question.trim()) return false;
        if (campaignType === "poll") {
          const validOptions = pollOptions.filter((o) => o.trim());
          return validOptions.length >= 2;
        }
        return true;
      case "targeting":
      case "styling":
        return true;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handlePublish = async () => {
    if (!currentProject?.id || !campaignType) return;

    setSaving(true);
    setError(null);

    try {
      const config: Record<string, unknown> = {};

      if (campaignType === "poll") {
        config.options = pollOptions.filter((o) => o.trim());
        config.allow_other = allowOther;
      }
      if (
        (campaignType === "nps" || campaignType === "sentiment") &&
        followUpQuestion.trim()
      ) {
        config.follow_up_question = followUpQuestion.trim();
      }

      const targeting: Record<string, unknown> = {
        delay_seconds: delaySeconds,
      };
      if (pages.trim()) {
        targeting.pages = pages
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean);
      }

      const styling: Record<string, unknown> = {
        accent_color: accentColor,
        shape,
        position,
      };
      if (avatarUrl.trim()) styling.avatar_url = avatarUrl.trim();
      if (avatarName.trim()) styling.avatar_name = avatarName.trim();

      await apiClient(
        `/api/projects/${currentProject.id}/pulse/campaigns`,
        {
          method: "POST",
          body: JSON.stringify({
            type: campaignType,
            question: question.trim(),
            config,
            targeting,
            styling,
            status: publishNow ? "active" : "draft",
          }),
        }
      );

      router.push("/pulse");
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setError("Failed to create campaign. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!currentProject) {
    return <div className="text-muted-foreground">No project selected</div>;
  }

  const showPreview = step === "styling" || step === "review";

  return (
    <div className={`mx-auto space-y-6 ${showPreview ? "max-w-4xl" : "max-w-2xl"}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (stepIndex > 0 ? goBack() : router.push("/pulse"))}
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">New Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Choose Type */}
      {step === "type" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {TYPE_CARDS.map((tc) => (
            <Card
              key={tc.type}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                campaignType === tc.type
                  ? "border-primary ring-2 ring-primary/20"
                  : ""
              }`}
              onClick={() => {
                setCampaignType(tc.type);
                if (!question) setQuestion(tc.defaultQuestion);
              }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">{tc.icon}</div>
                <div>
                  <p className="font-medium">{tc.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {tc.description}
                  </p>
                </div>
                {campaignType === tc.type && (
                  <Check className="h-5 w-5 text-primary ml-auto flex-shrink-0" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Write Question */}
      {step === "question" && (
        <Card>
          <CardHeader>
            <CardTitle>Your Question</CardTitle>
            <CardDescription>
              Keep it short and specific for better response rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask your visitors something..."
                maxLength={500}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {question.length}/500
              </p>
            </div>

            {/* Poll options */}
            {campaignType === "poll" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Options (2-5)
                </label>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[i] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() =>
                            setPollOptions(pollOptions.filter((_, j) => j !== i))
                          }
                          className="px-2 text-muted-foreground hover:text-destructive"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="text-sm text-primary hover:underline"
                    >
                      + Add option
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2 mt-3 text-sm">
                  <input
                    type="checkbox"
                    checked={allowOther}
                    onChange={(e) => setAllowOther(e.target.checked)}
                    className="rounded"
                  />
                  Allow &quot;Other&quot; with text input
                </label>
              </div>
            )}

            {/* NPS/Sentiment follow-up */}
            {(campaignType === "nps" || campaignType === "sentiment") && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Follow-up question (optional)
                </label>
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="What's the main reason for your answer?"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Targeting */}
      {step === "targeting" && (
        <Card>
          <CardHeader>
            <CardTitle>Targeting</CardTitle>
            <CardDescription>
              Control when and where the popup appears.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Page URLs (optional)
              </label>
              <textarea
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder={"One URL pattern per line, e.g.:\n/pricing\n/features\n* (all pages)"}
                rows={3}
                className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to show on all pages.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Delay after page load
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {delaySeconds}s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Styling */}
      {step === "styling" && (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <Card>
            <CardHeader>
              <CardTitle>Styling</CardTitle>
              <CardDescription>
                Customize how the popup looks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-28 px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Shape
                </label>
                <div className="flex flex-wrap gap-2">
                  {SHAPES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setShape(s.value)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        shape === s.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Position
                </label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPosition(p.value)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        position === p.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-1 block">
                  Avatar (optional)
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Add a personal touch — surveys with a face get higher response rates.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {avatarUrl && (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border-2 border-muted shadow-sm flex-shrink-0"
                      />
                    )}
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Avatar image URL"
                      className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <input
                    type="text"
                    value={avatarName}
                    onChange={(e) => setAvatarName(e.target.value)}
                    placeholder="Display name (e.g. Sarah from Product)"
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start justify-center pt-4">
            <PopupPreview
              campaignType={campaignType}
              question={question}
              pollOptions={pollOptions}
              allowOther={allowOther}
              accentColor={accentColor}
              shape={shape}
              avatarUrl={avatarUrl || undefined}
              avatarName={avatarName || undefined}
            />
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {step === "review" && (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <Card>
            <CardHeader>
              <CardTitle>Review & Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium capitalize">
                    {campaignType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Question</span>
                  <span className="text-sm font-medium max-w-[60%] text-right">
                    {question}
                  </span>
                </div>
                {campaignType === "poll" && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Options</span>
                    <span className="text-sm">
                      {pollOptions.filter((o) => o.trim()).join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Delay</span>
                  <span className="text-sm">{delaySeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Shape</span>
                  <span className="text-sm capitalize">{shape}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Position</span>
                  <span className="text-sm capitalize">
                    {position.replace("-", " ")}
                  </span>
                </div>
                {avatarName && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avatar</span>
                    <span className="text-sm">{avatarName}</span>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publishNow}
                  onChange={(e) => setPublishNow(e.target.checked)}
                  className="rounded"
                />
                Publish immediately (otherwise save as draft)
              </label>
            </CardContent>
          </Card>

          <div className="flex items-start justify-center pt-4">
            <PopupPreview
              campaignType={campaignType}
              question={question}
              pollOptions={pollOptions}
              allowOther={allowOther}
              accentColor={accentColor}
              shape={shape}
              avatarUrl={avatarUrl || undefined}
              avatarName={avatarName || undefined}
            />
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={goBack}
          disabled={stepIndex === 0}
          className="px-4 py-2 text-sm rounded-md border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Back
        </button>

        {step === "review" ? (
          <button
            onClick={handlePublish}
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving
              ? "Creating..."
              : publishNow
              ? "Publish Campaign"
              : "Save Draft"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-opacity"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
