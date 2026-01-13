"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Check, MessageCircle, Loader2 } from "lucide-react";

interface Step {
  text: string;
  status: "pending" | "loading" | "done";
}

export function VibeDemo() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const [userMessage, setUserMessage] = useState("");
  const [claudeResponse, setClaudeResponse] = useState("");
  const [steps, setSteps] = useState<Step[]>([
    { text: 'Creating project "App Support"...', status: "pending" },
    { text: "Uploading docs to knowledge base...", status: "pending" },
    { text: "Getting embed code...", status: "pending" },
  ]);
  const [showDoneMessage, setShowDoneMessage] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [widgetExpanded, setWidgetExpanded] = useState(false);

  const fullUserMessage = "Add a customer support chatbot to my app that knows about our pricing and features";
  const fullClaudeResponse = "I'll set up a SupportBase chatbot for you.";

  useEffect(() => {
    if (!isInView) return;

    // Type user message
    let userIndex = 0;
    const userInterval = setInterval(() => {
      if (userIndex < fullUserMessage.length) {
        setUserMessage(fullUserMessage.slice(0, userIndex + 1));
        userIndex++;
      } else {
        clearInterval(userInterval);
      }
    }, 25);

    // Start Claude response after user message
    const claudeTimeout = setTimeout(() => {
      let claudeIndex = 0;
      const claudeInterval = setInterval(() => {
        if (claudeIndex < fullClaudeResponse.length) {
          setClaudeResponse(fullClaudeResponse.slice(0, claudeIndex + 1));
          claudeIndex++;
        } else {
          clearInterval(claudeInterval);
        }
      }, 30);
    }, 2000);

    // Step animations
    const step1Timeout = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, status: "loading" } : s))
      );
    }, 3500);

    const step1DoneTimeout = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, status: "done" } : s))
      );
    }, 4500);

    const step2Timeout = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 1 ? { ...s, status: "loading" } : s))
      );
    }, 4600);

    const step2DoneTimeout = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 1 ? { ...s, status: "done" } : s))
      );
    }, 5600);

    const step3Timeout = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 2 ? { ...s, status: "loading" } : s))
      );
    }, 5700);

    const step3DoneTimeout = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s, i) => (i === 2 ? { ...s, status: "done" } : s))
      );
    }, 6700);

    const doneTimeout = setTimeout(() => {
      setShowDoneMessage(true);
    }, 7000);

    const widgetTimeout = setTimeout(() => {
      setShowWidget(true);
    }, 7500);

    const expandTimeout = setTimeout(() => {
      setWidgetExpanded(true);
    }, 8500);

    return () => {
      clearInterval(userInterval);
      clearTimeout(claudeTimeout);
      clearTimeout(step1Timeout);
      clearTimeout(step1DoneTimeout);
      clearTimeout(step2Timeout);
      clearTimeout(step2DoneTimeout);
      clearTimeout(step3Timeout);
      clearTimeout(step3DoneTimeout);
      clearTimeout(doneTimeout);
      clearTimeout(widgetTimeout);
      clearTimeout(expandTimeout);
    };
  }, [isInView]);

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="py-32 bg-gradient-to-b from-white to-slate-50 border-t border-slate-100"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Just ask your AI to add a chatbot.
          </h2>
          <p className="text-xl text-slate-600">
            SupportBase is the first chatbot platform built for vibe coding.
          </p>
        </motion.div>

        {/* Demo Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Left Panel: Terminal */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-3 text-sm text-slate-400 font-mono">
                  Claude
                </span>
              </div>

              {/* Terminal Content */}
              <div className="p-6 font-mono text-sm min-h-[350px]">
                {/* User Message */}
                <div className="mb-6">
                  <span className="text-blue-400">You: </span>
                  <span className="text-slate-300">{userMessage}</span>
                  <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />
                </div>

                {/* Claude Response */}
                {claudeResponse && (
                  <div className="mb-6">
                    <span className="text-purple-400">Claude: </span>
                    <span className="text-slate-300">{claudeResponse}</span>
                  </div>
                )}

                {/* Steps */}
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: step.status !== "pending" ? 1 : 0,
                        x: step.status !== "pending" ? 0 : -10,
                      }}
                      className="flex items-center gap-2"
                    >
                      {step.status === "loading" && (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      )}
                      {step.status === "done" && (
                        <Check className="w-4 h-4 text-green-400" />
                      )}
                      <span className="text-slate-400">{step.text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Done Message */}
                {showDoneMessage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 text-green-400"
                  >
                    Done! Your chatbot is now live.
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Preview */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[350px] shadow-2xl">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 mx-4">
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-500 text-center">
                    your-app.com
                  </div>
                </div>
              </div>

              {/* Website Preview */}
              <div className="relative p-8 h-[calc(100%-48px)] bg-slate-50">
                {/* Mock Content */}
                <div className="space-y-4">
                  <div className="h-8 w-32 bg-slate-200 rounded" />
                  <div className="h-4 w-full bg-slate-100 rounded" />
                  <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  <div className="h-4 w-5/6 bg-slate-100 rounded" />
                  <div className="h-32 w-full bg-slate-100 rounded-lg mt-6" />
                </div>

                {/* Chat Widget */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: showWidget ? 1 : 0,
                    opacity: showWidget ? 1 : 0,
                  }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="absolute bottom-6 right-6"
                >
                  {!widgetExpanded ? (
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-72 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
                    >
                      {/* Widget Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
                        <p className="text-white font-medium text-sm">
                          App Support
                        </p>
                      </div>
                      {/* Widget Body */}
                      <div className="p-4 bg-slate-50">
                        <div className="bg-white rounded-lg p-3 shadow-sm text-sm text-slate-700 border border-slate-100">
                          Hi! How can I help you today?
                        </div>
                      </div>
                      {/* Widget Input */}
                      <div className="px-4 pb-4 bg-slate-50">
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400">
                          Type a message...
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
