"use client";

import { getUIStrings, type UIStrings } from "@chatbot/shared/i18n";
import { cn } from "@chatbot/ui";
import {
  Headphones,
  Menu,
  Mic,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Sun,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ChatMessage } from "@/components/chat/chat-message";

import { HandoffBanner } from "./handoff-banner";
import { LeadCaptureCard } from "./lead-capture-card";
import {
  API_URL,
  closePublicConversation,
  fetchMessagesResult,
  getLeadCaptureStatus,
  getRecentConversations,
  isWidgetSessionDenied,
  recordLeadCaptureVisit,
  submitLeadForm,
  type ConversationSummary,
  type LeadCaptureClientConfig,
  type LeadFormData,
  type PublicMessage,
} from "./lib/public-api";
import {
  clearPublicConversationState,
  clearStoredSessionId,
  getLeadFormCompleted,
  getStoredSessionId,
  getStoredSessionToken,
  getVisitorId,
  setLeadFormCompleted,
  storeSessionId,
  storeSessionToken,
} from "./lib/public-storage";
import { RecentConversations } from "./recent-conversations";
import { usePublicHandoff } from "./use-public-handoff";
import { useVoiceCall } from "./use-voice-call";
import { VoiceCallOverlay } from "./voice-call-overlay";

export interface PublicConfig {
  enabled?: boolean;
  businessName: string;
  logoUrl: string | null;
  pageTitle: string;
  headline: string;
  subtext: string;
  theme: "light" | "dark" | "system";
  accentColor: string;
  chipsEnabled: boolean;
  suggestionChips: string[];
  cardsEnabled: boolean;
  promptCards: { title: string; description: string }[];
  poweredBy: boolean;
  slug?: string;
  /** BCP-47 language for page UI + AI (e.g. "ar-SA"); drives strings + RTL. */
  locale?: string;
}

export interface PublicVoiceConfig {
  enabled: boolean;
  greeting?: string;
}

interface Msg {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  senderName?: string;
}

const FALLBACK_CONFIG: PublicConfig = {
  businessName: "Assistant",
  logoUrl: null,
  pageTitle: "Assistant",
  headline: "Hi, how can I help?",
  subtext: "Ask me anything — I'm here to help.",
  theme: "light",
  accentColor: "#0d9488",
  chipsEnabled: true,
  suggestionChips: [],
  cardsEnabled: true,
  promptCards: [],
  poweredBy: true,
  locale: "en",
};

function monogram(name: string): string {
  const words = (name || "?").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function mapServerMessage(m: PublicMessage): Msg | null {
  switch (m.senderType) {
    case "customer":
      return { id: m.id, role: "user", content: m.content };
    case "ai":
      return { id: m.id, role: "assistant", content: m.content };
    case "agent":
      return {
        id: m.id,
        role: "agent",
        content: m.content,
        senderName: m.senderName,
      };
    case "system":
      return { id: m.id, role: "system", content: m.content };
    default:
      return null;
  }
}

interface SidebarPanelProps {
  logo: ReactNode;
  businessName: string;
  accent: string;
  isDark: boolean;
  previewMode: boolean;
  conversations: ConversationSummary[];
  activeId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onToggleTheme: () => void;
  /** Desktop: collapse the rail. Mobile: close the drawer. */
  onDismiss: () => void;
  dismissIcon: ReactNode;
  dismissLabel: string;
  strings: UIStrings;
}

/** Shared sidebar body used by both the desktop rail and the mobile drawer. */
function SidebarPanel({
  logo,
  businessName,
  accent,
  isDark,
  previewMode,
  conversations,
  activeId,
  onNewChat,
  onSelect,
  onToggleTheme,
  onDismiss,
  dismissIcon,
  dismissLabel,
  strings,
}: SidebarPanelProps) {
  return (
    <>
      <div className="flex items-center gap-2 p-4">
        <div
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg text-xs font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {logo}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {businessName}
        </span>
        <button
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="text-muted-foreground hover:bg-muted rounded-md p-1"
        >
          {dismissIcon}
        </button>
      </div>
      <div className="px-3">
        <button
          onClick={onNewChat}
          disabled={previewMode}
          className="hover:bg-muted flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {strings.newChat}
        </button>
      </div>
      <div className="text-muted-foreground mt-4 px-4 text-xs font-medium uppercase tracking-wide">
        {strings.recent}
      </div>
      <RecentConversations
        conversations={conversations}
        activeId={activeId}
        onSelect={onSelect}
        strings={strings}
      />
      <div className="mt-auto flex items-center justify-between p-4">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {strings.online}
        </span>
        <button
          aria-label={strings.toggleTheme}
          onClick={onToggleTheme}
          className="text-muted-foreground hover:bg-muted rounded-md p-1.5"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}

interface PublicChatProps {
  projectId: string;
  initialConfig: PublicConfig | null;
  leadCapture: LeadCaptureClientConfig | null;
  voice: PublicVoiceConfig | null;
  previewMode: boolean;
}

export function PublicChat({
  projectId,
  initialConfig,
  leadCapture,
  voice,
  previewMode,
}: PublicChatProps) {
  const [config, setConfig] = useState<PublicConfig>(
    initialConfig || FALLBACK_CONFIG
  );
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | null>(
    null
  );
  const [systemDark, setSystemDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [micPromptOpen, setMicPromptOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  // Lead capture gate: "none" (disabled/completed), "after_first" (form appears after the
  // first exchange — email_after mode), "blocking" (form shown now, composer locked).
  const [leadGate, setLeadGate] = useState<"none" | "after_first" | "blocking">(
    "none"
  );
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  // localStorage is only readable after mount (this component is also server-rendered).
  const [booted, setBooted] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visitorIdRef = useRef<string>("");
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Sessions whose thread is already on screen (skip server rehydration for them).
  const hydratedSessionRef = useRef<string | null>(null);

  // Localized UI strings + text direction, driven by the project's language.
  const strings = getUIStrings(config.locale);
  const dir: "rtl" | "ltr" = strings.rtl ? "rtl" : "ltr";

  const accent = config.accentColor || "#0d9488";
  // theme: "system" follows the visitor's OS preference (resolved client-side after mount).
  const resolvedConfigTheme: "light" | "dark" =
    config.theme === "dark"
      ? "dark"
      : config.theme === "system"
        ? systemDark
          ? "dark"
          : "light"
        : "light";
  const isDark = (themeOverride ?? resolvedConfigTheme) === "dark";
  const live = booted && !previewMode;

  // ---- shared message plumbing ----------------------------------------------

  const appendServerMessages = useCallback((incoming: PublicMessage[]) => {
    const fresh = incoming
      .filter((m) => !seenIdsRef.current.has(m.id))
      .map(mapServerMessage)
      .filter((m): m is Msg => m !== null);
    if (fresh.length === 0) return;
    for (const m of fresh) seenIdsRef.current.add(m.id);
    setMessages((prev) => [...prev, ...fresh]);
  }, []);

  const adoptSession = useCallback(
    (id: string) => {
      hydratedSessionRef.current = id; // freshly created — nothing to rehydrate
      storeSessionId(projectId, id);
      setSessionId(id);
    },
    [projectId]
  );

  const handleStaleSession = useCallback(
    (conversationId?: string | null) => {
      const staleId = conversationId || sessionId;
      clearPublicConversationState(projectId, staleId);
      hydratedSessionRef.current = null;
      seenIdsRef.current = new Set();
      setMessages([]);
      setSessionId(null);
      if (staleId) {
        setConversations((prev) => prev.filter((c) => c.id !== staleId));
      }
    },
    [projectId, sessionId]
  );

  const handoff = usePublicHandoff({
    projectId,
    visitorId: visitorIdRef.current,
    sessionId,
    enabled: live,
    onServerMessages: appendServerMessages,
    onSessionEstablished: adoptSession,
    onStaleSession: handleStaleSession,
  });
  const {
    noteRehydratedThrough,
    handleChatResponse,
    notifyCustomerTyping,
    resetHandoff,
  } = handoff;

  const refreshConversations = useCallback(async () => {
    if (!live) return;
    setConversations(
      await getRecentConversations(projectId, visitorIdRef.current)
    );
  }, [live, projectId]);

  const voiceCall = useVoiceCall({
    projectId,
    visitorId: visitorIdRef.current,
    sessionId,
    enabled: live && voice?.enabled === true,
    onSessionEstablished: adoptSession,
    onCallEnded: () => {
      // The backend persisted the transcript — replace the thread with the DB canon.
      const id = sessionId;
      if (!id) return;
      void fetchMessagesResult(
        id,
        undefined,
        getStoredSessionToken(id) ?? undefined
      ).then((result) => {
        if (!result.ok) {
          if (result.staleSession) handleStaleSession(id);
          return;
        }
        const msgs = result.data;
        const mapped = msgs
          .map(mapServerMessage)
          .filter((m): m is Msg => m !== null);
        seenIdsRef.current = new Set(mapped.map((m) => m.id));
        setMessages(mapped);
        noteRehydratedThrough(
          msgs.length > 0 ? msgs[msgs.length - 1].createdAt : null
        );
      });
      void refreshConversations();
      // Qualifying answers may have been collected during the call (widget parity).
      if (leadCapture?.enabled) {
        setTimeout(() => {
          void getLeadCaptureStatus(projectId, visitorIdRef.current).then(
            (status) => {
              if (status?.hasCompletedForm) {
                setLeadFormCompleted(projectId);
                setLeadGate("none");
              }
            }
          );
        }, 5000);
      }
    },
  });

  // ---- boot: visitor id, stored session, lead status, history ----------------

  useEffect(() => {
    if (previewMode) return;
    visitorIdRef.current = getVisitorId();
    setSessionId(getStoredSessionId(projectId));
    setBooted(true);
  }, [previewMode, projectId]);

  // theme: "system" — track the OS color-scheme preference (works in preview too).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!live) return;
    void refreshConversations();
  }, [live, refreshConversations]);

  useEffect(() => {
    if (!live || !leadCapture?.enabled) return;
    if (getLeadFormCompleted(projectId)) return;
    void recordLeadCaptureVisit(projectId, visitorIdRef.current);
    void getLeadCaptureStatus(projectId, visitorIdRef.current).then(
      (status) => {
        if (status?.hasCompletedForm) {
          setLeadFormCompleted(projectId);
          return;
        }
        setLeadGate(
          leadCapture.captureMode === "email_after" ? "after_first" : "blocking"
        );
      }
    );
  }, [live, leadCapture, projectId]);

  // Rehydrate the thread from the server for stored/selected sessions.
  useEffect(() => {
    if (!live || !sessionId || hydratedSessionRef.current === sessionId) return;
    hydratedSessionRef.current = sessionId;
    void fetchMessagesResult(
      sessionId,
      undefined,
      getStoredSessionToken(sessionId) ?? undefined
    ).then((result) => {
      if (!result.ok) {
        if (result.staleSession) handleStaleSession(sessionId);
        return;
      }
      const msgs = result.data;
      const mapped = msgs
        .map(mapServerMessage)
        .filter((m): m is Msg => m !== null);
      seenIdsRef.current = new Set(mapped.map((m) => m.id));
      setMessages(mapped);
      noteRehydratedThrough(
        msgs.length > 0 ? msgs[msgs.length - 1].createdAt : null
      );
    });
  }, [handleStaleSession, live, sessionId, noteRehydratedThrough]);

  // Preview mode: receive draft config from the dashboard editor over postMessage.
  useEffect(() => {
    if (!previewMode) return;
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "public-page-preview-config" && e.data.config) {
        setConfig({ ...FALLBACK_CONFIG, ...e.data.config });
      }
    }
    window.addEventListener("message", onMessage);
    // Tell the parent we're ready to receive the draft.
    window.parent?.postMessage(
      { type: "public-page-preview-ready" },
      window.location.origin
    );
    return () => window.removeEventListener("message", onMessage);
  }, [previewMode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- chat ------------------------------------------------------------------

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isSending || previewMode || leadGate === "blocking")
        return;

      const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", content };
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsSending(true);

      try {
        const hdrs: Record<string, string> = { "Content-Type": "application/json" };
        if (sessionId) {
          const st = getStoredSessionToken(sessionId);
          if (st) hdrs["X-FrontFace-Session"] = st;
        }
        const res = await fetch(`${API_URL}/api/chat/message`, {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({
            projectId,
            message: content,
            sessionId,
            conversationHistory: history,
            visitorId: visitorIdRef.current || getVisitorId(),
            source: "public",
            context: {
              pageUrl:
                typeof window !== "undefined"
                  ? window.location.href
                  : undefined,
              pageTitle: config.pageTitle,
            },
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          if (sessionId && isWidgetSessionDenied(res.status, errBody)) {
            handleStaleSession(sessionId);
            return;
          }
          throw new Error(`Request failed: ${res.status}`);
        }
        const data = await res.json();
        if (data.sessionId) {
          // Persist the session even when it equals the current id (the "New chat" case below
          // pre-generates the id, so the server echoes it back unchanged) — otherwise a reload
          // wouldn't restore the thread.
          storeSessionId(projectId, data.sessionId);
          if (data.sessionToken)
            storeSessionToken(data.sessionId, data.sessionToken);
          if (data.sessionId !== sessionId) adoptSession(data.sessionId);
        }
        if (data.response) {
          setMessages((prev) => [
            ...prev,
            {
              id: `a_${Date.now()}`,
              role: "assistant",
              content: data.response,
            },
          ]);
        }
        handleChatResponse(data);
        // email_after mode: the form follows the first exchange.
        if (leadGate === "after_first") setLeadGate("blocking");
        void refreshConversations();
      } catch (err) {
        console.error("Public chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `e_${Date.now()}`,
            role: "assistant",
            content: strings.sendError,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [
      adoptSession,
      config.pageTitle,
      handleChatResponse,
      handleStaleSession,
      isSending,
      leadGate,
      messages,
      previewMode,
      projectId,
      refreshConversations,
      sessionId,
    ]
  );

  const handleSubmit = () => sendMessage(input);

  const newChat = useCallback(() => {
    // End the current AI thread server-side so it moves into history (best-effort cleanup).
    // Handoff conversations are left untouched by the endpoint.
    const prev = sessionId;
    if (prev && !handoff.isInHandoff) {
      void closePublicConversation(projectId, visitorIdRef.current, prev).then(
        () => refreshConversations()
      );
    }
    clearStoredSessionId(projectId);
    // Pre-generate an explicit conversation id for the new thread. The next message sends this
    // id, so the server creates a brand-new conversation instead of resuming the latest
    // ai_active row — deterministically, regardless of whether/when the close above lands or
    // succeeds. The id is only persisted once the first message is sent, so a reload before
    // sending returns to the welcome screen.
    const fresh =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : null;
    hydratedSessionRef.current = fresh; // nothing to rehydrate for a brand-new id
    seenIdsRef.current = new Set();
    setMessages([]);
    setSessionId(fresh);
    resetHandoff();
  }, [
    handoff.isInHandoff,
    projectId,
    refreshConversations,
    resetHandoff,
    sessionId,
  ]);

  const selectConversation = useCallback(
    (id: string) => {
      if (id === sessionId) return;
      resetHandoff();
      hydratedSessionRef.current = null;
      seenIdsRef.current = new Set();
      setMessages([]);
      storeSessionId(projectId, id);
      setSessionId(id);
    },
    [projectId, resetHandoff, sessionId]
  );

  const submitLead = useCallback(
    async (formData: LeadFormData) => {
      setLeadSubmitting(true);
      try {
        const firstUserMessage =
          messages.find((m) => m.role === "user")?.content || "";
        const result = await submitLeadForm({
          projectId,
          visitorId: visitorIdRef.current,
          sessionId,
          formData,
          firstMessage: firstUserMessage,
        });
        if (result?.success) {
          setLeadFormCompleted(projectId);
          setLeadGate("none");
          // The server persisted the qualifying question and (in email_first mode) created the
          // conversation — adopt its id so a reload rehydrates the question from the DB and the
          // visitor's answers attach to the same thread.
          if (result.sessionId && result.sessionToken)
            storeSessionToken(result.sessionId, result.sessionToken);
          if (result.sessionId && result.sessionId !== sessionId) {
            adoptSession(result.sessionId);
          }
          if (result.assembledGreeting) {
            setMessages((prev) => [
              ...prev,
              {
                id: `g_${Date.now()}`,
                role: "assistant",
                content: result.assembledGreeting!,
              },
            ]);
          }
        }
      } finally {
        setLeadSubmitting(false);
      }
    },
    [adoptSession, messages, projectId, sessionId]
  );

  // ---- derived UI state --------------------------------------------------------

  const hasMessages = messages.length > 0;
  const leadBlocking = leadGate === "blocking";
  const composerDisabled = previewMode || leadBlocking;
  const showHumanButton =
    live &&
    !leadBlocking &&
    !handoff.isInHandoff &&
    handoff.availability?.showButton === true &&
    !voiceCall.isCallActive;
  const showVoiceButton =
    live && voice?.enabled === true && !leadBlocking && !handoff.isInHandoff;
  const showVoiceOverlay = voiceCall.callState !== "idle";

  const logo = useMemo(
    () =>
      config.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.logoUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        monogram(config.businessName)
      ),
    [config.logoUrl, config.businessName]
  );

  return (
    <div
      className={cn(isDark && "dark")}
      style={{ ["--pp-accent" as string]: accent }}
      dir={dir}
      lang={strings.locale}
    >
      <div className="bg-background text-foreground flex h-screen w-full">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "bg-muted/30 hidden shrink-0 flex-col border-r md:flex",
            sidebarOpen ? "w-64" : "w-12"
          )}
        >
          {sidebarOpen ? (
            <SidebarPanel
              logo={logo}
              businessName={config.businessName}
              accent={accent}
              isDark={isDark}
              previewMode={previewMode}
              conversations={conversations}
              activeId={sessionId}
              onNewChat={newChat}
              onSelect={selectConversation}
              onToggleTheme={() => setThemeOverride(isDark ? "light" : "dark")}
              onDismiss={() => setSidebarOpen(false)}
              dismissIcon={<PanelLeftClose className="h-4 w-4 rtl:-scale-x-100" />}
              dismissLabel={strings.collapseSidebar}
              strings={strings}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <button
                aria-label={strings.expandSidebar}
                onClick={() => setSidebarOpen(true)}
                className="text-muted-foreground hover:bg-muted rounded-md p-1.5"
              >
                <PanelLeftOpen className="h-4 w-4 rtl:-scale-x-100" />
              </button>
              <button
                aria-label={strings.newChat}
                onClick={newChat}
                disabled={previewMode}
                className="text-muted-foreground hover:bg-muted rounded-md p-1.5 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Mobile drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-30 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="bg-background absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r shadow-xl">
              <SidebarPanel
                logo={logo}
                businessName={config.businessName}
                accent={accent}
                isDark={isDark}
                previewMode={previewMode}
                conversations={conversations}
                activeId={sessionId}
                onNewChat={() => {
                  newChat();
                  setMobileSidebarOpen(false);
                }}
                onSelect={(id) => {
                  selectConversation(id);
                  setMobileSidebarOpen(false);
                }}
                onToggleTheme={() =>
                  setThemeOverride(isDark ? "light" : "dark")
                }
                onDismiss={() => setMobileSidebarOpen(false)}
                dismissIcon={<X className="h-4 w-4" />}
                dismissLabel={strings.closeMenu}
                strings={strings}
              />
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <header className="flex items-center gap-2 border-b p-3 md:hidden">
            <button
              aria-label={strings.openMenu}
              onClick={() => setMobileSidebarOpen(true)}
              className="text-muted-foreground hover:bg-muted rounded-md p-1.5"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div
              className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              {logo}
            </div>
            <span className="truncate text-sm font-semibold">
              {config.businessName}
            </span>
          </header>

          {/* Conversation / welcome */}
          <div className="flex-1 overflow-y-auto">
            {hasMessages ? (
              <div className="mx-auto max-w-3xl px-4 py-6">
                {messages.map((m) => (
                  <ChatMessage
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    senderName={m.senderName}
                    accentColor={accent}
                  />
                ))}
                {isSending && !handoff.isInHandoff && (
                  <ChatMessage
                    role="assistant"
                    content=""
                    isLoading
                    accentColor={accent}
                  />
                )}
                {leadBlocking && (
                  <LeadCaptureCard
                    config={leadCapture!}
                    accentColor={accent}
                    submitting={leadSubmitting}
                    onSubmit={submitLead}
                    strings={strings}
                  />
                )}
                <div ref={endRef} />
              </div>
            ) : (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-lg font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {logo}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {config.headline}
                </h1>
                {config.subtext && (
                  <p className="text-muted-foreground mt-2 max-w-md text-sm">
                    {config.subtext}
                  </p>
                )}

                {leadBlocking && (
                  <LeadCaptureCard
                    config={leadCapture!}
                    accentColor={accent}
                    submitting={leadSubmitting}
                    onSubmit={submitLead}
                    strings={strings}
                  />
                )}

                {config.chipsEnabled && config.suggestionChips.length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {config.suggestionChips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(chip)}
                        disabled={composerDisabled}
                        className="hover:bg-muted rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-default disabled:opacity-60"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {config.cardsEnabled && config.promptCards.length > 0 && (
                  <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                    {config.promptCards.map((card, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(card.title)}
                        disabled={composerDisabled}
                        className="hover:bg-muted rounded-xl border p-4 text-left transition disabled:cursor-default disabled:opacity-60"
                      >
                        <div className="text-sm font-medium">{card.title}</div>
                        {card.description && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            {card.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="mx-auto max-w-3xl">
              <HandoffBanner state={handoff} accentColor={accent} strings={strings} />
              {handoff.offlineMessage && (
                <div className="bg-muted/40 text-muted-foreground mx-auto mb-2 max-w-3xl rounded-lg border px-3 py-2 text-xs">
                  {handoff.offlineMessage}
                </div>
              )}
              {showHumanButton && (
                <div className="mb-2 flex justify-end">
                  <button
                    onClick={() => void handoff.requestHuman()}
                    disabled={handoff.requestingHuman}
                    className="hover:bg-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50"
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    {handoff.availability?.buttonText || strings.talkToHuman}
                  </button>
                </div>
              )}
              <div className="bg-background flex items-end gap-2 rounded-2xl border px-3 py-2 shadow-sm">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 160) + "px";
                    notifyCustomerTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    leadBlocking
                      ? strings.completeFormAbove
                      : strings.askPlaceholder
                  }
                  disabled={composerDisabled}
                  className="placeholder:text-muted-foreground max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none disabled:cursor-default"
                />
                {showVoiceButton && (
                  <button
                    onClick={() => setMicPromptOpen(true)}
                    disabled={voiceCall.isCallActive || isSending}
                    aria-label={strings.startVoiceCall}
                    className="text-muted-foreground hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-40"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={composerDisabled || isSending || !input.trim()}
                  aria-label={strings.sendMessage}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  <Send className="h-4 w-4 rtl:-scale-x-100" />
                </button>
              </div>
              {config.poweredBy && (
                <div className="text-muted-foreground pt-2 text-center text-xs">
                  {strings.poweredBy.replace("FrontFace", "").trim()}{" "}
                  <a
                    href="https://frontface.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    FrontFace
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Mic permission explainer — sets expectations before the browser's native prompt. */}
          {micPromptOpen && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-background w-full max-w-sm rounded-2xl border p-5 text-center shadow-xl">
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Mic className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-semibold">{strings.startVoiceCallQuestion}</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  {strings.micPromptBody}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setMicPromptOpen(false)}
                    className="hover:bg-muted flex-1 rounded-lg border px-3 py-2 text-sm"
                  >
                    {strings.cancel}
                  </button>
                  <button
                    onClick={() => {
                      setMicPromptOpen(false);
                      void voiceCall.startCall();
                    }}
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {strings.startCall}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showVoiceOverlay && (
            <VoiceCallOverlay
              state={voiceCall.callState}
              transcript={voiceCall.transcript}
              muted={voiceCall.muted}
              durationSeconds={voiceCall.durationSeconds}
              accentColor={accent}
              businessName={config.businessName}
              onEnd={voiceCall.endCall}
              onToggleMute={voiceCall.toggleMute}
              onDismiss={voiceCall.dismissCall}
              strings={strings}
            />
          )}
        </main>
      </div>
    </div>
  );
}
