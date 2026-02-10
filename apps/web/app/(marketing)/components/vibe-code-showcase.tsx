"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Check,
  MessageCircle,
  ArrowRight,
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";

// Dashboard stat card
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  delay,
  isVisible,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  color: string;
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
          className="bg-white rounded-lg border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-slate-500">{label}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-green-600 mt-1">{subtext}</p>
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
    { role: "bot", text: "Hi! How can I help you today?" },
    { role: "user", text: "What's your return policy?" },
    { role: "bot", text: "We offer 30-day hassle-free returns. Simply email us at returns@store.com with your order number, and we'll send a prepaid shipping label within 24 hours." },
    { role: "user", text: "How long does shipping take?" },
    { role: "bot", text: "Standard shipping is 3-5 business days. Express shipping is 1-2 business days and costs $9.99. Free shipping on orders over $50!" },
    { role: "user", text: "I have a complex issue with my order #12847" },
    { role: "bot", text: "I'd be happy to connect you with our team to help with your order. Let me get someone who can look into this right away." },
    { role: "bot", text: "🔄 Connecting you to a support agent...", isHandoff: true },
    { role: "agent", text: "Hi! I'm Sarah from the support team. I can see your order #12847. Let me look into this for you. What seems to be the issue?" },
  ];

  // Auto-scroll chat container only (not the page)
  useEffect(() => {
    if (chatStep > 0 && chatContainerRef.current) {
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
            your-store.com
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

          {/* Chat widget floating */}
          <div className="absolute bottom-3 right-3 left-12 top-20 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">Support</p>
                <p className="text-white/70 text-xs">We typically reply instantly</p>
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
                      {msg.role === "agent" && (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-2 flex-shrink-0 text-white text-xs font-bold">
                          S
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm"
                            : msg.role === "agent"
                              ? "bg-green-50 text-slate-700 border border-green-200 rounded-bl-sm"
                              : (msg as { isHandoff?: boolean }).isHandoff
                                ? "bg-amber-50 text-amber-700 border border-amber-200 rounded-bl-sm"
                                : "bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-sm"
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.text}</div>
                        {msg.role === "agent" && (
                          <div className="text-xs text-green-600 mt-1 font-medium">Sarah - Support Team</div>
                        )}
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
  const [dashboardStep, setDashboardStep] = useState(0);
  const [showWidget, setShowWidget] = useState(false);
  const [chatStep, setChatStep] = useState(0);

  // Animation timeline
  useEffect(() => {
    if (!isInView) return;

    const timeline = [
      // Dashboard animations
      { time: 500, action: () => setDashboardStep(1) },
      { time: 800, action: () => setDashboardStep(2) },
      { time: 1100, action: () => setDashboardStep(3) },
      { time: 1400, action: () => setDashboardStep(4) },
      { time: 1700, action: () => setDashboardStep(5) },
      // Show widget
      { time: 2500, action: () => setShowWidget(true) },
      // Chat animation - show messages progressively
      { time: 3000, action: () => setChatStep(1) },  // Bot: greeting
      { time: 4000, action: () => setChatStep(2) },  // User: return policy
      { time: 5000, action: () => setChatStep(3) },  // Bot: return policy answer
      { time: 6500, action: () => setChatStep(4) },  // User: shipping
      { time: 7500, action: () => setChatStep(5) },  // Bot: shipping answer
      // Human handoff flow
      { time: 9000, action: () => setChatStep(6) },  // User: complex issue
      { time: 10500, action: () => setChatStep(7) }, // Bot: will connect
      { time: 12000, action: () => setChatStep(8) }, // Bot: connecting notification
      { time: 14000, action: () => setChatStep(9) }, // Agent: takes over
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
          {/* Dashboard Window */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col"
          >
            {/* Left Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Your Dashboard — See Everything
              </h3>
            </div>

            <div className="relative flex-1 flex flex-col min-h-[600px]">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />

              {/* Dashboard window */}
              <div className="relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xl flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      FrontFace Dashboard
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-slate-500">Chatbot Active</span>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-4 flex-1 bg-slate-50">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <StatCard
                      icon={MessageCircle}
                      label="Conversations Today"
                      value="47"
                      subtext="+12 from yesterday"
                      color="bg-blue-500"
                      delay={0}
                      isVisible={dashboardStep >= 1}
                    />
                    <StatCard
                      icon={Check}
                      label="Questions Answered"
                      value="89%"
                      subtext="by AI automatically"
                      color="bg-green-500"
                      delay={0}
                      isVisible={dashboardStep >= 2}
                    />
                    <StatCard
                      icon={Users}
                      label="Human Handoffs"
                      value="5"
                      subtext="11% of conversations"
                      color="bg-purple-500"
                      delay={0}
                      isVisible={dashboardStep >= 3}
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="Leads Captured"
                      value="12"
                      subtext="+3 from yesterday"
                      color="bg-amber-500"
                      delay={0}
                      isVisible={dashboardStep >= 4}
                    />
                  </div>

                  {/* Knowledge Base Status */}
                  <AnimatePresence>
                    {dashboardStep >= 5 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Knowledge Base</span>
                          </div>
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Up to date</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Pages indexed</span>
                            <span className="font-medium text-slate-700">24 pages</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Last updated</span>
                            <span className="font-medium text-slate-700">2 hours ago</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Top question today</span>
                            <span className="font-medium text-slate-700 truncate ml-2">&quot;Return policy&quot;</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active Agents */}
                  <AnimatePresence>
                    {dashboardStep >= 5 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-3 bg-white rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Support Queue</span>
                          </div>
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">1 waiting</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">S</div>
                            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">M</div>
                          </div>
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">2 agents</span> online
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                What Your Customers See
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
                        <p className="text-slate-400 text-sm">Watch how it handles customer questions...</p>
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
