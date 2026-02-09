"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

interface Message {
  role: "bot" | "user";
  text: string;
}

const MESSAGES: Message[] = [
  {
    role: "bot",
    text: "Hi! Welcome to TechStore. What can I help you with today?",
  },
  { role: "user", text: "What plans do you have?" },
  {
    role: "bot",
    text: "We have three plans:\n\n• Starter — $29/mo\n• Pro — $79/mo for teams\n• Enterprise — Custom\n\nAre you looking for a team or personal plan?",
  },
  { role: "user", text: "Team plan for about 15 people" },
  {
    role: "bot",
    text: "Pro would be perfect for 15 people. Includes unlimited projects and priority support. Want me to send you a comparison?",
  },
  { role: "user", text: "Yes please" },
  {
    role: "bot",
    text: "I'll send that right over! What's the best email to reach you?",
  },
  { role: "user", text: "sarah@company.com" },
];

const narrativeSteps = [
  {
    label: "The visitor arrives",
    text: "Someone lands on your website. They're browsing, comparing, maybe even ready to buy. But they have a question.",
  },
  {
    label: "The conversation starts",
    text: "Instead of a dead-end FAQ or a form nobody fills out, your AI agent starts a real conversation. It knows your product. It speaks your brand voice.",
  },
  {
    label: "Intent is qualified",
    text: "Through natural conversation, the agent identifies buying signals — team size, budget, timeline. No forms. No friction. Just a conversation.",
  },
  {
    label: "The lead is captured",
    text: "At the right moment, the agent captures contact info and routes the qualified lead to your team. With full context. Ready for follow-up.",
  },
];

function ChatDemo() {
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showCaptured, setShowCaptured] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [displayedMessages, isTyping]);

  const start = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setDisplayedMessages([]);
    setIsTyping(false);
    setShowCaptured(false);

    let delay = 800;

    MESSAGES.forEach((msg) => {
      if (msg.role === "bot") {
        const t1 = setTimeout(() => setIsTyping(true), delay);
        timeoutsRef.current.push(t1);
        delay += 700;
        const t2 = setTimeout(() => {
          setIsTyping(false);
          setDisplayedMessages((p) => [...p, msg]);
        }, delay);
        timeoutsRef.current.push(t2);
        delay += 1800;
      } else {
        const t = setTimeout(
          () => setDisplayedMessages((p) => [...p, msg]),
          delay
        );
        timeoutsRef.current.push(t);
        delay += 1200;
      }
    });

    const tc = setTimeout(() => setShowCaptured(true), delay);
    timeoutsRef.current.push(tc);

    const tr = setTimeout(() => start(), delay + 5000);
    timeoutsRef.current.push(tr);
  }, []);

  useEffect(() => {
    start();
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, [start]);

  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden shadow-xl shadow-black/[0.03]">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.06] bg-zinc-50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[11px] text-zinc-400">yourwebsite.com</span>
        </div>
      </div>

      {/* Chat header */}
      <div className="px-4 py-3 border-b border-black/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900">AI Agent</p>
          <p className="text-[11px] text-zinc-400">Typically replies instantly</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        className="p-4 space-y-3 h-[380px] overflow-y-auto bg-zinc-50/50"
      >
        <AnimatePresence mode="popLayout">
          {displayedMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "bot"
                    ? "bg-white text-zinc-700 rounded-2xl rounded-bl-md border border-black/[0.06] shadow-sm"
                    : "bg-zinc-900 text-white rounded-2xl rounded-br-md"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 flex gap-1 border border-black/[0.06] shadow-sm">
                {[0, 1, 2].map((d) => (
                  <motion.div
                    key={d}
                    className="w-1.5 h-1.5 bg-zinc-300 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: d * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {showCaptured && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-emerald-700 text-xs font-semibold">
                  Lead Captured
                </span>
              </div>
              <p className="text-emerald-600/70 text-[11px] pl-6">
                sarah@company.com · Team of 15 · Pro plan
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-black/[0.06]">
        <div className="flex items-center gap-2 bg-zinc-100 rounded-xl px-3 py-2.5">
          <span className="text-[13px] text-zinc-400 flex-1">
            Type a message...
          </span>
          <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14m-7-7l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShowcaseSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section id="showcase" ref={sectionRef} className="py-24 md:py-40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20">
          {/* Left: Narrative steps */}
          <div className="space-y-0">
            {narrativeSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative pl-8 pb-16 last:pb-0"
              >
                {/* Timeline line */}
                {i !== narrativeSteps.length - 1 && (
                  <div className="absolute left-[5px] top-3 bottom-0 w-px bg-black/[0.06]" />
                )}
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 ${
                    i === narrativeSteps.length - 1
                      ? "border-blue-500 bg-blue-50"
                      : "border-zinc-300 bg-white"
                  }`}
                />
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2">
                  {step.label}
                </p>
                <p className="text-zinc-600 leading-relaxed">{step.text}</p>
              </motion.div>
            ))}
          </div>

          {/* Right: Sticky chat demo */}
          <div className="relative">
            <div className="lg:sticky lg:top-24">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <ChatDemo />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
