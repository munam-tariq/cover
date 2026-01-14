"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Check,
  Loader2,
  MessageCircle,
  Terminal,
  ArrowRight,
  Code2,
  Zap,
} from "lucide-react";

// Typing animation hook
function useTypewriter(text: string, speed: number = 30, startDelay: number = 0, shouldStart: boolean = false) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!shouldStart) {
      setDisplayedText("");
      setIsComplete(false);
      return;
    }

    const startTimeout = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, startDelay, shouldStart]);

  return { displayedText, isComplete };
}

// Chat message component
function ChatMessage({
  role,
  children,
  delay,
  isVisible,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  delay: number;
  isVisible: boolean;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay * 0.001, duration: 0.3 }}
          className="mb-3"
        >
          <div className={`flex items-start gap-3 ${role === "user" ? "" : ""}`}>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                role === "user"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-purple-500/20 text-purple-400"
              }`}
            >
              {role === "user" ? "You" : "Claude"}
            </span>
          </div>
          <div className="mt-1 text-slate-300 text-sm leading-relaxed pl-1">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Progress step component
function ProgressStep({
  text,
  status,
  delay,
}: {
  text: string;
  status: "pending" | "loading" | "done";
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.001, duration: 0.2 }}
      className="flex items-center gap-2 text-sm"
    >
      {status === "loading" && (
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      )}
      {status === "done" && <Check className="w-4 h-4 text-green-400" />}
      {status === "pending" && (
        <div className="w-4 h-4 rounded-full border border-slate-600" />
      )}
      <span
        className={
          status === "done"
            ? "text-green-400"
            : status === "loading"
              ? "text-blue-400"
              : "text-slate-500"
        }
      >
        {text}
      </span>
    </motion.div>
  );
}

// Code block component
function CodeBlock({ code, isVisible }: { code: string; isVisible: boolean }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-3 max-w-full overflow-hidden"
        >
          <div className="bg-slate-950 rounded-lg border border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-700">
              <Code2 className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400 font-medium">
                embed code
              </span>
            </div>
            <pre className="p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap break-all overflow-hidden">
              <code>{code}</code>
            </pre>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Full chat widget inside browser mockup
function LiveChatWidget({
  chatStep,
}: {
  chatStep: number;
}) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const chatMessages = [
    { role: "bot", text: "Hi! I'm your AI assistant. How can I help you today?" },
    { role: "user", text: "What pricing plans do you offer?" },
    { role: "bot", text: "We have three plans:\n\n• Starter - $29/mo\n• Pro - $79/mo\n• Enterprise - Custom\n\nAll include a 14-day free trial!" },
    { role: "user", text: "Can I integrate with Slack?" },
    { role: "bot", text: "Yes! Native Slack integration included. Get notifications, respond from Slack, and set up alerts." },
    { role: "user", text: "Do you support custom AI models?" },
    { role: "bot", text: "I don't have information about custom AI models in my knowledge base.\n\nI'd love to connect you with our team who can help! Could you share your email?" },
    { role: "user", text: "Sure, it's hello@example.com" },
    { role: "bot", text: "Thanks! I've captured your email. Our team will reach out shortly to discuss custom AI model support. Is there anything else I can help with?" },
  ];

  // Auto-scroll chat container only (not the page)
  useEffect(() => {
    if (chatStep > 0 && chatContainerRef.current) {
      // Small delay to let message render first
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 150);
    }
  }, [chatStep]);

  return (
    <motion.div
      key="chat-widget"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-full"
    >
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-2xl blur-xl" />

      {/* Browser window mockup */}
      <div className="relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xl h-full flex flex-col">
        {/* Browser chrome */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-500 font-mono truncate">
            your-app.com/dashboard
          </div>
        </div>

        {/* Web page content */}
        <div className="flex-1 bg-slate-50 relative overflow-hidden">
          {/* Mock web page background */}
          <div className="absolute inset-0 p-4">
            <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="h-16 bg-slate-100 rounded-lg" />
              <div className="h-16 bg-slate-100 rounded-lg" />
              <div className="h-16 bg-slate-100 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-4/5" />
              <div className="h-3 bg-slate-100 rounded w-3/5" />
            </div>
          </div>

          {/* Chat widget floating - larger size */}
          <div className="absolute bottom-3 right-3 left-12 top-20 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">Your App Support</p>
                <p className="text-white/70 text-xs">Powered by SupportBase</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/70 text-xs">Online</span>
              </div>
            </div>

            {/* Chat messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 p-3 bg-slate-50 space-y-3 overflow-y-auto min-h-0"
            >
              {chatMessages.map((msg, i) => (
                <AnimatePresence key={i}>
                  {chatStep > i && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm"
                            : "bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-sm"
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.text}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-400">
                  Type your message...
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function VibeCodeShowcase() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-50px" });

  // Animation state
  const [step, setStep] = useState(0);
  const [progressSteps, setProgressSteps] = useState<
    { text: string; status: "pending" | "loading" | "done" }[]
  >([
    { text: 'Creating project "Your App Support"...', status: "pending" },
    { text: "Scraping docs.your-app.com (24 pages found)", status: "pending" },
    { text: "Building knowledge base...", status: "pending" },
    { text: "Generating embed code...", status: "pending" },
  ]);
  const [showCode, setShowCode] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [chatStep, setChatStep] = useState(0);

  const embedCode = `<script src="supportbase.app/widget.js" data-project-id="abc123"></script>`;

  // Animation timeline
  useEffect(() => {
    if (!isInView) return;

    const timeline = [
      // Step 1: User asks for chatbot
      { time: 500, action: () => setStep(1) },
      // Step 2: Claude responds
      { time: 2500, action: () => setStep(2) },
      // Step 3: User provides URL
      { time: 4500, action: () => setStep(3) },
      // Step 4: Claude starts working
      { time: 6000, action: () => setStep(4) },
      // Progress step 1: Creating project
      {
        time: 6200,
        action: () =>
          setProgressSteps((prev) =>
            prev.map((s, i) => (i === 0 ? { ...s, status: "loading" } : s))
          ),
      },
      {
        time: 7000,
        action: () =>
          setProgressSteps((prev) =>
            prev.map((s, i) => (i === 0 ? { ...s, status: "done" } : s))
          ),
      },
      // Progress step 2: Scraping
      {
        time: 7100,
        action: () =>
          setProgressSteps((prev) =>
            prev.map((s, i) => (i === 1 ? { ...s, status: "loading" } : s))
          ),
      },
      {
        time: 8500,
        action: () =>
          setProgressSteps((prev) =>
            prev.map((s, i) => (i === 1 ? { ...s, status: "done" } : s))
          ),
      },
      // Progress step 3: Building KB
      {
        time: 8600,
        action: () =>
          setProgressSteps((prev) =>
            prev.map((s, i) => (i === 2 ? { ...s, status: "loading" } : s))
          ),
      },
      {
        time: 9800,
        action: () =>
          setProgressSteps((prev) =>
            prev.map((s, i) => (i === 2 ? { ...s, status: "done" } : s))
          ),
      },
      // Progress step 4: Generating embed
      {
        time: 9900,
        action: () =>
          setProgressSteps((prev) =>
            prev.map((s, i) => (i === 3 ? { ...s, status: "loading" } : s))
          ),
      },
      {
        time: 10800,
        action: () =>
          setProgressSteps((prev) =>
            prev.map((s, i) => (i === 3 ? { ...s, status: "done" } : s))
          ),
      },
      // Show code
      { time: 11000, action: () => setShowCode(true) },
      // Show success message
      { time: 11500, action: () => setShowSuccess(true) },
      // Show widget
      { time: 12000, action: () => setShowWidget(true) },
      // Chat animation - show messages progressively
      { time: 12500, action: () => setChatStep(1) },  // Bot: greeting
      { time: 13500, action: () => setChatStep(2) },  // User: pricing question
      { time: 14500, action: () => setChatStep(3) },  // Bot: pricing answer
      { time: 16000, action: () => setChatStep(4) },  // User: Slack question
      { time: 17000, action: () => setChatStep(5) },  // Bot: Slack answer
      // Lead capture flow
      { time: 18500, action: () => setChatStep(6) },  // User: custom AI models question
      { time: 20000, action: () => setChatStep(7) },  // Bot: doesn't know, asks for email
      { time: 22000, action: () => setChatStep(8) },  // User: provides email
      { time: 23500, action: () => setChatStep(9) },  // Bot: confirms email captured
    ];

    const timeouts = timeline.map(({ time, action }) =>
      setTimeout(action, time)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [isInView]);

  return (
    <div
      ref={sectionRef}
      id="demo"
      className="py-16 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Main Demo */}
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* IDE Window */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col"
          >
            {/* Left Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Your IDE — Just Ask Claude
              </h3>
            </div>

            <div className="relative flex-1 flex flex-col min-h-[600px]">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />

              {/* Terminal window */}
              <div className="relative bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Terminal className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400 font-medium">
                      Claude Code
                    </span>
                  </div>
                </div>

                {/* Chat content */}
                <div className="p-4 font-mono text-sm flex-1">
                  {/* Message 1: User asks for chatbot */}
                  <ChatMessage role="user" delay={0} isVisible={step >= 1}>
                    I need a customer support chatbot for my app. Can you set that up?
                  </ChatMessage>

                  {/* Message 2: Claude responds */}
                  <ChatMessage role="assistant" delay={0} isVisible={step >= 2}>
                    I&apos;ll set up a SupportBase chatbot for you. Give me a URL to scrape, or upload docs.
                  </ChatMessage>

                  {/* Message 3: User provides URL */}
                  <ChatMessage role="user" delay={0} isVisible={step >= 3}>
                    Scrape our documentation site at docs.your-app.com
                  </ChatMessage>

                  {/* Message 4: Claude working */}
                  <ChatMessage role="assistant" delay={0} isVisible={step >= 4}>
                    <div className="mb-3 text-slate-300">On it! Setting up your chatbot...</div>
                    <div className="space-y-2">
                      {progressSteps.map((s, i) => (
                        s.status !== "pending" && (
                          <ProgressStep
                            key={i}
                            text={s.text}
                            status={s.status}
                            delay={0}
                          />
                        )
                      ))}
                    </div>

                    {/* Embed code */}
                    <CodeBlock code={embedCode} isVisible={showCode} />

                    {/* Success message */}
                    <AnimatePresence>
                      {showSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 flex items-center gap-2 text-green-400"
                        >
                          <Zap className="w-4 h-4" />
                          <span>
                            Done! Paste this in your app and you&apos;re live.
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </ChatMessage>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Result Preview - Live Chat */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col"
          >
            {/* Right Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                The Result — Your Live Chatbot
              </h3>
            </div>

            <div className="flex-1 min-h-[600px] h-full">
              <AnimatePresence mode="wait">
                {showWidget ? (
                  <motion.div key="widget" className="h-full">
                    <LiveChatWidget chatStep={chatStep} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <div className="relative h-full">
                      <div className="absolute -inset-1 bg-gradient-to-r from-slate-200/50 via-slate-100/50 to-slate-200/50 rounded-2xl" />
                      <div className="relative bg-white/80 backdrop-blur rounded-xl border border-slate-200 border-dashed h-full flex flex-col items-center justify-center text-center p-12">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                          <MessageCircle className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-lg font-medium mb-2">Your chatbot will appear here</p>
                        <p className="text-slate-400 text-sm">Watch the magic happen on the left...</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
