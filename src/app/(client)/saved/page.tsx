'use client';

import { useEffect, useState } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getPublicProperties } from '../properties/actions';
import { HomePropertyCards } from '../home-cards';

export default function SavedPage() {
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicProperties().then(data => {
      setAllProperties(data);
      try {
        const stored = localStorage.getItem('roofmint_saved_ids');
        const ids: string[] = stored ? JSON.parse(stored) : [];
        if (ids.length > 0) {
          const filtered = data.filter((p: any) => ids.includes(p.id));
          setSavedProperties(filtered);
        } else {
          setSavedProperties([]);
        }
      } catch {
        setSavedProperties([]);
      }
      setLoading(false);
    });
  }, []);

  const clearAllSaved = () => {
    localStorage.removeItem('roofmint_saved_ids');
    setSavedProperties([]);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="px-4 pt-4 pb-3 md:px-8 md:pt-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-navy dark:text-white">Saved Properties</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{savedProperties.length} properties saved</p>
        </div>
        {savedProperties.length > 0 && (
          <button
            onClick={clearAllSaved}
            className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {savedProperties.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-navy dark:text-white mb-1">No saved properties yet</h3>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xs md:max-w-sm mb-6">
            Tap the heart icon on any property card to save it here for quick access.
          </p>
          <Link
            href="/"
            className="h-10 md:h-11 px-6 bg-primary hover:bg-teal-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center"
          >
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="pb-8">
          <HomePropertyCards properties={savedProperties} />
        </div>
      )}
    </div>
  );
}
