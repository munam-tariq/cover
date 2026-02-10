"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

interface Message {
  role: "bot" | "user";
  text: string;
}

const MESSAGES: Message[] = [
  { role: "bot", text: "Hi! Welcome to TechStore. What can I help you with today?" },
  { role: "user", text: "What plans do you have?" },
  {
    role: "bot",
    text: "We have three plans:\n\n• Starter — $29/mo for individuals\n• Pro — $79/mo for small teams\n• Enterprise — Custom pricing\n\nAre you looking for a team or personal plan?",
  },
  { role: "user", text: "Team plan for about 15 people" },
  {
    role: "bot",
    text: "The Pro plan would be perfect for 15 people. It includes unlimited projects, team collaboration, and priority support.\n\nWant me to send you a detailed comparison?",
  },
  { role: "user", text: "Yes please" },
  { role: "bot", text: "I'll send that right over! What's the best email to reach you?" },
  { role: "user", text: "sarah@company.com" },
];

export function Hero() {
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showLeadCaptured, setShowLeadCaptured] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [displayedMessages, isTyping]);

  const startConversation = useCallback(() => {
    // Clear any existing timeouts
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];

    // Reset state
    setDisplayedMessages([]);
    setIsTyping(false);
    setShowLeadCaptured(false);

    let currentDelay = 1000;

    MESSAGES.forEach((message, index) => {
      if (message.role === "bot") {
        // Show typing indicator
        const typingTimeout = setTimeout(() => {
          setIsTyping(true);
        }, currentDelay);
        timeoutsRef.current.push(typingTimeout);

        currentDelay += 800;

        // Show bot message
        const messageTimeout = setTimeout(() => {
          setIsTyping(false);
          setDisplayedMessages((prev) => [...prev, message]);
        }, currentDelay);
        timeoutsRef.current.push(messageTimeout);

        currentDelay += 2000;
      } else {
        // Show user message
        const messageTimeout = setTimeout(() => {
          setDisplayedMessages((prev) => [...prev, message]);
        }, currentDelay);
        timeoutsRef.current.push(messageTimeout);

        currentDelay += 1500;
      }
    });

    // Show lead captured banner
    const leadCapturedTimeout = setTimeout(() => {
      setShowLeadCaptured(true);
    }, currentDelay);
    timeoutsRef.current.push(leadCapturedTimeout);

    // Restart conversation
    const restartTimeout = setTimeout(() => {
      startConversation();
    }, currentDelay + 4000);
    timeoutsRef.current.push(restartTimeout);
  }, []);

  useEffect(() => {
    startConversation();

    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [startConversation]);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050505] pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Side - Copy */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0 }}
            >
              <span className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm font-medium">
                AI-Powered Lead Capture
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1]"
            >
              Your website is
              <br />
              leaking leads.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-zinc-400 max-w-lg leading-relaxed"
            >
              89% of visitors leave without saying a word. FrontFace puts an AI agent on every page — one that knows your product, captures intent, and turns browsers into buyers. 24/7.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-medium transition-colors"
              >
                Start Free — No Credit Card
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center gap-2 border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 hover:text-white px-8 py-4 rounded-xl transition-colors"
              >
                See How It Works
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-sm text-zinc-500"
            >
              Free during beta · 5-min setup · Works on any website
            </motion.p>
          </div>

          {/* Right Side - Chat Widget Demo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl" />

            {/* Chat Widget */}
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#111] overflow-hidden shadow-2xl max-w-md mx-auto">
              {/* Header */}
              <div className="bg-blue-600 px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-white font-medium">AI Assistant</span>
                <span className="text-blue-100 text-sm ml-auto">Online</span>
              </div>

              {/* Messages Area */}
              <div ref={chatContainerRef} className="bg-[#0a0a0a] p-4 space-y-3 h-[500px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {displayedMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap ${
                          message.role === "bot"
                            ? "bg-[#1a1a1a] text-zinc-200 rounded-xl rounded-bl-sm"
                            : "bg-blue-600 text-white rounded-xl rounded-br-sm"
                        }`}
                      >
                        {message.text}
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-[#1a1a1a] rounded-xl rounded-bl-sm px-4 py-3 flex gap-1">
                        <motion.div
                          className="w-2 h-2 bg-zinc-400 rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-zinc-400 rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-zinc-400 rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {showLeadCaptured && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-green-400 font-medium text-sm">Lead Captured: sarah@company.com</span>
                      </div>
                      <p className="text-green-300/70 text-xs pl-7">
                        Qualified: Team of 15, interested in Pro plan
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div />
              </div>

              {/* Input Bar */}
              <div className="bg-[#111] border-t border-white/[0.08] p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    disabled
                    className="flex-1 bg-[#0a0a0a] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-400 placeholder:text-zinc-600 cursor-not-allowed"
                  />
                  <button
                    disabled
                    className="bg-blue-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
