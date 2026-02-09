"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Users, ArrowRight } from "lucide-react";

interface Message {
  role: "visitor" | "agent";
  text: string;
}

const CONVERSATION: Message[] = [
  {
    role: "visitor",
    text: "Hi, I'm looking for a project management tool for my team",
  },
  {
    role: "agent",
    text: "Welcome! I'd love to help you find the right fit. We have plans for teams of all sizes. How many people are on your team?",
  },
  { role: "visitor", text: "About 15 people" },
  {
    role: "agent",
    text: "Great! For a team of 15, our Pro plan would be perfect — it includes unlimited projects, team collaboration, and priority support. Would you like me to send you a detailed comparison of our plans?",
  },
  { role: "visitor", text: "Yes please" },
  {
    role: "agent",
    text: "I'll send that right over! What's the best email to reach you?",
  },
  { role: "visitor", text: "sarah@company.com" },
  {
    role: "agent",
    text: "Thanks Sarah! I've sent the comparison to your email. Our team will also follow up with a personalized demo if you're interested. Is there anything else I can help with?",
  },
];

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2 mb-4"
    >
      <div className="bg-[#111] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <motion.div
            className="w-2 h-2 bg-zinc-500 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-zinc-500 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-zinc-500 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function LiveDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, showTyping]);

  const runConversation = useCallback(() => {
    setMessages([]);
    setShowTyping(false);
    setShowResult(false);

    let currentDelay = 1000;

    CONVERSATION.forEach((message, index) => {
      if (message.role === "agent") {
        // Show typing indicator before agent message
        const typingTimeout = setTimeout(() => {
          setShowTyping(true);
        }, currentDelay);
        timeoutsRef.current.push(typingTimeout);
        currentDelay += 800;

        // Show agent message
        const messageTimeout = setTimeout(() => {
          setShowTyping(false);
          setMessages((prev) => [...prev, message]);
        }, currentDelay);
        timeoutsRef.current.push(messageTimeout);
        currentDelay += 2000;
      } else {
        // Show visitor message
        const messageTimeout = setTimeout(() => {
          setMessages((prev) => [...prev, message]);
        }, currentDelay);
        timeoutsRef.current.push(messageTimeout);
        currentDelay += 1500;
      }
    });

    // Show result card after last message
    const resultTimeout = setTimeout(() => {
      setShowResult(true);
    }, currentDelay);
    timeoutsRef.current.push(resultTimeout);

    // Reset and loop after 5 seconds
    const resetTimeout = setTimeout(() => {
      runConversation();
    }, currentDelay + 5000);
    timeoutsRef.current.push(resetTimeout);
  }, []);

  useEffect(() => {
    runConversation();

    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, [runConversation]);

  return (
    <section id="demo" className="py-32 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-blue-400 text-sm font-medium tracking-wider mb-4 uppercase">
            SEE IT IN ACTION
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Watch an AI agent turn a visitor into a lead.
          </h2>
          <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
            This is a real conversation. The agent knows the product, asks the
            right questions, and captures the lead — all automatically.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto relative"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-blue-500/[0.07] blur-3xl rounded-full" />

          {/* Chat window */}
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden">
            {/* Header */}
            <div className="bg-[#111] border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white font-medium">AI Sales Agent</span>
              </div>
              <span className="text-xs text-zinc-500">Active</span>
            </div>

            {/* Messages */}
            <div ref={chatContainerRef} className="p-6 h-[500px] overflow-y-auto">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`mb-4 flex ${
                      message.role === "visitor" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`${
                        message.role === "visitor"
                          ? "bg-blue-600 text-white rounded-2xl rounded-br-md ml-auto"
                          : "bg-[#111] text-zinc-200 rounded-2xl rounded-bl-md"
                      } px-4 py-3 text-sm max-w-[80%]`}
                    >
                      {message.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {showTyping && <TypingIndicator />}
              </AnimatePresence>

              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-[#111] border border-white/[0.08] rounded-xl p-4 mt-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            Lead Captured
                          </p>
                          <p className="text-xs text-zinc-400">
                            sarah@company.com
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            Qualified
                          </p>
                          <p className="text-xs text-zinc-400">
                            Team of 15, interested in Pro plan
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <ArrowRight className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            Handoff
                          </p>
                          <p className="text-xs text-zinc-400">
                            Sales team notified
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
