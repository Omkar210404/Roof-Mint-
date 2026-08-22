'use client';

import { useState } from 'react';
import { Sparkles, TrendingUp, Compass, ArrowUpRight, Loader2, ShieldAlert } from 'lucide-react';

interface PropertyProps {
  property: {
    title: string;
    location_address?: string;
    locality?: string;
    city?: string;
    price: number;
    formattedPrice: string;
    property_type?: string;
    bhk?: number;
  };
}

export function AppreciationPredictor({ property }: PropertyProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/predict-appreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: property.title,
          location_address: property.location_address,
          locality: property.locality,
          city: property.city,
          price: property.price,
          property_type: property.property_type,
          bhk: property.bhk,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error(result?.error || "You've hit the analysis limit for now — try again in a few minutes.");
        throw new Error(result?.error || 'Failed to load AI predictions');
      }
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err?.message && err.message !== 'Failed to fetch' ? err.message : 'Could not connect to AI service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-navy to-slate-800 rounded-2xl p-5 md:p-6 text-white shadow-lg relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">5-Year Price & Growth Predictor</h3>
              <span className="text-[10px] font-extrabold bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                Roofmint AI
              </span>
            </div>
            <p className="text-xs text-slate-400">Location-based market appreciation forecast (2026 - 2031)</p>
          </div>
        </div>
      </div>

      {!data && !loading && (
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 text-center relative z-10">
          <p className="text-xs md:text-sm text-slate-300 mb-4 max-w-md mx-auto">
            Get instant AI analysis of future infrastructure projects, metro developments, and projected 5-year capital appreciation for <span className="font-semibold text-white">{property.locality || property.city || 'this area'}</span>.
          </p>
          <button
            onClick={fetchPrediction}
            className="h-11 px-6 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold text-xs md:text-sm rounded-xl transition-all shadow-md hover:shadow-teal-500/25 inline-flex items-center gap-2 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            Analyze 5-Year Price Forecast ✨
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-slate-800/60 rounded-xl p-8 border border-slate-700/60 flex flex-col items-center justify-center text-center relative z-10 space-y-3">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
          <div>
            <p className="text-sm font-bold text-white">Analyzing Location Development & Historical CAGR...</p>
            <p className="text-xs text-slate-400 mt-0.5">Evaluating upcoming metro lines, tech parks, and commercial hubs for {property.locality || property.city}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs text-red-300 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchPrediction} className="underline font-bold text-white hover:text-red-200">
            Retry
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-4 relative z-10 animate-in fade-in duration-300">
          {/* Main Price Numbers Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-800/80 rounded-xl p-4 border border-slate-700/70">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Current Price (2026)</p>
              <p className="text-lg md:text-xl font-bold text-slate-200 mt-1">{property.formattedPrice}</p>
            </div>
            <div className="border-l border-slate-700/70 pl-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold text-teal-400 uppercase tracking-wide">Est. Value (2031)</p>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded">
                  <ArrowUpRight className="w-3 h-3" /> +{data.growthPercentage}%
                </span>
              </div>
              <p className="text-xl md:text-2xl font-extrabold text-white mt-0.5">{data.estimatedPriceFormatted}</p>
              <p className="text-[10px] text-slate-400 font-medium">CAGR: {data.cagr}</p>
            </div>
          </div>

          {/* Growth Drivers Pills */}
          {data.keyDrivers?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-teal-400" /> Key Growth Drivers
              </p>
              <div className="flex flex-wrap gap-2">
                {data.keyDrivers.map((driver: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs font-semibold bg-slate-800 border border-slate-700/80 text-teal-300 px-3 py-1 rounded-lg"
                  >
                    🚀 {driver}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Market Analysis Paragraph */}
          {data.insights && (
            <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/50 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-teal-300 mb-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Market Insights
              </p>
              {data.insights}
            </div>
          )}

          {/* Recalculate button */}
          <div className="text-right pt-1">
            <button
              onClick={fetchPrediction}
              className="text-[11px] text-slate-400 hover:text-teal-300 font-medium transition-colors inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Refresh AI Valuation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
