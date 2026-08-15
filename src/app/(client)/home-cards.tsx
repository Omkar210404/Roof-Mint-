'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, CheckCircle, Sparkles, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export function HomePropertyCards({ properties }: { properties: any[] }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('roofmint_saved_ids');
      if (stored) {
        setSavedIds(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const toggleSaved = (id: string) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('roofmint_saved_ids', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-navy-800 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-base font-semibold text-navy dark:text-white mb-1">No properties yet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Properties will appear here once they are added by the admin.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(properties.length / pageSize) || 1;
  const paginatedProperties = properties.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <div className="px-4 space-y-3 md:px-8 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 md:space-y-0">
        {paginatedProperties.map((property) => {
          const isSaved = savedIds.includes(property.id);
          return (
            <Link key={property.id} href={`/properties/${property.slug}`}>
              <div className="bg-white dark:bg-navy-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100/60 dark:border-gray-800/60 active:scale-[0.99] md:hover:-translate-y-1 md:h-full">
                <div className="flex md:flex-col h-full">
                  {/* Image Section */}
                  <div className="relative w-[38%] md:w-full min-h-[160px] md:h-[220px]">
                    <Image
                      src={property.coverImage}
                      alt={property.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 480px) 38vw, (max-width: 768px) 50vw, 33vw"
                    />
                    {/* Photo Count Badge */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm">
                      <Camera className="w-3 h-3" />
                      {property.photos}
                    </div>
                    {/* Heart Icon */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSaved(property.id);
                      }}
                      className="absolute top-2 right-2 md:top-3 md:right-3 w-7 h-7 md:w-9 md:h-9 rounded-full bg-white/90 dark:bg-navy-900 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    >
                      <Heart className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isSaved ? 'fill-red-500 text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    </button>
                  </div>

                  {/* Details Section */}
                  <div className="flex-1 p-3 md:p-4 flex flex-col justify-between">
                    <div>
                      {/* Verified & Type Badges */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Verified</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 text-[10px] font-bold">
                          {property.listingTypeLabel || 'For Sale'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
                          {property.ownershipLabel || '1st Owner'}
                        </span>
                      </div>

                      {/* Title & Location */}
                      <h3 className="text-sm md:text-lg font-bold text-navy dark:text-white leading-tight line-clamp-1">{property.title}</h3>
                      <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {property.locality ? `${property.locality}, ${property.city || 'Bangalore'}` : property.location_address}
                        </span>
                      </div>

                      {/* Specs Row */}
                      <div className="flex items-center gap-2 mt-2 md:mt-3 text-[11px] md:text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{property.bhkLabel}</span>
                        {property.areaLabel && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <span>{property.areaLabel}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      {/* Price */}
                      <div className="mt-2 md:mt-4">
                        <span className="text-base md:text-xl font-bold text-primary">{property.formattedPrice}</span>
                        {property.priceLabel && <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 ml-1">{property.priceLabel}</span>}
                      </div>

                      {/* Tags Footer */}
                      <div className="flex flex-wrap gap-1.5 mt-2 md:mt-3">
                        {property.highlights?.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 text-[10px] font-semibold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Client Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 md:px-8 pt-2 pb-4 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, properties.length)} of {properties.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="w-8 h-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-navy-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-navy dark:text-white px-1">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="w-8 h-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-navy-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
