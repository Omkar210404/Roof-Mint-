'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, LayoutGrid, CheckCircle, ArrowRight, Shield, Award, Check } from 'lucide-react';
import { useState } from 'react';

export default function OnboardingPage() {
  const [selectedMode, setSelectedMode] = useState<'ai' | 'browse' | null>('ai');

  return (
    <div className="bg-white dark:bg-navy-900 min-h-[calc(100vh-4rem)] flex items-center justify-center p-0 md:p-6">
      <div className="w-full max-w-[480px] md:max-w-5xl bg-white dark:bg-navy-900 border-0 md:border md:border-gray-200/60 md:rounded-3xl md:shadow-md overflow-hidden flex flex-col md:flex-row md:min-h-[520px]">
        {/* Left Side (Desktop Hero - Clean White Theme) */}
        <div className="hidden md:flex md:w-1/2 bg-white dark:bg-navy-900 p-10 flex-col justify-between border-b md:border-b-0 md:border-r border-gray-100/60 dark:border-gray-800/60 relative">
          <div>
            <Image
              src="/images/logo.png"
              alt="Roofmint"
              width={160}
              height={44}
              className="h-10 w-auto mb-6 object-contain"
              priority
            />
            <div className="inline-flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/40 text-primary border border-teal-100 dark:border-teal-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Shield className="w-3.5 h-3.5" />
              Complete your profile to continue
            </div>
            <h1 className="text-3xl font-extrabold text-navy dark:text-white leading-tight mb-2">
              Let&apos;s find your perfect home
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Tell us your preferences to get 100% personalized real estate recommendations powered by Roofmint AI.
            </p>
          </div>

          <div className="my-6 flex justify-center">
            <Image
              src="/images/home2.png"
              alt="AI Home Search"
              width={260}
              height={160}
              className="w-full max-w-[240px] h-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-gray-100/60 dark:border-gray-800/60">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-semibold">
              <CheckCircle className="w-4 h-4 text-primary" /> RERA Approved
            </div>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-semibold">
              <Award className="w-4 h-4 text-primary" /> Top Builders
            </div>
          </div>
        </div>

        {/* Mobile Header (Mobile Only) */}
        <div className="md:hidden px-6 pt-6 text-center bg-white dark:bg-navy-900">
          <Image
            src="/images/logo.png"
            alt="Roofmint"
            width={140}
            height={38}
            className="h-9 w-auto mx-auto mb-4 object-contain"
            priority
          />
          <div className="inline-flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/40 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <Shield className="w-3.5 h-3.5" />
            Complete your profile to continue
          </div>
          <h1 className="text-2xl font-bold text-navy dark:text-white mb-1.5">Let&apos;s find your perfect home</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tell us your preferences so we can show you the best matches</p>

          <div className="flex justify-center py-4">
            <Image
              src="/images/home2.png"
              alt="AI Home Search"
              width={220}
              height={140}
              className="w-full max-w-[180px] h-auto object-contain"
            />
          </div>
        </div>

        {/* Right Side / Selection Options */}
        <div className="px-6 pb-6 md:p-10 md:w-1/2 flex flex-col justify-between bg-white dark:bg-navy-900">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-navy dark:text-white mb-1">Select Search Mode</h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-6">Choose how you&apos;d like to start exploring properties</p>

            {/* Mode Cards */}
            <div className="space-y-3.5">
              {/* AI Mode Card */}
              <button
                onClick={() => setSelectedMode('ai')}
                className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 ${
                  selectedMode === 'ai'
                    ? 'border-primary bg-teal-50/50 dark:bg-teal-950/40 shadow-xs'
                    : 'border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedMode === 'ai' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm md:text-base font-bold text-navy dark:text-white">AI Recommendation Mode</h3>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">RECOMMENDED</span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Answer 3 quick questions and let AI find your dream home with 100% accurate match scoring</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedMode === 'ai' ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-700'
                  }`}>
                    {selectedMode === 'ai' && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                </div>
              </button>

              {/* Browse Mode Card */}
              <button
                onClick={() => setSelectedMode('browse')}
                className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 ${
                  selectedMode === 'browse'
                    ? 'border-primary bg-teal-50/50 dark:bg-teal-950/40 shadow-xs'
                    : 'border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedMode === 'browse' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    <LayoutGrid className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex-1 pr-2">
                    <h3 className="text-sm md:text-base font-bold text-navy dark:text-white">Browse All Listings</h3>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Explore all verified developer projects directly using custom filters</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedMode === 'browse' ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-700'
                  }`}>
                    {selectedMode === 'browse' && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Continue Button */}
          <div className="pt-6 md:pt-8">
            <Link
              href={selectedMode === 'ai' ? '/onboarding/ai' : '/'}
              className="block w-full py-3.5 md:py-4 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm text-center text-sm md:text-base"
            >
              <span className="flex items-center justify-center gap-2">
                {selectedMode === 'ai' ? 'Set Up AI Preferences' : 'Browse All Properties'}
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
