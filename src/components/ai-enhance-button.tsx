'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

type FieldType = 'title' | 'description' | 'notification';

// Reusable across both controlled inputs (value/onEnhanced) and uncontrolled
// ones bound via a ref (getValue reads ref.current.value, setValue writes it
// back) — property-form.tsx's Basic Info fields are plain uncontrolled
// inputs read via FormData at submit time, so a ref is the natural fit there
// without restructuring the whole form into React state.
export function AiEnhanceButton({
  getValue, setValue, fieldType, className,
}: {
  getValue: () => string;
  setValue: (text: string) => void;
  fieldType: FieldType;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    const current = getValue().trim();
    if (!current || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: current, fieldType }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'Could not enhance text');
      setValue(result.enhanced);
    } catch (err: any) {
      setError(err?.message || 'Could not enhance text');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className || "text-[11px] font-semibold text-primary hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {loading ? 'Enhancing…' : 'Enhance with AI'}
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </span>
  );
}
