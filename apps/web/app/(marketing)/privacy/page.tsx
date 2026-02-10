import { Metadata } from "next";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | FrontFace",
  description:
    "Learn how FrontFace collects, uses, and protects your personal information. Our privacy policy covers data collection, usage, and your rights under GDPR and CCPA.",
  openGraph: {
    title: "Privacy Policy | FrontFace",
    description: "How FrontFace handles your data and protects your privacy.",
    url: "https://frontface.app/privacy",
    type: "website",
  },
  alternates: {
    canonical: "https://frontface.app/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24">
        <article className="max-w-4xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-slate-500">Last Updated: January 2026</p>
          </div>

          {/* Content */}
          <div className="prose prose-slate max-w-none">
            {/* Introduction */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                1. Introduction
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                FrontFace (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting
                your privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our
                AI-powered customer support platform and related services
                (collectively, the &quot;Service&quot;).
              </p>
              <p className="text-slate-700 leading-relaxed">
                By using our Service, you agree to the collection and use of
                information in accordance with this policy. If you do not agree
                with the terms of this policy, please do not access or use the
                Service.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                2.1 Account Information
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                When you create an account, we may collect:
              </p>
              <ul className="list-disc pl-6 mb-6 text-slate-700 space-y-2">
                <li>Name and email address</li>
                <li>Password (stored in encrypted form)</li>
                <li>Company or organization name</li>
                <li>Billing information (for paid plans)</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                2.2 Content You Provide
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                When using the Service, you may upload or provide:
              </p>
              <ul className="list-disc pl-6 mb-6 text-slate-700 space-y-2">
                <li>Knowledge base content (FAQs, documents, website content)</li>
                <li>Chatbot configuration and customization settings</li>
                <li>Team member information if you invite others</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                2.3 Customer Conversation Data
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Our Service processes conversations between your chatbot and your
                customers. This may include:
              </p>
              <ul className="list-disc pl-6 mb-6 text-slate-700 space-y-2">
                <li>Chat messages and queries</li>
                <li>Email addresses (when provided by customers for lead capture)</li>
                <li>Any information customers choose to share in conversations</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                2.4 Usage Data
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We automatically collect certain information when you use the
                Service:
              </p>
              <ul className="list-disc pl-6 mb-6 text-slate-700 space-y-2">
                <li>Device information (browser type, operating system)</li>
                <li>IP address and approximate location</li>
                <li>Pages visited and features used</li>
                <li>Time and date of access</li>
                <li>Referring website addresses</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                2.5 Cookies and Tracking Technologies
              </h3>
              <p className="text-slate-700 leading-relaxed">
                We use cookies and similar technologies to maintain your session,
                remember your preferences, and analyze how our Service is used.
                See Section 9 for more details on cookies.
              </p>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>To provide, maintain, and improve our Service</li>
                <li>To process your chatbot&apos;s responses using AI technology</li>
                <li>To communicate with you about your account and the Service</li>
                <li>To send you technical notices and security alerts</li>
                <li>To respond to your comments, questions, and support requests</li>
                <li>To analyze usage patterns and improve user experience</li>
                <li>To detect, prevent, and address technical issues or fraud</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            {/* How We Share Your Information */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                4. How We Share Your Information
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We do not sell your personal information. We may share your
                information in the following circumstances:
              </p>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                4.1 Service Providers
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may share information with third-party vendors who perform
                services on our behalf, including:
              </p>
              <ul className="list-disc pl-6 mb-6 text-slate-700 space-y-2">
                <li>Cloud hosting providers</li>
                <li>AI and natural language processing providers</li>
                <li>Analytics providers</li>
                <li>Payment processors</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                4.2 Legal Requirements
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may disclose your information if required to do so by law or in
                response to valid requests by public authorities (e.g., court
                order, government agency).
              </p>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                4.3 Business Transfers
              </h3>
              <p className="text-slate-700 leading-relaxed">
                If we are involved in a merger, acquisition, or sale of assets,
                your information may be transferred as part of that transaction.
                We will provide notice before your information becomes subject to
                a different privacy policy.
              </p>
            </section>

            {/* Data Retention */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                5. Data Retention
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We retain your information for as long as your account is active
                or as needed to provide you with the Service. We may also retain
                and use your information as necessary to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>Comply with our legal obligations</li>
                <li>Resolve disputes</li>
                <li>Enforce our agreements</li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                When you delete your account, we will delete or anonymize your
                personal information within 30 days, unless we are required to
                retain it for legal purposes.
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                6. Your Rights
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding
                your personal information:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>
                  <strong>Access:</strong> Request a copy of the personal
                  information we hold about you
                </li>
                <li>
                  <strong>Correction:</strong> Request that we correct inaccurate
                  or incomplete information
                </li>
                <li>
                  <strong>Deletion:</strong> Request that we delete your personal
                  information
                </li>
                <li>
                  <strong>Portability:</strong> Request a copy of your data in a
                  machine-readable format
                </li>
                <li>
                  <strong>Opt-out:</strong> Unsubscribe from marketing
                  communications at any time
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                To exercise any of these rights, please contact us at{" "}
                <a
                  href="mailto:hello@frontface.app"
                  className="text-blue-600 hover:underline"
                >
                  hello@frontface.app
                </a>
                .
              </p>
            </section>

            {/* GDPR Rights */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                7. Additional Rights for EU Users (GDPR)
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you are located in the European Economic Area (EEA), you have
                additional rights under the General Data Protection Regulation
                (GDPR):
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>Right to restrict processing of your personal data</li>
                <li>Right to object to processing based on legitimate interests</li>
                <li>Right to withdraw consent at any time</li>
                <li>
                  Right to lodge a complaint with a supervisory authority
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                We process your data based on your consent, contractual necessity,
                or our legitimate business interests (such as improving our
                Service), always balanced against your rights.
              </p>
            </section>

            {/* CCPA Rights */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                8. Additional Rights for California Residents (CCPA)
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you are a California resident, you have the following rights
                under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>
                  Right to know what personal information is collected and how it
                  is used
                </li>
                <li>Right to request deletion of your personal information</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>
                  Right to non-discrimination for exercising your privacy rights
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                <strong>We do not sell your personal information.</strong> To
                exercise your CCPA rights, contact us at{" "}
                <a
                  href="mailto:hello@frontface.app"
                  className="text-blue-600 hover:underline"
                >
                  hello@frontface.app
                </a>
                .
              </p>
            </section>

            {/* Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                9. Cookies
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We use the following types of cookies:
              </p>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                9.1 Essential Cookies
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These cookies are necessary for the Service to function and
                cannot be switched off. They include session cookies for
                authentication and security.
              </p>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                9.2 Analytics Cookies
              </h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These cookies help us understand how visitors interact with our
                Service by collecting information anonymously. This helps us
                improve the Service.
              </p>

              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                9.3 Managing Cookies
              </h3>
              <p className="text-slate-700 leading-relaxed">
                Most web browsers allow you to control cookies through their
                settings. You can set your browser to refuse cookies or delete
                certain cookies. However, if you block essential cookies, some
                parts of the Service may not function properly.
              </p>
            </section>

            {/* Security */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                10. Security
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We take reasonable measures to protect your information from
                unauthorized access, alteration, disclosure, or destruction.
                These measures include:
              </p>
              <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security assessments</li>
                <li>Access controls and monitoring</li>
              </ul>
              <p className="text-slate-700 leading-relaxed">
                However, no method of transmission over the Internet or
                electronic storage is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                11. Children&apos;s Privacy
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Our Service is not intended for individuals under the age of 16.
                We do not knowingly collect personal information from children
                under 16. If we become aware that we have collected personal
                information from a child under 16, we will take steps to delete
                that information promptly. If you believe we have collected
                information from a child under 16, please contact us at{" "}
                <a
                  href="mailto:hello@frontface.app"
                  className="text-blue-600 hover:underline"
                >
                  hello@frontface.app
                </a>
                .
              </p>
            </section>

            {/* International Data Transfers */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                12. International Data Transfers
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Your information may be transferred to and processed in countries
                other than your country of residence. These countries may have
                data protection laws that are different from the laws of your
                country. We take appropriate safeguards to ensure that your
                personal information remains protected in accordance with this
                Privacy Policy.
              </p>
            </section>

            {/* Changes to This Policy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                13. Changes to This Privacy Policy
              </h2>
              <p className="text-slate-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by posting the new Privacy
                Policy on this page and updating the &quot;Last Updated&quot; date. We
                encourage you to review this Privacy Policy periodically for any
                changes. Your continued use of the Service after any changes
                constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            {/* Contact Us */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                14. Contact Us
              </h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our
                privacy practices, please contact us at:
              </p>
              <p className="text-slate-700 leading-relaxed">
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:hello@frontface.app"
                  className="text-blue-600 hover:underline"
                >
                  hello@frontface.app
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
