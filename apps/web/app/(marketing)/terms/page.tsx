import { Metadata } from "next";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

export const metadata: Metadata = {
  title: "Terms of Service | SupportBase",
  description:
    "Read the Terms of Service for SupportBase. These terms govern your use of our AI-powered customer support platform.",
  openGraph: {
    title: "Terms of Service | SupportBase",
    description: "Terms and conditions for using SupportBase.",
    url: "https://supportbase.app/terms",
    type: "website",
  },
  alternates: {
    canonical: "https://supportbase.app/terms",
  },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <article className="max-w-4xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-slate-500">Last Updated: January 2026</p>
          </div>

          {/* Content */}
          <div className="prose prose-slate max-w-none">
            {/* Acceptance */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                By accessing or using SupportBase (&quot;the Service&quot;), you agree to
                be bound by these Terms of Service (&quot;Terms&quot;). If you do not
                agree to these Terms, you may not access or use the Service.
              </p>
              <p className="text-slate-700 leading-relaxed">
                These Terms apply to all users of the Service, including users
                who are also contributors of content, information, and other
                materials or services. By using the Service, you represent that
                you are at least 16 years of age and have the legal capacity to
                enter into these Terms.
              </p>
            </section>

            {/* Description of Service */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                2. Description of Service
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                SupportBase is an AI-powered customer support platform that
                enables businesses to create intelligent chatbots trained on
                their own content. The Service includes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>AI chatbot creation and management</li>
                <li>Knowledge base upload and processing</li>
                <li>Lead capture functionality</li>
                <li>Conversation analytics and insights</li>
                <li>Human handoff capabilities</li>
                <li>Website embedding tools</li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any
                aspect of the Service at any time without prior notice.
              </p>
            </section>

            {/* Beta Service */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                3. Beta Service Notice
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                The Service is currently provided as a beta release. By using
                the Service, you acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>
                  The Service may contain bugs, errors, or other issues that
                  could cause system failures or data loss
                </li>
                <li>
                  Features may be added, modified, or removed without advance
                  notice
                </li>
                <li>
                  We do not guarantee any specific uptime or availability during
                  the beta period
                </li>
                <li>
                  Pricing and features may change when the Service moves out of
                  beta
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                We appreciate your feedback during this beta period. Please
                report any issues to{" "}
                <a
                  href="mailto:hello@supportbase.app"
                  className="text-blue-600 hover:underline"
                >
                  hello@supportbase.app
                </a>
                .
              </p>
            </section>

            {/* Account Registration */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                4. Account Registration
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                To use certain features of the Service, you must create an
                account. When creating an account, you agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Keep your account credentials secure and confidential</li>
                <li>
                  Notify us immediately of any unauthorized access or use of
                  your account
                </li>
                <li>
                  Be responsible for all activities that occur under your
                  account
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                We reserve the right to suspend or terminate accounts that
                violate these Terms or that we believe are being used
                fraudulently.
              </p>
            </section>

            {/* Acceptable Use */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                5. Acceptable Use Policy
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>
                  Upload, post, or transmit any content that is illegal,
                  harmful, threatening, abusive, harassing, defamatory, or
                  otherwise objectionable
                </li>
                <li>
                  Impersonate any person or entity or falsely state your
                  affiliation with a person or entity
                </li>
                <li>
                  Upload content that infringes on any patent, trademark, trade
                  secret, copyright, or other proprietary rights
                </li>
                <li>
                  Transmit spam, chain letters, or other unsolicited
                  communications
                </li>
                <li>
                  Interfere with or disrupt the Service or servers or networks
                  connected to the Service
                </li>
                <li>
                  Attempt to gain unauthorized access to any portion of the
                  Service or any systems or networks connected to the Service
                </li>
                <li>
                  Use the Service for any illegal purpose or in violation of any
                  applicable laws or regulations
                </li>
                <li>
                  Reverse engineer, decompile, or disassemble any portion of the
                  Service
                </li>
                <li>
                  Use automated systems or software to extract data from the
                  Service (scraping)
                </li>
              </ul>
            </section>

            {/* Your Content */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                6. Your Content
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                &quot;Your Content&quot; refers to any content you upload, submit, or
                transmit through the Service, including knowledge base
                documents, FAQs, and other materials used to train your chatbot.
              </p>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                6.1 Ownership
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You retain all ownership rights in Your Content. We do not claim
                ownership of any content you submit to the Service.
              </p>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                6.2 License Grant
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                By uploading Your Content to the Service, you grant us a
                non-exclusive, worldwide, royalty-free license to use, copy,
                process, and display Your Content solely for the purpose of
                providing and improving the Service to you.
              </p>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                6.3 Responsibility
              </h3>
              <p className="text-slate-700 leading-relaxed">
                You are solely responsible for Your Content and the consequences
                of uploading it. You represent and warrant that you have all
                necessary rights to upload Your Content and that Your Content
                does not violate any third-party rights.
              </p>
            </section>

            {/* Intellectual Property */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                7. Intellectual Property
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                The Service and its original content, features, and
                functionality are and will remain the exclusive property of
                SupportBase and its licensors. The Service is protected by
                copyright, trademark, and other laws.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Our trademarks and trade dress may not be used in connection
                with any product or service without the prior written consent of
                SupportBase.
              </p>
            </section>

            {/* AI Content Disclaimer */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                8. AI-Generated Content Disclaimer
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                The Service uses artificial intelligence to generate responses
                based on the content you provide. You acknowledge and agree
                that:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>
                  AI-generated responses may not always be accurate, complete,
                  or appropriate
                </li>
                <li>
                  You are responsible for reviewing and verifying AI-generated
                  content before relying on it
                </li>
                <li>
                  We do not guarantee the accuracy, reliability, or suitability
                  of AI-generated responses for any particular purpose
                </li>
                <li>
                  AI responses should not be considered professional advice
                  (legal, medical, financial, etc.)
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                We recommend reviewing your chatbot&apos;s responses regularly to
                ensure they meet your quality standards.
              </p>
            </section>

            {/* Third-Party Services */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                9. Third-Party Services
              </h2>
              <p className="text-slate-700 leading-relaxed">
                The Service may integrate with or contain links to third-party
                websites, services, or applications. We are not responsible for
                the content, privacy policies, or practices of any third-party
                services. Your use of third-party services is at your own risk
                and subject to the terms and conditions of those services.
              </p>
            </section>

            {/* Payment Terms */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                10. Payment Terms
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                During the beta period, the Service is provided free of charge.
                When paid plans are introduced:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>
                  Subscription fees will be billed in advance on a monthly or
                  annual basis
                </li>
                <li>
                  All fees are non-refundable except as required by applicable
                  law or as explicitly stated in our refund policy
                </li>
                <li>
                  We may change our pricing with at least 30 days&apos; notice
                </li>
                <li>
                  Failure to pay may result in suspension or termination of your
                  account
                </li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                11. Limitation of Liability
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>
                  IN NO EVENT SHALL SUPPORTBASE BE LIABLE FOR ANY INDIRECT,
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                  INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE,
                  GOODWILL, OR OTHER INTANGIBLE LOSSES
                </li>
                <li>
                  OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US,
                  IF ANY, IN THE TWELVE (12) MONTHS PRIOR TO THE CLAIM
                </li>
                <li>
                  WE SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM YOUR USE
                  OF OR INABILITY TO USE THE SERVICE
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                Some jurisdictions do not allow the exclusion of certain
                warranties or limitation of liability for certain damages. In
                such jurisdictions, our liability shall be limited to the
                maximum extent permitted by law.
              </p>
            </section>

            {/* Disclaimer of Warranties */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                12. Disclaimer of Warranties
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS.
                SUPPORTBASE EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND,
                WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>IMPLIED WARRANTIES OF MERCHANTABILITY</li>
                <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>NON-INFRINGEMENT</li>
                <li>
                  ANY WARRANTY THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE,
                  OR ERROR-FREE
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                You use the Service at your own risk. We do not warrant that the
                Service will meet your specific requirements.
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                13. Indemnification
              </h2>
              <p className="text-slate-700 leading-relaxed">
                You agree to defend, indemnify, and hold harmless SupportBase
                and its officers, directors, employees, and agents from and
                against any claims, damages, obligations, losses, liabilities,
                costs, or expenses (including attorney&apos;s fees) arising from: (a)
                your use of the Service; (b) Your Content; (c) your violation of
                these Terms; or (d) your violation of any third-party right,
                including any intellectual property or privacy right.
              </p>
            </section>

            {/* Termination */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                14. Termination
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                You may terminate your account at any time by contacting us at{" "}
                <a
                  href="mailto:hello@supportbase.app"
                  className="text-blue-600 hover:underline"
                >
                  hello@supportbase.app
                </a>{" "}
                or through your account settings.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may terminate or suspend your account immediately, without
                prior notice or liability, for any reason, including without
                limitation if you breach these Terms.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Upon termination, your right to use the Service will immediately
                cease. All provisions of these Terms which by their nature
                should survive termination shall survive, including ownership
                provisions, warranty disclaimers, indemnity, and limitations of
                liability.
              </p>
            </section>

            {/* Governing Law */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                15. Governing Law
              </h2>
              <p className="text-slate-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance
                with applicable laws, without regard to conflict of law
                principles. Any disputes arising under these Terms shall be
                resolved through good faith negotiation between the parties.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                16. Dispute Resolution
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have any concerns or disputes about the Service, you
                agree to first try to resolve the dispute informally by
                contacting us at{" "}
                <a
                  href="mailto:hello@supportbase.app"
                  className="text-blue-600 hover:underline"
                >
                  hello@supportbase.app
                </a>
                .
              </p>
              <p className="text-slate-700 leading-relaxed">
                We will attempt to resolve any disputes through informal
                negotiation within sixty (60) days. If the dispute cannot be
                resolved informally, you and SupportBase agree to resolve any
                claim through binding arbitration, except that either party may
                bring claims in small claims court if they qualify.
              </p>
            </section>

            {/* Changes to Terms */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                17. Changes to Terms
              </h2>
              <p className="text-slate-700 leading-relaxed">
                We reserve the right to modify or replace these Terms at any
                time. If a revision is material, we will provide at least 30
                days&apos; notice prior to any new terms taking effect. What
                constitutes a material change will be determined at our sole
                discretion. By continuing to access or use the Service after
                those revisions become effective, you agree to be bound by the
                revised terms.
              </p>
            </section>

            {/* Severability */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                18. Severability
              </h2>
              <p className="text-slate-700 leading-relaxed">
                If any provision of these Terms is held to be invalid or
                unenforceable, the remaining provisions will remain in full
                force and effect. The invalid or unenforceable provision will be
                modified to the minimum extent necessary to make it valid and
                enforceable.
              </p>
            </section>

            {/* Entire Agreement */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                19. Entire Agreement
              </h2>
              <p className="text-slate-700 leading-relaxed">
                These Terms, together with our Privacy Policy, constitute the
                entire agreement between you and SupportBase regarding the
                Service and supersede all prior agreements and understandings,
                whether written or oral.
              </p>
            </section>

            {/* Contact */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                20. Contact Us
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us
                at:
              </p>
              <p className="text-slate-700 leading-relaxed">
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:hello@supportbase.app"
                  className="text-blue-600 hover:underline"
                >
                  hello@supportbase.app
                </a>
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
