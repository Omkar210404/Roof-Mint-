'use client';

import { useRouter } from 'next/navigation';
import { Compass } from 'lucide-react';

// Roofmint has no lat/lng on properties yet (see property-detail's coverage
// area sections), so this can't do true distance sorting — it reuses the
// locality/city the client layout already cached from geolocation
// (roofmint_user_location) and runs it through the existing text search,
// same as typing that locality into the search bar yourself.
export function NearbyPropertiesButton() {
  const router = useRouter();

  const handleClick = () => {
    let query = '';
    try {
      const cached = localStorage.getItem('roofmint_user_location');
      if (cached) {
        const { locality, city } = JSON.parse(cached);
        query = locality || city || '';
      }
    } catch {}

    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 hover:bg-gray-50 dark:hover:bg-navy-800 text-navy dark:text-white text-sm font-semibold transition-colors shrink-0"
    >
      <Compass className="w-4 h-4 text-primary" />
      Nearby Properties
    </button>
  );
}
