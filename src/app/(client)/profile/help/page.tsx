'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, ChevronDown, MessageSquare, Phone, Mail, Clock, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { submitFeedback } from './actions';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: 'AI Matching',
    question: 'How does the Roofmint AI Home Matchmaker work?',
    answer: 'Our AI concierge parses your preferred budget, BHK configuration, locality, transaction type (Sale/Rent/Resale), and must-have amenities. It scores our database of verified developer projects and presents 3-5 high-relevance matches instead of endless scrolling.',
  },
  {
    category: 'Verification & RERA',
    question: 'Are all property listings verified?',
    answer: 'Yes! Every property on Roofmint is vetted against Karnataka RERA registration records (PRM/KA/RERA/...) and physical builder project specs before receiving the "Verified" badge.',
  },
  {
    category: 'Privacy',
    question: 'Is my contact information shared with third-party spammers?',
    answer: 'Never. Roofmint follows strict agent confidentiality protocols. Your contact info is only routed to the mapped primary agent when you explicitly click "Enquire Now" or request a site visit.',
  },
  {
    category: 'Site Visits',
    question: 'How do I schedule a site visit for a property?',
    answer: 'Simply open any property detail page, click "Schedule Site Visit" or "Enquire Now", and submit your contact details. Our dedicated concierge team will reach out within 24 hours with free cab assistance.',
  },
  {
    category: 'Transactions',
    question: 'Does Roofmint charge any booking fee online?',
    answer: 'No online booking token or hidden platform fee is collected on Roofmint v1. We connect high-intent home buyers and tenants directly with builders and verified property agents for transparent offline closing.',
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('General Query');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot — invisible to real visitors, filled only by bots that
    // auto-fill every field. Silently "succeed" without submitting.
    const honeypot = (e.currentTarget as HTMLFormElement).elements.namedItem('company_website') as HTMLInputElement | null;
    if (honeypot?.value.trim()) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append('name', name);
    fd.append('phone', phone);
    fd.append('email', email);
    fd.append('category', category);
    fd.append('message', message);

    try {
      await submitFeedback(fd);
      setSubmitted(true);
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit support request.');
    }
    setSubmitting(false);
  };

  const filteredFaqs = faqs.filter(
    f => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-background min-h-screen pb-16 max-w-4xl mx-auto px-4 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-9 h-9 rounded-xl bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-navy dark:text-white">Help & Support</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Frequently asked questions and direct support concierge</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Contact Channels Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="https://wa.me/917096867438?text=Hi%20Roofmint%20Support"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl p-4 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">WhatsApp Support</p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">+91 70968 67438</p>
            </div>
          </a>

          <a
            href="mailto:support@roofmint.in"
            className="bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 rounded-2xl p-4 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-950">Email Assistance</p>
              <p className="text-xs text-teal-700 font-semibold mt-0.5">support@roofmint.in</p>
            </div>
          </a>

          <div className="bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-navy dark:text-white">Working Hours</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Mon–Sat: 9 AM–8 PM IST</p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100/60 dark:border-gray-800/60 pb-3">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" /> Frequently Asked Questions
            </h2>
            <input
              type="text"
              placeholder="Search FAQs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 px-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-xs bg-gray-50 dark:bg-navy-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredFaqs.map((faq, idx) => (
              <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full text-left flex items-center justify-between gap-3 font-semibold text-sm text-navy dark:text-white hover:text-primary transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${openIndex === idx ? 'rotate-180 text-primary' : ''}`} />
                </button>
                {openIndex === idx && (
                  <p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50/70 dark:bg-navy-800 p-3.5 rounded-xl border border-gray-100/60 dark:border-gray-800/60">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support Intake Form */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide border-b border-gray-100/60 dark:border-gray-800/60 pb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Send Us a Message
          </h2>

          {submitted ? (
            <div className="p-6 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
              <h3 className="text-sm font-bold text-teal-900">Support Ticket Created!</h3>
              <p className="text-xs text-teal-700">Thank you for reaching out. Our concierge team will review your query and respond shortly.</p>
              <button onClick={() => setSubmitted(false)} className="mt-2 text-xs font-bold text-primary hover:underline">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <input
                type="text"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] w-px h-px opacity-0"
              />
              {error && <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-900">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Rohit Sharma"
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 99887 76655"
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="rohit@example.com"
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Topic Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-xs bg-white dark:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option>General Query</option>
                    <option>Property Enquiry</option>
                    <option>Site Visit Request</option>
                    <option>RERA / Legal Clarification</option>
                    <option>Feedback & Suggestions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Message Details</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your issue or request in detail..."
                  className="w-full p-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 bg-primary hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {submitting ? 'Sending...' : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
