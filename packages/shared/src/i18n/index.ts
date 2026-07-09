/**
 * Shared UI strings for the end-customer surfaces (embeddable widget + hosted
 * public chat page). Both surfaces render the same chrome, so their labels live
 * here to avoid two drifting copies.
 *
 * This is deliberately dependency-free (plain objects) so it bundles cleanly
 * into the vanilla-TS widget, the Next.js public page, and the Node API.
 *
 * NOTE: UI chrome uses clear, dialect-neutral Modern Standard Arabic (understood
 * across the Arab world); conversational dialect (e.g. Saudi) is applied to the
 * AI's generated text, not to fixed button labels. Pending native review.
 */

export type SupportedLocale = "en" | "ar";

/** Locales written right-to-left. */
export const RTL_LOCALES: readonly string[] = ["ar", "he", "fa", "ur"];

/** True when a locale (any BCP-47 tag) is written right-to-left. */
export function isRtlLocale(locale: string | null | undefined): boolean {
  const base = (locale || "").toLowerCase().split("-")[0];
  return RTL_LOCALES.includes(base);
}

/** Coerce any BCP-47 tag to a supported base locale, defaulting to English. */
export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  const base = (locale || "").toLowerCase().split("-")[0];
  return base === "ar" ? "ar" : "en";
}

export interface UIStrings {
  // Input & primary actions
  defaultPlaceholder: string;
  sendMessage: string;
  copyMessage: string;
  copied: string;
  dismissNotice: string;
  poweredBy: string;
  newChat: string;
  talkToHuman: string;
  /** The message sent on the visitor's behalf when they click "Talk to a human". */
  talkToHumanMessage: string;

  // Labels & accessibility
  online: string;
  recent: string;
  chatWindow: string;
  chatMessages: string;
  closeChat: string;
  expandChat: string;
  collapseChat: string;
  conversationStarters: string;

  // Errors
  genericError: string;
  rateLimited: string;
  connectAgentFailed: string;
  completeFormAbove: string;
  notAuthorized: string;
  accessDenied: string;
  formSubmitError: string;
  emailSubmitError: string;

  // Voice
  startVoiceCall: string;
  voiceCall: string;
  voiceInProgress: string;
  voiceEnded: string;
  voiceUnavailableDuringAgent: string;
  completeFormForVoice: string;

  // Lead-capture / summary prompts
  emailSummaryPrompt: string;
  welcomeBackSummary: string;

  // Public page chrome
  assistantFallbackName: string;
  askPlaceholder: string;
  headlineFallback: string;
  subtextFallback: string;
  toggleTheme: string;
  collapseSidebar: string;
  expandSidebar: string;
  openMenu: string;
  closeMenu: string;
  startVoiceCallQuestion: string;
  sendError: string;

  // Public page handoff
  connectingAgent: string;
  /** `{n}` is replaced with the queue position. */
  queuePosition: string;
  agentHelpingYou: string;
  /** `{name}` is replaced with the agent's name. */
  agentNamedHelping: string;
  agentTyping: string;

  // Public page lead capture
  beforeWeStart: string;
  leaveDetails: string;
  emailAddressLabel: string;
  invalidEmail: string;
  thisField: string;
  /** `{field}` is replaced with the field label. */
  fieldRequired: string;
  startChatting: string;

  // Public page recent-conversations list
  conversationsEmpty: string;
  conversationTitle: string;
  withSupport: string;

  // Widget launcher + input + feedback (mostly aria-labels)
  openChat: string;
  messageInput: string;
  helpful: string;
  notHelpful: string;
  contactChannels: string;

  // Widget inline lead-capture form
  leadIntro: string;
  leadIntroProfiling: string;
  emailFieldLabel: string;
  continueLabel: string;
  submittingLabel: string;
  enterYourEmail: string;
  /** `{field}` is replaced with the field label. */
  enterField: string;
  /** `{name}` is replaced with the visitor's name. */
  niceToMeet: string;

  // Widget exit-intent overlay
  exitTitle: string;
  exitHeadline: string;
  exitSubtext: string;
  exitEmailAria: string;
  sendLabel: string;
  noThanks: string;
  thanksInTouch: string;

  // Widget Pulse micro-survey
  quickFeedback: string;
  dismiss: string;
  thanksShort: string;
  feedbackMatters: string;
  notLikely: string;
  veryLikely: string;
  npsReason: string;
  submitLabel: string;
  otherLabel: string;
  otherPlaceholder: string;
  shareThoughts: string;
  /** `{n}` is replaced with the rating position. */
  ratingOfFive: string;

  // Voice call — mic prompt + in-call overlay (widget + public page)
  micPromptBody: string;
  startCall: string;
  cancel: string;
  voiceConnecting: string;
  voiceListening: string;
  voiceProcessing: string;
  voiceSpeaking: string;
  voiceCallEnded: string;
  voiceCallFailed: string;
  voiceCallFailedRetry: string;
  voiceTryAgain: string;
  voiceSomethingWrong: string;
  voiceSuffix: string;
  backToChat: string;
  callTranscript: string;
  youLabel: string;
  muteMic: string;
  unmuteMic: string;
  endCall: string;
  continueChatting: string;
}

const en: UIStrings = {
  defaultPlaceholder: "Type a message...",
  sendMessage: "Send message",
  copyMessage: "Copy message",
  copied: "Copied",
  dismissNotice: "Dismiss notice",
  poweredBy: "Powered by FrontFace",
  newChat: "New chat",
  talkToHuman: "Talk to a human",
  talkToHumanMessage: "I would like to speak with a human agent.",

  online: "Online",
  recent: "Recent",
  chatWindow: "Chat window",
  chatMessages: "Chat messages",
  closeChat: "Close chat",
  expandChat: "Expand chat",
  collapseChat: "Collapse chat",
  conversationStarters: "Conversation starters",

  genericError: "Sorry, something went wrong. Please try again.",
  rateLimited:
    "You've sent too many messages. Please wait a moment and try again.",
  connectAgentFailed:
    "Sorry, we couldn't connect you with an agent right now. Please try again.",
  completeFormAbove: "Please complete the form above",
  notAuthorized: "This chat widget is not authorized for this website.",
  accessDenied: "Access denied.",
  formSubmitError: "Failed to submit form",
  emailSubmitError: "Failed to submit email",

  startVoiceCall: "Start voice call",
  voiceCall: "Voice call",
  voiceInProgress: "Voice call in progress",
  voiceEnded: "Voice call ended",
  voiceUnavailableDuringAgent:
    "Voice calls unavailable during agent conversation",
  completeFormForVoice: "Complete the form above to start a voice call",

  emailSummaryPrompt: "Want me to email you a summary of this conversation?",
  welcomeBackSummary: "Welcome back! Want me to email you a summary?",

  assistantFallbackName: "Assistant",
  askPlaceholder: "Ask me anything…",
  headlineFallback: "Hi, how can I help?",
  subtextFallback: "Ask me anything — I'm here to help.",
  toggleTheme: "Toggle theme",
  collapseSidebar: "Collapse sidebar",
  expandSidebar: "Expand sidebar",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  startVoiceCallQuestion: "Start a voice call?",
  sendError: "Sorry, I ran into a problem sending that. Please try again.",

  connectingAgent: "Connecting you with a human agent…",
  queuePosition:
    "You're #{n} in the queue — a human agent will be with you shortly.",
  agentHelpingYou: "A human agent is helping you",
  agentNamedHelping: "{name} is helping you",
  agentTyping: "— typing…",

  beforeWeStart: "Before we start",
  leaveDetails: "Leave your details so we can follow up if needed.",
  emailAddressLabel: "Email address *",
  invalidEmail: "Please enter a valid email address.",
  thisField: "This field",
  fieldRequired: "{field} is required.",
  startChatting: "Start chatting",

  conversationsEmpty: "Your conversations will appear here.",
  conversationTitle: "Conversation",
  withSupport: " · with support",

  openChat: "Open chat",
  messageInput: "Message input",
  helpful: "Helpful",
  notHelpful: "Not helpful",
  contactChannels: "Contact channels",

  leadIntro: "Hey! Quick intro so I know who I'm talking to 😊",
  leadIntroProfiling: "Just a couple quick things to help me help you better!",
  emailFieldLabel: "Email",
  continueLabel: "Continue",
  submittingLabel: "Submitting...",
  enterYourEmail: "Please enter your email address.",
  enterField: "Please enter your {field}.",
  niceToMeet: "Awesome, great to meet you {name}!",

  exitTitle: "Before you go",
  exitHeadline: "Before you go...",
  exitSubtext: "Drop your email and we'll follow up",
  exitEmailAria: "Your email address",
  sendLabel: "Send",
  noThanks: "No thanks",
  thanksInTouch: "Thanks! We'll be in touch.",

  quickFeedback: "Quick feedback",
  dismiss: "Dismiss",
  thanksShort: "Thanks!",
  feedbackMatters: "Your feedback matters",
  notLikely: "Not likely",
  veryLikely: "Very likely",
  npsReason: "What's the main reason for your score?",
  submitLabel: "Submit",
  otherLabel: "Other",
  otherPlaceholder: "Other...",
  shareThoughts: "Share your thoughts...",
  ratingOfFive: "Rating {n} of 5",

  micPromptBody:
    "Your browser will ask to use your microphone so you can talk with the assistant. You can end the call anytime.",
  startCall: "Start call",
  cancel: "Cancel",
  voiceConnecting: "Connecting…",
  voiceListening: "Listening…",
  voiceProcessing: "Processing…",
  voiceSpeaking: "Speaking…",
  voiceCallEnded: "Call ended",
  voiceCallFailed: "Call failed",
  voiceCallFailedRetry: "Call failed. Please try again.",
  voiceTryAgain: "Please try again",
  voiceSomethingWrong: "Something went wrong",
  voiceSuffix: "voice",
  backToChat: "Back to chat",
  callTranscript: "Call transcript",
  youLabel: "You",
  muteMic: "Mute microphone",
  unmuteMic: "Unmute microphone",
  endCall: "End call",
  continueChatting: "Continue chatting",
};

const ar: UIStrings = {
  defaultPlaceholder: "اكتب رسالة...",
  sendMessage: "إرسال الرسالة",
  copyMessage: "نسخ الرسالة",
  copied: "تم النسخ",
  dismissNotice: "إغلاق الإشعار",
  poweredBy: "مدعوم من FrontFace",
  newChat: "محادثة جديدة",
  talkToHuman: "التحدث مع موظف",
  talkToHumanMessage: "أرغب في التحدث مع موظف خدمة العملاء.",

  online: "متصل",
  recent: "الأحدث",
  chatWindow: "نافذة المحادثة",
  chatMessages: "رسائل المحادثة",
  closeChat: "إغلاق المحادثة",
  expandChat: "توسيع المحادثة",
  collapseChat: "تصغير المحادثة",
  conversationStarters: "بدايات المحادثة",

  genericError: "عذرًا، حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  rateLimited:
    "لقد أرسلت رسائل كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.",
  connectAgentFailed:
    "عذرًا، تعذّر توصيلك بأحد الموظفين الآن. يرجى المحاولة مرة أخرى.",
  completeFormAbove: "يرجى إكمال النموذج أعلاه",
  notAuthorized: "أداة المحادثة هذه غير مصرّح لها بالعمل على هذا الموقع.",
  accessDenied: "تم رفض الوصول.",
  formSubmitError: "تعذّر إرسال النموذج",
  emailSubmitError: "تعذّر إرسال البريد الإلكتروني",

  startVoiceCall: "بدء مكالمة صوتية",
  voiceCall: "مكالمة صوتية",
  voiceInProgress: "مكالمة صوتية جارية",
  voiceEnded: "انتهت المكالمة الصوتية",
  voiceUnavailableDuringAgent: "المكالمات الصوتية غير متاحة أثناء محادثة الموظف",
  completeFormForVoice: "أكمل النموذج أعلاه لبدء مكالمة صوتية",

  emailSummaryPrompt: "هل تريد أن أرسل لك ملخص هذه المحادثة عبر البريد؟",
  welcomeBackSummary: "أهلًا بعودتك! هل تريد أن أرسل لك ملخصًا عبر البريد؟",

  assistantFallbackName: "المساعد",
  askPlaceholder: "اسألني عن أي شيء…",
  headlineFallback: "مرحبًا، كيف أقدر أساعدك؟",
  subtextFallback: "اسألني عن أي شيء — أنا هنا للمساعدة.",
  toggleTheme: "تبديل السمة",
  collapseSidebar: "طيّ الشريط الجانبي",
  expandSidebar: "توسيع الشريط الجانبي",
  openMenu: "فتح القائمة",
  closeMenu: "إغلاق القائمة",
  startVoiceCallQuestion: "بدء مكالمة صوتية؟",
  sendError: "عذرًا، واجهت مشكلة في إرسال ذلك. يرجى المحاولة مرة أخرى.",

  connectingAgent: "جارٍ توصيلك بأحد موظفي خدمة العملاء…",
  queuePosition: "ترتيبك رقم {n} في قائمة الانتظار — سيصلك أحد الموظفين قريبًا.",
  agentHelpingYou: "أحد موظفي خدمة العملاء يساعدك الآن",
  agentNamedHelping: "{name} يساعدك الآن",
  agentTyping: "— يكتب…",

  beforeWeStart: "قبل أن نبدأ",
  leaveDetails: "اترك بياناتك حتى نتواصل معك عند الحاجة.",
  emailAddressLabel: "البريد الإلكتروني *",
  invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
  thisField: "هذا الحقل",
  fieldRequired: "{field} مطلوب.",
  startChatting: "ابدأ المحادثة",

  conversationsEmpty: "ستظهر محادثاتك هنا.",
  conversationTitle: "محادثة",
  withSupport: " · مع الدعم",

  openChat: "فتح المحادثة",
  messageInput: "حقل إدخال الرسالة",
  helpful: "مفيد",
  notHelpful: "غير مفيد",
  contactChannels: "قنوات التواصل",

  leadIntro: "أهلًا! تعريف بسيط عشان أعرف مع مين أتكلم 😊",
  leadIntroProfiling: "معلومتين سريعتين عشان أقدر أخدمك أحسن!",
  emailFieldLabel: "البريد الإلكتروني",
  continueLabel: "متابعة",
  submittingLabel: "جارٍ الإرسال...",
  enterYourEmail: "من فضلك أدخل بريدك الإلكتروني.",
  enterField: "من فضلك أدخل {field}.",
  niceToMeet: "يا هلا فيك {name}! سعدنا بالتعرّف عليك.",

  exitTitle: "قبل ما تروح",
  exitHeadline: "قبل ما تروح...",
  exitSubtext: "اترك بريدك الإلكتروني ونتواصل معك",
  exitEmailAria: "بريدك الإلكتروني",
  sendLabel: "إرسال",
  noThanks: "لا، شكرًا",
  thanksInTouch: "شكرًا! بنتواصل معك قريب.",

  quickFeedback: "رأي سريع",
  dismiss: "إغلاق",
  thanksShort: "شكرًا!",
  feedbackMatters: "رأيك يهمّنا",
  notLikely: "غير مرجّح",
  veryLikely: "مرجّح جدًا",
  npsReason: "وش السبب الرئيسي لتقييمك؟",
  submitLabel: "إرسال",
  otherLabel: "أخرى",
  otherPlaceholder: "أخرى...",
  shareThoughts: "شاركنا رأيك...",
  ratingOfFive: "تقييم {n} من 5",

  micPromptBody:
    "سيطلب المتصفّح إذن استخدام الميكروفون حتى تقدر تتكلم مع المساعد. تقدر تنهي المكالمة في أي وقت.",
  startCall: "بدء المكالمة",
  cancel: "إلغاء",
  voiceConnecting: "جارٍ الاتصال…",
  voiceListening: "يستمع…",
  voiceProcessing: "جارٍ المعالجة…",
  voiceSpeaking: "يتحدث…",
  voiceCallEnded: "انتهت المكالمة",
  voiceCallFailed: "فشلت المكالمة",
  voiceCallFailedRetry: "فشلت المكالمة. حاول مرة أخرى.",
  voiceTryAgain: "حاول مرة أخرى",
  voiceSomethingWrong: "حدث خطأ ما",
  voiceSuffix: "صوت",
  backToChat: "الرجوع إلى المحادثة",
  callTranscript: "نص المكالمة",
  youLabel: "أنت",
  muteMic: "كتم الميكروفون",
  unmuteMic: "إلغاء كتم الميكروفون",
  endCall: "إنهاء المكالمة",
  continueChatting: "متابعة المحادثة",
};

const UI_STRINGS: Record<SupportedLocale, UIStrings> = { en, ar };

/** Resolved UI strings plus locale metadata. */
export interface ResolvedUIStrings extends UIStrings {
  locale: SupportedLocale;
  rtl: boolean;
}

/** Get UI strings for a locale (any BCP-47 tag; falls back to English). */
export function getUIStrings(locale: string | null | undefined): ResolvedUIStrings {
  const normalized = normalizeLocale(locale);
  return {
    ...UI_STRINGS[normalized],
    locale: normalized,
    rtl: isRtlLocale(normalized),
  };
}
