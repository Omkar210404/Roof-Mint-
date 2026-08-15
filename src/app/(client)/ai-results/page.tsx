import { Info, ArrowLeft, ArrowRight, SearchX, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { getAIFilteredProperties } from '../onboarding/actions';
import { HomePropertyCards } from '../home-cards';

export default async function AIResultsPage() {
  const { properties, filters } = await getAIFilteredProperties();

  const hasFilters = !!filters;
  const filterSummary = filters ? [
    filters.pref_bhk ? `${filters.pref_bhk} BHK` : null,
    filters.pref_property_type || null,
    filters.pref_location || null,
    filters.pref_budget_min && filters.pref_budget_max
      ? `₹${(filters.pref_budget_min / 100000).toFixed(0)}L - ₹${filters.pref_budget_max >= 10000000 ? (filters.pref_budget_max / 10000000).toFixed(1) + 'Cr' : (filters.pref_budget_max / 100000).toFixed(0) + 'L'}`
      : null,
    filters.pref_furnishing && filters.pref_furnishing !== 'No Preference' ? filters.pref_furnishing : null,
  ].filter(Boolean) : [];

  return (
    <div className="bg-background min-h-screen max-w-[480px] md:max-w-none mx-auto pb-6">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-navy-900 border-b border-gray-100/60 dark:border-gray-800/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/onboarding" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-800 dark:text-gray-200" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-navy dark:text-white">
              {properties.length > 0 ? 'Here are your personalized listings ✨' : 'Search Results'}
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Based on your AI preferences</p>
          </div>
        </div>
      </div>

      {/* Applied Filters */}
      {filterSummary.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl px-3 py-2.5">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Filtering by: </span>
              <span className="text-xs text-blue-600 dark:text-blue-400">{filterSummary.join(' • ')}</span>
            </div>
          </div>
        </div>
      )}

      {properties.length > 0 ? (
        <>
          {/* Count */}
          <div className="px-4 pb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{properties.length} properties match your preferences</p>
          </div>

          {/* Property Cards */}
          <HomePropertyCards properties={properties} />

          {/* Action Buttons */}
          <div className="px-4 mt-6 space-y-3">
            <Link href="/onboarding/ai"
              className="block w-full py-3 bg-white dark:bg-navy-900 border-2 border-primary text-primary font-semibold rounded-xl text-center hover:bg-teal-50 transition-colors text-sm">
              Refine Preferences
            </Link>
          </div>
        </>
      ) : (
        /* ── Honest "No Results" State ──────────────────────────────── */
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-5">
            <SearchX className="w-9 h-9 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-navy dark:text-white mb-2 text-center">
            Couldn&apos;t find properties matching your needs
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-8 leading-relaxed">
            We searched our entire database but couldn&apos;t find properties that match all your preferences.
            {filterSummary.length > 0 && (
              <span className="block mt-2 text-gray-400 dark:text-gray-500 text-xs">
                You searched for: {filterSummary.join(', ')}
              </span>
            )}
          </p>

          <div className="w-full max-w-sm space-y-3">
            {/* Refine */}
            <Link href="/onboarding/ai"
              className="block w-full py-3.5 bg-primary hover:bg-teal-700 text-white font-semibold rounded-xl text-center transition-colors text-sm shadow-sm">
              <span className="flex items-center justify-center gap-2">
                Try Different Preferences
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            {/* Switch to normal */}
            <Link href="/"
              className="block w-full py-3.5 bg-white dark:bg-navy-900 border-2 border-gray-200/60 dark:border-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-center hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors text-sm">
              <span className="flex items-center justify-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Switch to Normal Browsing
              </span>
            </Link>
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-6 text-center max-w-xs">
            New properties are added daily. You can also try broadening your budget range or location preference.
          </p>
        </div>
      )}
    </div>
  );
}
