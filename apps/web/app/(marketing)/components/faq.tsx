"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "How is this different from a regular chatbot?",
      answer:
        "Regular chatbots answer FAQs and dead-end. FrontFace is built to capture leads. It knows your product, qualifies visitor intent, and captures contact info naturally — turning conversations into pipeline.",
    },
    {
      question: "How fast can I set this up?",
      answer:
        "5 minutes. Upload your docs or website URL, copy one line of code, and you're live. Or use our MCP integration to deploy entirely from Cursor or Claude.",
    },
    {
      question: "How accurate are the answers?",
      answer:
        "We use RAG (Retrieval-Augmented Generation) so the AI only answers from YOUR documents. No hallucinations. If it doesn't know something, it says so and offers to connect the visitor with your team.",
    },
    {
      question: "What happens when the AI can't answer?",
      answer:
        "Two options: it captures the visitor's email for follow-up, or it hands off to a human agent on your team — with full conversation context. No customer falls through the cracks.",
    },
    {
      question: "Can it integrate with my other tools?",
      answer:
        "Yes. Configure API endpoints so the AI can check order status, look up accounts, or pull live data. It becomes a real agent, not just a FAQ bot.",
    },
    {
      question: "Is it really free?",
      answer:
        "100% free during beta. No credit card, no catch. We're building in public and want early adopters to help shape the product. Beta users get locked-in pricing when paid plans launch.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="py-32 bg-[#050505]">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4">
            FAQ
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Questions? We've got answers.
          </h2>
          <p className="text-lg text-zinc-400">
            Everything you need to know about FrontFace.
          </p>
        </div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-[#111] border border-white/[0.08] rounded-2xl px-6"
        >
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border-b border-white/[0.08] ${
                index === faqs.length - 1 ? "border-b-0" : ""
              }`}
            >
              {/* Question */}
              <button
                onClick={() => toggleFAQ(index)}
                className="py-6 flex justify-between items-center w-full text-left group"
              >
                <span className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                    openIndex === index
                      ? "rotate-180 text-blue-400"
                      : "text-zinc-500"
                  }`}
                />
              </button>

              {/* Answer */}
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pb-6 text-zinc-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
