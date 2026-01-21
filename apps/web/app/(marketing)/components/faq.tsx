"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How fast can I set this up?",
    answer:
      "5 minutes. Upload your docs, copy one line of code, done. Need help? We'll set it up for you, free.",
  },
  {
    question: "What if the chatbot can't answer a question?",
    answer:
      "You choose: Lead Capture saves their email for follow-up. Human Handoff connects them to your team instantly. Either way, no customer falls through the cracks.",
  },
  {
    question: "How accurate are the answers?",
    answer:
      "89% accuracy on average. Your chatbot only answers from YOUR docs—zero hallucinations. Not sure? It admits it and hands off to your team.",
  },
  {
    question: "Can it connect to my other tools?",
    answer:
      "Yes. API integrations let your chatbot check order status, look up accounts, pull live data. Your chatbot becomes a real support agent, not just a FAQ bot.",
  },
  {
    question: "What file types can I upload?",
    answer:
      "PDFs, Word docs, text files, or just a website URL—we crawl it automatically. Most customers are trained and live in under 5 minutes.",
  },
  {
    question: "Is it really free?",
    answer:
      "100% free during beta. No credit card. No catch. Beta users get locked-in pricing when we launch paid plans.",
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
