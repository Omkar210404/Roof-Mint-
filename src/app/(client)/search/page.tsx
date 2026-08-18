'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, ArrowLeft, X, Clock, Sparkles, Trash2 } from 'lucide-react';
import { searchProperties } from '../properties/actions';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('roofmint_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed);
      }
    } catch {}
  }, []);

  const saveSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    const updatedRecent = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
    setRecentSearches(updatedRecent);
    localStorage.setItem('roofmint_recent_searches', JSON.stringify(updatedRecent));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('roofmint_recent_searches');
  };

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);
    setSearched(true);
    saveSearch(term.trim());
    const data = await searchProperties(term.trim());
    setResults(data);
    setLoading(false);
  }, [recentSearches]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  return (
    <div className="bg-background min-h-screen max-w-7xl mx-auto pb-8">
      {/* Header with Search (Sticks right below main header) */}
      <div className="sticky top-14 md:top-16 z-40 bg-white dark:bg-navy-900 border-b border-gray-100/60 dark:border-gray-800/60 px-4 py-3 md:px-8 shadow-xs">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link href="/" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-gray-800 dark:text-gray-200" />
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              autoFocus
              type="text"
              placeholder="Search by location, project name, locality, or property type..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 md:h-12 pl-10 pr-9 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setSearched(false); setResults([]); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button type="submit" className="h-10 md:h-12 px-5 md:px-6 bg-primary text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-colors">
            Search
          </button>
        </form>
      </div>

      {/* Content */}
      <div className="px-4 pt-6 md:px-8 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : searched && results.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-3">
              <Search className="w-7 h-7 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-navy dark:text-white mb-1">No properties found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Try adjusting your search criteria or browse our full listings.</p>
          </div>
        ) : searched && results.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-semibold">{results.length} properties matching &quot;{query}&quot;</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((property) => (
                <Link key={property.id} href={`/properties/${property.slug}`}>
                  <div className="bg-white dark:bg-navy-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100/60 dark:border-gray-800/60 flex md:flex-col md:h-full">
                    <div className="relative w-[35%] md:w-full min-h-[120px] md:h-[200px]">
                      <Image src={property.coverImage} alt={property.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 p-3 md:p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm md:text-base font-bold text-navy dark:text-white line-clamp-1">{property.title}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{property.locality || property.city}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-2 text-xs text-gray-600 dark:text-gray-300">
                          <span className="font-medium">{property.bhkLabel}</span>
                          {property.areaLabel && <><span className="text-gray-300 dark:text-gray-600">|</span><span>{property.areaLabel}</span></>}
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 text-[10px] font-bold">
                            {property.listingTypeLabel || 'For Sale'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
                            {property.ownershipLabel || '1st Owner'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm md:text-lg font-bold text-primary mt-2">{property.formattedPrice}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          /* Pre-search UI (Desktop 2-column grid) */
          <div className="space-y-6 md:space-y-8">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 border border-gray-100/60 dark:border-gray-800/60 shadow-sm md:max-w-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-navy dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Recent Searches
                  </h3>
                  <button onClick={clearRecentSearches} className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map(term => (
                    <button key={term} onClick={() => { setQuery(term); doSearch(term); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-800 text-sm text-gray-700 dark:text-gray-300 font-medium flex items-center justify-between transition-colors">
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        {term}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Search →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Banner */}
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 dark:bg-navy-900 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold">Try Roofmint AI Property Finder</h3>
                  <p className="text-xs md:text-sm text-teal-100 mt-0.5">Let our AI match properties to your exact budget, BHK, and location preferences.</p>
                </div>
              </div>
              <Link href="/onboarding/ai" className="h-10 px-5 bg-white dark:bg-navy-900 text-primary text-xs md:text-sm font-bold rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 flex-shrink-0">
                Launch AI Search ✨
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
