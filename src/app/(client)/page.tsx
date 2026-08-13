import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { getPublicProperties } from './properties/actions';
import { HomePropertyCards } from './home-cards';
import { FloatingAIButton } from '@/components/floating-ai-button';

export default async function HomePage() {
  const properties = await getPublicProperties(12);

  return (
    <div className="bg-background min-h-screen relative">
      {/* 🌟 TOP AI Search Hero Banner (Prominently placed at the top) */}
      <div className="px-4 pt-4 pb-2 md:px-8 md:pt-6 md:pb-4">
        <div className="bg-gradient-to-r from-navy via-slate-900 to-teal-950 text-white rounded-2xl p-4 md:p-6 shadow-md border border-teal-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start sm:items-center gap-3 md:gap-3.5 relative z-10 w-full md:w-auto">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center flex-shrink-0 shadow-inner mt-0.5 sm:mt-0">
              <Image src="/images/roofmintai.png" alt="AI" width={36} height={36} className="w-8 h-8 md:w-10 md:h-10 rounded-full" priority />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-sm md:text-xl font-extrabold text-white leading-tight">Find Your Dream Home with AI</h2>
                <span className="inline-flex items-center text-[10px] font-extrabold bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0">
                  AI Finder ✨
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 leading-normal">
                Answer 3 quick questions and get 100% personalized property matches
              </p>
            </div>
          </div>

          <Link
            href="/onboarding/ai"
            className="h-11 px-5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-teal-500/25 flex items-center gap-2 shrink-0 active:scale-[0.98] relative z-10 w-full md:w-auto justify-center"
          >
            <Sparkles className="w-4 h-4 text-teal-200" />
            Launch AI Matchmaker
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Section Header */}
      <div className="px-4 pt-2 pb-2 md:px-8 md:pt-4 md:pb-3">
        <h2 className="text-lg md:text-2xl font-bold text-navy dark:text-white">Verified Listings</h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Explore available properties in your area</p>
      </div>

      {/* Info Bar */}
      <div className="px-4 pb-3 md:px-8 md:pb-5">
        <div className="flex items-center justify-between bg-teal-50/80 dark:bg-teal-950/40 rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 border border-teal-100/80 dark:border-teal-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            <span className="text-xs md:text-sm font-semibold text-teal-800 uppercase tracking-wide">
              Showing {properties.length} verified properties
            </span>
          </div>
          <Link href="/onboarding/ai" className="text-[10px] md:text-xs font-semibold text-primary hover:text-teal-700 uppercase tracking-wide">
            Update Preferences
          </Link>
        </div>
      </div>

      {/* Property Cards (client component for interactivity) */}
      <HomePropertyCards properties={properties} />

      {/* 🚀 Floating AI Matchmaker Button (Auto-hides after 8s so content behind is accessible) */}
      <FloatingAIButton />
    </div>
  );
}
