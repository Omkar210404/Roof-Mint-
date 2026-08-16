'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Printer, Lock, Sparkles, Scale, Database } from 'lucide-react';

export default function TermsPage() {
  const handlePrint = () => {
    window.print();
  };

  const sectionHeading = "text-base font-bold text-navy dark:text-white border-b border-gray-100/60 dark:border-gray-800/60 pb-2";
  const partHeading = "text-lg md:text-xl font-extrabold text-navy dark:text-white";

  return (
    <div className="bg-background min-h-screen pb-16 max-w-4xl mx-auto px-4 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <Link href="/profile" className="w-9 h-9 rounded-xl bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors shrink-0 mt-0.5 sm:mt-0">
            <ArrowLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-navy dark:text-white leading-tight">Terms & Privacy Policy</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Platform rules, verification standards, AI usage, and data privacy — last updated {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="h-9 px-3.5 bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-navy-800 text-navy dark:text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto shadow-xs"
        >
          <Printer className="w-3.5 h-3.5 text-primary" />
          Print / Save PDF
        </button>
      </div>

      {/* Quick jump */}
      <div className="flex gap-2 mb-6">
        <a href="#terms-of-use" className="h-9 px-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-teal-100 transition-colors">
          <Scale className="w-3.5 h-3.5" /> Terms of Use
        </a>
        <a href="#privacy-policy" className="h-9 px-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-teal-100 transition-colors">
          <Database className="w-3.5 h-3.5" /> Privacy Policy
        </a>
      </div>

      <div className="space-y-6">
        {/* Highlight Card */}
        <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 md:p-6 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wide">
            <Shield className="w-4 h-4" /> Roofmint Platform Commitment
          </div>
          <p className="text-xs md:text-sm text-teal-900 dark:text-teal-200 leading-relaxed">
            Roofmint is an AI-assisted property discovery and verified lead-generation platform connecting property seekers with agents, brokers, and developers. Roofmint is not a party to any sale, purchase, rental, or brokerage transaction — we do not collect booking fees, security deposits, or commissions, and we do not sell your personal data to third parties or telemarketers.
          </p>
        </div>

        {/* ══════════════════════ PART A — TERMS OF USE ══════════════════════ */}
        <div id="terms-of-use" className="bg-white dark:bg-navy-900 rounded-2xl p-6 md:p-8 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-8 text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed scroll-mt-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            <h2 className={partHeading}>Part A — Terms of Use</h2>
          </div>

          <section className="space-y-2">
            <h3 className={sectionHeading}>1. Acceptance of Terms</h3>
            <p>
              By creating an account or using Roofmint in any way, you agree to be bound by these Terms of Use and the Privacy Policy below, together with all applicable Indian laws, including the Digital Personal Data Protection (DPDP) Act 2023 and the Real Estate (Regulation and Development) Act, 2016 (RERA). If you do not agree, please do not use the platform. We may update these terms from time to time; continued use after an update means you accept the revised terms.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>2. What Roofmint Is (and Isn't)</h3>
            <p>
              Roofmint is a discovery and lead-connection platform. Listings are supplied by participating developers, builders, and authorized brokerage/agent partners, and enquiries submitted through the platform are routed to the relevant listing agent. Roofmint does not own, broker, underwrite, or guarantee any property transaction, and is not a licensed real estate agent, broker, or financial advisor. Any agreement you enter into — site visits, bookings, payments, tenancy, or sale — is strictly between you and the concerned agent, builder, or property owner.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>3. Property Verification — What "Roofmint Verified" Means</h3>
            <p>
              A <strong>"Roofmint Verified"</strong> badge means our team has performed a basic listing-quality check (photos, pricing, and details supplied by the listing agent appear internally consistent). It is <strong>not</strong> a legal, structural, or title verification, and it is not the same as government RERA registration. Where a listing displays a RERA registration number, that number is entered by the listing agent/admin as provided by the developer and is shown for your reference — it is your responsibility to independently verify it on the relevant state RERA authority's official website before making any financial or legal commitment. RERA registration is state-specific (for example, MahaRERA for Maharashtra, K-RERA for Karnataka); Roofmint labels registration numbers with the relevant state authority where the property's city is identifiable, and falls back to a generic label where it is not — this labeling is informational only and is not itself a certification.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading + " flex items-center gap-2"}>
              <Sparkles className="w-4 h-4 text-primary inline" /> 4. AI Features & Their Limitations
            </h3>
            <p>
              Roofmint uses AI to power search matching, the AI concierge/chat assistant, and the price-appreciation predictor. These features generate estimates and suggestions based on the data available to us at the time — they are <strong>not</strong> financial, legal, investment, or valuation advice, and outputs (including predicted appreciation, price ranges, or recommended properties) may be inaccurate or become outdated. Do not rely on AI-generated output as the sole basis for a purchase, investment, or legal decision — always verify independently and consult a qualified professional where appropriate.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>5. Your Responsibilities</h3>
            <p>You agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate contact details when submitting an enquiry, so agents can genuinely reach you.</li>
              <li>Use the enquiry, chat, and WhatsApp contact features only for genuine property interest — not spam, harassment, or unsolicited marketing directed at agents or other users.</li>
              <li>Not attempt to scrape, bulk-extract, reverse-engineer, or republish Roofmint's listings or data.</li>
              <li>Not attempt to bypass platform security controls, rate limits, or access controls.</li>
              <li>Keep your login credentials confidential; you are responsible for activity under your account.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>6. Agent & Builder Responsibilities</h3>
            <p>
              Agents and builders granted portal access are responsible for the accuracy of the listings, pricing, and RERA details they submit, and for responding to routed enquiries in good faith. Agent portal access is granted at Roofmint's discretion and may be suspended for inaccurate listings, misuse of buyer contact information, or breach of these terms.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>7. Intellectual Property</h3>
            <p>
              The Roofmint name, logo, AI features, UI design, and underlying software are the property of Roofmint. You may not copy, scrape, or commercially reuse platform content or code without written permission.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>8. Limitation of Liability</h3>
            <p>
              Roofmint is provided on an "as available" basis. To the maximum extent permitted by law, Roofmint and its team are not liable for losses arising from reliance on listing information, AI-generated estimates, or third-party conduct (agents, builders, or other users), including any dispute, misrepresentation, or transaction that occurs outside the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>9. Account Suspension & Termination</h3>
            <p>
              We may suspend or terminate access for violation of these terms, fraudulent activity, or misuse of the platform (including spam enquiries or scraping). You may stop using Roofmint and delete your account at any time — see Section 5 of the Privacy Policy below for what deletion does and does not remove.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>10. Governing Law</h3>
            <p>
              These terms are governed by the laws of India, and any dispute is subject to the exclusive jurisdiction of the courts having competence over Roofmint's registered address below.
            </p>
          </section>
        </div>

        {/* ══════════════════════ PART B — PRIVACY POLICY ══════════════════════ */}
        <div id="privacy-policy" className="bg-white dark:bg-navy-900 rounded-2xl p-6 md:p-8 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-8 text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed scroll-mt-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className={partHeading}>Part B — Privacy Policy</h2>
          </div>

          <section className="space-y-2">
            <h3 className={sectionHeading}>1. Information We Collect</h3>
            <p>
              Account details (name, email, phone), search preferences (budget, location, BHK, property type), properties you save or search, and — when you submit an enquiry or WhatsApp contact — the details you provide in that enquiry (name, phone, email, message). We also keep basic activity data needed to operate the platform securely (e.g. sign-in timestamps).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>2. How We Use It</h3>
            <p>
              To personalize AI search matches and recommendations, to route your enquiries to the relevant listing agent, to notify you about your saved properties and enquiry status, and to keep the platform secure (fraud/spam prevention, rate limiting). We do not sell your personal data to third parties or telemarketers.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading + " flex items-center gap-2"}>
              <Lock className="w-4 h-4 text-primary inline" /> 3. Who Sees Your Data
            </h3>
            <p>
              Your contact details are shared only with the specific agent assigned to a property when you submit an enquiry or WhatsApp contact for that property — not with every agent on the platform. Agent and admin access to buyer contact data is restricted at the database level via Row-Level Security (RLS), so an agent can only see leads assigned to them. Admins can access platform data for support, moderation, and legal-compliance purposes.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>4. Third-Party Service Providers</h3>
            <p>
              Roofmint relies on a small number of trusted service providers to operate the platform, and your data may pass through them for the specific purpose described: <strong>Supabase</strong> (database, authentication, and hosting infrastructure) stores your account and platform data, and <strong>Google's Gemini API</strong> powers our AI concierge chat, AI property matching, and price-appreciation predictor — meaning the messages and search context you provide to these AI features are processed by Google's servers to generate a response. These providers process your data only to deliver the corresponding platform feature, under their own data-processing terms; Roofmint does not permit them to sell your data or use it for purposes unrelated to operating Roofmint. Because these providers operate outside India, this involves a cross-border transfer of data, which is permitted under the DPDP Act except to countries the Central Government has restricted.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>5. Data Security</h3>
            <p>
              Data is encrypted in transit (TLS/SSL) and access-controlled through Supabase Row-Level Security. Passwords are never stored in plain text. While we take reasonable technical measures to protect your data, no online platform can guarantee absolute security.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>6. Your Rights, Correction & Consent Withdrawal</h3>
            <p>
              You can download a copy of your data, correct inaccurate details, or delete your account at any time from Profile → Account Settings / Privacy & Security. Deleting your account removes your login, saved properties, search history, and preferences. <strong>Enquiries you've submitted are not deleted</strong> — a lead you sent to an agent is a business record they may still be actively following up on, and it contains no data beyond what you already provided at the time; deleting your account simply unlinks it from your (now-removed) profile. If you'd like a previously submitted enquiry removed as well, contact us at the address below and we will review the request.
            </p>
            <p>
              You may also withdraw your consent for a specific processing activity — for example, AI-based personalization or a particular notification channel — without deleting your whole account, by contacting us at the address below. Withdrawing consent is as simple as giving it, and does not affect the lawfulness of any processing already carried out before withdrawal.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>7. Data Breach Notification</h3>
            <p>
              In the unlikely event of a personal data breach affecting your data, we will notify the Data Protection Board of India and affected users as required under the DPDP Act, describing the nature of the breach and the steps being taken to address it.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>8. Cookies & Local Storage</h3>
            <p>
              We use browser local storage (not third-party ad-tracking cookies) to remember things like your selected location and recently viewed searches, purely to improve your experience on return visits.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>9. Children's Privacy</h3>
            <p>
              Roofmint is intended for users 18 years and older, consistent with the ability to enter into property-related agreements under Indian law. We do not knowingly collect data from minors.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>10. Right to Nominate</h3>
            <p>
              You may nominate another individual to exercise your rights under this policy — including access to or erasure of your data — in the event of your death or incapacity, by contacting us at the address below with the nominee's details.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>11. Changes to This Policy</h3>
            <p>
              We may update this Privacy Policy as the platform evolves. Material changes will be reflected here with an updated date at the top of this page.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className={sectionHeading}>12. Contact Us</h3>
            <p>
              For legal, compliance, or data-privacy questions — including data access or deletion requests:
            </p>
            <div className="bg-gray-50 dark:bg-navy-800 p-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 mt-2 space-y-1 font-mono text-xs">
              <p className="font-bold text-navy dark:text-white flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" /> Roofmint Legal & Compliance Desk</p>
              <p>Email: legal@roofmint.in | support@roofmint.in</p>
              <p>Address: Yashwant Shrushti, Boisar, Maharashtra - 401501</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
