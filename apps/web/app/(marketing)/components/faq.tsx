"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How does the MCP integration work?",
    answer:
      "SupportBase provides an MCP server that works with Cursor, Claude Code, and other AI tools. Your AI assistant can create projects, upload knowledge, and get embed codes—all through conversation. Just add our MCP server to your config and start asking.",
  },
  {
    question: "What file types can I upload?",
    answer:
      "PDFs, text files, markdown, and you can paste text directly. We process everything into searchable chunks that your chatbot can use to answer questions accurately.",
  },
  {
    question: "Can the chatbot access real-time data?",
    answer:
      "Yes! Configure API endpoints and the chatbot can fetch live data like order status, inventory, account information, or any other data your APIs provide. Authentication via API key or Bearer token is supported.",
  },
  {
    question: "How accurate are the answers?",
    answer:
      "We use RAG (Retrieval Augmented Generation) with semantic search. The chatbot only answers from your actual documentation—no hallucinations. When it doesn't know something, it says so honestly.",
  },
  {
    question: "What if the chatbot can't answer a question?",
    answer:
      "It gracefully says 'I don't know' and can capture the visitor's email so you can follow up. This way you never lose a potential customer or miss important feedback.",
  },
  {
    question: "Is there a free tier?",
    answer:
      "Yes! Start free with generous limits. No credit card required. You can upgrade anytime as your needs grow.",
  },
];

function FAQItem({
  faq,
  isOpen,
  onClick,
}: {
  faq: { question: string; answer: string };
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-slate-900 group-hover:text-blue-600 transition-colors pr-8">
          {faq.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-slate-600 leading-relaxed">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-32 bg-white border-t border-slate-100">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Questions? We've got answers.
          </h2>
          <p className="text-xl text-slate-600">
            Everything you need to know about SupportBase.
          </p>
        </motion.div>

        {/* FAQ List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-slate-50 border border-slate-100 rounded-2xl px-6"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
