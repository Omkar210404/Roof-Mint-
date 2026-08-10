'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, X, Building2, MapPin, Maximize, Trash2, Plus, Sparkles } from 'lucide-react';
import { getPublicProperties } from '../properties/actions';

export default function ComparePage() {
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicProperties().then(data => {
      setAllProperties(data);
      // Load saved compare IDs from localStorage or default to first 2 properties
      try {
        const stored = localStorage.getItem('roofmint_compare_ids');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedIds(parsed.slice(0, 3));
            setLoading(false);
            return;
          }
        }
      } catch {}
      // Fallback: pick first 2 properties if available
      if (data.length >= 2) {
        setSelectedIds([data[0].id, data[1].id]);
      } else if (data.length === 1) {
        setSelectedIds([data[0].id]);
      }
      setLoading(false);
    });
  }, []);

  const handleSelectProperty = (slotIdx: number, newId: string) => {
    const updated = [...selectedIds];
    updated[slotIdx] = newId;
    setSelectedIds(updated);
    try {
      localStorage.setItem('roofmint_compare_ids', JSON.stringify(updated));
    } catch {}
  };

  const removeProperty = (idToRemove: string) => {
    const updated = selectedIds.filter(id => id !== idToRemove);
    setSelectedIds(updated);
    try {
      localStorage.setItem('roofmint_compare_ids', JSON.stringify(updated));
    } catch {}
  };

  const addPropertySlot = () => {
    if (selectedIds.length >= 3) return;
    const available = allProperties.find(p => !selectedIds.includes(p.id));
    if (available) {
      const updated = [...selectedIds, available.id];
      setSelectedIds(updated);
      try {
        localStorage.setItem('roofmint_compare_ids', JSON.stringify(updated));
      } catch {}
    }
  };

  const comparedProperties = selectedIds
    .map(id => allProperties.find(p => p.id === id))
    .filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-12">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-navy-900 border-b border-gray-100/60 dark:border-gray-800/60 px-4 py-3 md:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-800 dark:text-gray-200" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-navy dark:text-white">Compare Properties</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Side-by-side comparison (up to 3 properties)</p>
            </div>
          </div>

          {selectedIds.length < 3 && allProperties.length > selectedIds.length && (
            <button
              onClick={addPropertySlot}
              className="h-9 px-3 bg-teal-50 dark:bg-teal-950/40 text-primary text-xs font-bold rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Property
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-6 md:px-8 max-w-7xl mx-auto">
        {comparedProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm p-6 text-center">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-lg font-bold text-navy dark:text-white">No properties selected</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">Select properties to compare specs, prices, and amenities side by side.</p>
            <Link href="/" className="h-10 px-5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors inline-flex items-center justify-center">
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[700px] bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              {/* Header Cards Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-stretch bg-gray-50/50 dark:bg-navy-800">
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Features</span>
                  <p className="text-sm font-bold text-navy dark:text-white mt-1">Comparing {comparedProperties.length} Properties</p>
                </div>

                {comparedProperties.map((p, idx) => (
                  <div key={p.id} className="bg-white dark:bg-navy-900 rounded-xl p-3 border border-gray-200/60 dark:border-gray-800/60 shadow-xs relative flex flex-col justify-between">
                    <button
                      onClick={() => removeProperty(p.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative h-28 w-full rounded-lg overflow-hidden mb-2 bg-gray-100 dark:bg-navy-800">
                      <Image src={p.coverImage} alt={p.title} fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-navy dark:text-white line-clamp-1">{p.title}</h3>
                      <p className="text-xs font-extrabold text-primary mt-0.5">{p.formattedPrice}</p>
                    </div>
                    {/* Switch Property Select Dropdown */}
                    <select
                      value={p.id}
                      onChange={(e) => handleSelectProperty(idx, e.target.value)}
                      className="mt-2 w-full h-8 px-2 rounded-md border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-[11px] font-medium text-gray-700 dark:text-gray-300 focus:outline-none"
                    >
                      {allProperties.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.title}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Empty Slot if less than 3 */}
                {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                  <div key={i} className="border-2 border-dashed border-gray-200/60 dark:border-gray-800/60 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50/30 dark:bg-navy-800">
                    <button onClick={addPropertySlot} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                      <Plus className="w-4 h-4" /> Add Property
                    </button>
                  </div>
                ))}
              </div>

              {/* Price Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Starting Price</span>
                {comparedProperties.map(p => (
                  <span key={p.id} className="text-sm font-bold text-primary">{p.formattedPrice}</span>
                ))}
              </div>

              {/* BHK Config Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center bg-gray-50/30 dark:bg-navy-800">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Configuration</span>
                {comparedProperties.map(p => (
                  <span key={p.id} className="text-sm font-semibold text-navy dark:text-white">{p.bhkLabel || '—'}</span>
                ))}
              </div>

              {/* Transaction Purpose Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Listing Type</span>
                {comparedProperties.map(p => (
                  <span key={p.id} className="text-xs font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/40 px-2 py-1 rounded-md inline-block w-fit">
                    {p.listingTypeLabel || 'For Sale'}
                  </span>
                ))}
              </div>

              {/* Ownership Status Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center bg-gray-50/30 dark:bg-navy-800">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ownership</span>
                {comparedProperties.map(p => (
                  <span key={p.id} className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md inline-block w-fit">
                    {p.ownershipLabel || '1st Owner'}
                  </span>
                ))}
              </div>

              {/* Built-up Area Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Super Area</span>
                {comparedProperties.map(p => (
                  <span key={p.id} className="text-sm font-semibold text-gray-700 dark:text-gray-300">{p.areaLabel || '—'}</span>
                ))}
              </div>

              {/* Location Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center bg-gray-50/30 dark:bg-navy-800">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</span>
                {comparedProperties.map(p => (
                  <span key={p.id} className="text-xs font-medium text-gray-600 dark:text-gray-300 line-clamp-2">{p.location_address || p.locality}</span>
                ))}
              </div>

              {/* Furnishing Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Furnishing</span>
                {comparedProperties.map(p => (
                  <span key={p.id} className="text-xs font-semibold text-navy dark:text-white">{p.furnishing || '—'}</span>
                ))}
              </div>

              {/* Possession Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center bg-gray-50/30 dark:bg-navy-800">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Possession</span>
                {comparedProperties.map(p => (
                  <span key={p.id} className="text-xs font-semibold text-gray-700 dark:text-gray-300">{p.possession || '—'}</span>
                ))}
              </div>

              {/* RERA Approval Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">RERA Approved</span>
                {comparedProperties.map(p => (
                  <div key={p.id}>
                    {p.rera_number ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Check className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-4 p-4 gap-4 items-center bg-gray-50/50 dark:bg-navy-800">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Details</span>
                {comparedProperties.map(p => (
                  <Link key={p.id} href={`/properties/${p.slug}`}>
                    <button className="w-full h-9 bg-primary hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors">
                      View Details →
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
