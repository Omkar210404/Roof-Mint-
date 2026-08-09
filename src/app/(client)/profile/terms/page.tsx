'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Shield, CheckCircle2, Printer, Lock } from 'lucide-react';

export default function TermsPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-background min-h-screen pb-16 max-w-4xl mx-auto px-4 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <Link href="/profile" className="w-9 h-9 rounded-xl bg-white dark:bg-navy-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 mt-0.5 sm:mt-0">
            <ArrowLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-navy dark:text-white leading-tight">Terms & Privacy Policy</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Legal agreements, platform rules, and data privacy policies</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="h-9 px-3.5 bg-white dark:bg-navy-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 text-navy dark:text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto shadow-xs"
        >
          <Printer className="w-3.5 h-3.5 text-primary" />
          Print / Save PDF
        </button>
      </div>

      <div className="space-y-6">
        {/* Highlight Card */}
        <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 md:p-6 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wide">
            <Shield className="w-4 h-4" /> Roofmint Platform Commitment
          </div>
          <p className="text-xs md:text-sm text-teal-900 leading-relaxed">
            Roofmint operates strictly as a verified lead generation and AI property discovery engine for agencies, builders, and property seekers. We do not collect online transaction booking fees, nor do we sell user data to unverified telemarketers.
          </p>
        </div>

        {/* Legal Sections */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-8 text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              1. Acceptance of Terms & Service Scope
            </h2>
            <p>
              By accessing Roofmint, you agree to comply with all applicable local, state, and national laws in India, including the Digital Personal Data Protection (DPDP) Act 2023. Roofmint provides a curated platform displaying residential and commercial real estate inventory (Apartments, Villas, Plots, Penthouse, Commercial) for Sale, Rent, and Resale.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              2. Listing Accuracy & RERA Compliance Disclaimer
            </h2>
            <p>
              All property listings displayed on Roofmint are populated directly from participating developers, builders, and authorized brokerage partners. RERA registration numbers (e.g., KA RERA) are displayed for buyer verification. While Roofmint performs routine validation, buyers and tenants are advised to conduct independent due diligence before signing property agreements or making financial transfers.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary inline" /> 3. Strict Agent PII Confidentiality Guarantee
            </h2>
            <p>
              Agent contact details and developer commission notes stored within the Roofmint platform are strictly confidential and restricted to agency administrators via Row Level Security (RLS). When a user submits an enquiry or requests a site visit, contact details are routed exclusively to the assigned primary agent for that specific property.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              4. User Data Collection & Privacy Policy
            </h2>
            <p>
              We collect user preferences (budget, location, BHK config, transaction type, ownership preference) to personalize AI property matches. Users retain full rights to update preferences in Account Settings, download a JSON copy of their data, or request account deletion at any time under Privacy & Security options.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              5. Intellectual Property & Brand Usage
            </h2>
            <p>
              The Roofmint name, logo, AI Matchmaker algorithm, UI layouts, and branding assets are exclusive intellectual property of Roofmint Realty. Scraping or re-publishing Roofmint inventory for third-party commercial portals without written authorization is strictly prohibited.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              6. Governing Law & Support Contact
            </h2>
            <p>
              These terms shall be governed by the laws of India. For legal or compliance inquiries, please contact:
            </p>
            <div className="bg-gray-50 dark:bg-navy-800 p-4 rounded-xl border border-gray-200 dark:border-gray-800 mt-2 space-y-1 font-mono text-xs">
              <p className="font-bold text-navy dark:text-white">Roofmint Legal & Compliance Desk</p>
              <p>Email: legal@roofmint.in | support@roofmint.in</p>
              <p>Address: Yashwant Shrushti, Boisar, Maharashtra - 401501</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
