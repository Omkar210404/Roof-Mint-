'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Send, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { saveOnboardingPreferences, getLiveMatchCount } from '../actions';
import { createClient } from '@/utils/supabase/client';

const questions = [
  {
    id: 'pref_budget',
    question: "What's your budget range?",
    subtitle: "Drag to set a range, or enter an exact amount",
    type: 'range',
  },
  {
    id: 'pref_bhk',
    question: "How many bedrooms do you need?",
    subtitle: "Choose your ideal configuration",
    type: 'grid',
    options: ['1', '2', '3', '4', '5'],
    labels: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'],
  },
  {
    id: 'pref_location',
    question: "Which area do you prefer?",
    subtitle: "Type your preferred locality, neighborhood, or city",
    type: 'text_input',
    placeholder: "e.g. Whitefield, Sarjapur Road, HSR Layout...",
  },
  {
    id: 'pref_property_type',
    question: "What type of property are you looking for?",
    subtitle: "Choose property type",
    type: 'grid',
    options: ['Apartment', 'Villa', 'Plot', 'Penthouse', 'Row House', 'Commercial'],
    labels: ['Apartment', 'Villa', 'Plot', 'Penthouse', 'Row House', 'Commercial'],
  },
  {
    id: 'pref_listing_type',
    question: "Are you looking to Buy, Rent, or find Resale properties?",
    subtitle: "Choose transaction type",
    type: 'grid',
    options: ['Sale', 'Rent', 'Resale', 'Any'],
    labels: ['Buy', 'Rent', 'Resale', 'Any / Open'],
  },
  {
    id: 'pref_ownership',
    question: "What is your preferred ownership status?",
    subtitle: "Choose ownership preference",
    type: 'grid',
    options: ['1st Owner', '2nd Owner', '3rd Owner', 'No Preference'],
    labels: ['1st Owner / Builder Direct', '2nd Owner', '3rd Owner', 'No Preference'],
  },
  {
    id: 'pref_timeline',
    question: "When do you plan to move in?",
    subtitle: "Choose your timeline",
    type: 'grid',
    options: ['Ready to Move', 'Within 6 months', 'Within 1 year', '1-2 years', 'Just Exploring'],
    labels: ['Ready to Move', 'Within 6 months', 'Within 1 year', '1-2 years', 'Just Exploring'],
  },
  {
    id: 'pref_furnishing',
    question: "What furnishing do you prefer?",
    subtitle: "Select furnishing status",
    type: 'grid',
    options: ['Full', 'Semi', 'Unfurnished', 'No Preference'],
    labels: ['Fully Furnished', 'Semi Furnished', 'Unfurnished', 'No Preference'],
  },
  {
    id: 'pref_amenities',
    question: "Any must-have amenities?",
    subtitle: "Select all that apply",
    type: 'multi',
    options: ['Swimming Pool', 'Gym', 'Parking', 'Clubhouse', 'Garden', 'Security', 'Power Backup', 'Lift'],
    labels: ['Swimming Pool', 'Gym', 'Parking', 'Clubhouse', 'Garden', 'Security', 'Power Backup', 'Lift'],
  },
  {
    id: 'pref_notes',
    question: "Any other preferences?",
    subtitle: "Tell us anything else you're looking for",
    type: 'textarea',
  },
];

const BUDGET_SLIDER_MIN = 1000000; // 10L
const BUDGET_SLIDER_MAX = 50000000; // 5Cr — the top of the slider means "5Cr or more"
const BUDGET_STEP = 500000; // 5L

function formatINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(v % 10000000 === 0 ? 0 : 1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export default function AIQuestionnairePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [budgetMin, setBudgetMin] = useState(3000000); // 30L
  const [budgetMax, setBudgetMax] = useState(10000000); // 1Cr
  const [budgetManual, setBudgetManual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [matchCountLoading, setMatchCountLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, []);

  const question = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  // Live match counter — only kicks in once they've answered a few
  // questions (from step 4 onward, i.e. budget/BHK/location already given)
  // so it feels like a real signal, not "247 properties" before they've
  // said anything. Debounced so dragging the slider doesn't fire per pixel.
  useEffect(() => {
    if (currentStep < 3) {
      setMatchCount(null);
      return;
    }
    setMatchCountLoading(true);
    const timer = setTimeout(async () => {
      const count = await getLiveMatchCount({
        budgetMin,
        budgetMax: budgetMax >= BUDGET_SLIDER_MAX ? null : budgetMax,
        bhk: answers.pref_bhk ? parseInt(answers.pref_bhk as string) : null,
        propertyType: (answers.pref_property_type as string) || null,
        listingType: (answers.pref_listing_type as string) || null,
        ownership: (answers.pref_ownership as string) || null,
        furnishing: (answers.pref_furnishing as string) || null,
      });
      setMatchCount(count);
      setMatchCountLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentStep, budgetMin, budgetMax, answers.pref_bhk, answers.pref_property_type, answers.pref_listing_type, answers.pref_ownership, answers.pref_furnishing]);

  const handleSelect = (option: string) => {
    if (question.type === 'multi') {
      const current = (answers[question.id] as string[]) || [];
      if (current.includes(option)) {
        setAnswers({ ...answers, [question.id]: current.filter(o => o !== option) });
      } else {
        setAnswers({ ...answers, [question.id]: [...current, option] });
      }
    } else {
      setAnswers({ ...answers, [question.id]: option });
    }
  };

  const isSelected = (option: string) => {
    const answer = answers[question.id];
    if (Array.isArray(answer)) return answer.includes(option);
    return answer === option;
  };

  const canProceed = () => {
    if (question.type === 'textarea') return true;
    if (question.type === 'text_input') return true;
    if (question.type === 'range') return budgetMax > budgetMin;
    const answer = answers[question.id];
    if (Array.isArray(answer)) return answer.length > 0;
    return !!answer;
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError(null);

    // Slider maxes out at 5Cr meaning "5Cr or more" — no upper cap in that case.
    const budgetMaxVal = budgetMax >= BUDGET_SLIDER_MAX ? null : budgetMax;

    // Signed-in: save to their profile as before, then show results.
    if (isLoggedIn) {
      const fd = new FormData();
      fd.append('full_name', '');
      fd.append('phone', '');
      fd.append('pref_budget_min', String(budgetMin));
      fd.append('pref_budget_max', budgetMaxVal ? String(budgetMaxVal) : '');

      Object.entries(answers).forEach(([key, val]) => {
        if (key === 'pref_amenities') {
          fd.append(key, JSON.stringify(val));
        } else if (Array.isArray(val)) {
          fd.append(key, val.join(','));
        } else {
          fd.append(key, val);
        }
      });

      const result = await saveOnboardingPreferences(fd);

      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      router.push('/ai-results');
      return;
    }

    // Not signed in — rather than a dead-end "not logged in" error after
    // 10 questions, show results computed straight from these answers.
    // Nothing gets saved; they're only asked to sign in if they later try
    // to save a property or send an enquiry.
    const params = new URLSearchParams({ guest: '1', budget_min: String(budgetMin) });
    if (budgetMaxVal) params.set('budget_max', String(budgetMaxVal));
    if (answers.pref_bhk) params.set('bhk', String(answers.pref_bhk));
    if (answers.pref_property_type) params.set('property_type', String(answers.pref_property_type));
    if (answers.pref_listing_type) params.set('listing_type', String(answers.pref_listing_type));
    if (answers.pref_location) params.set('location', String(answers.pref_location));
    if (answers.pref_ownership) params.set('ownership', String(answers.pref_ownership));
    if (answers.pref_furnishing) params.set('furnishing', String(answers.pref_furnishing));

    router.push(`/ai-results?${params.toString()}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] bg-white dark:bg-navy-900 md:bg-gray-50/50 flex items-start md:items-center justify-center p-0 md:p-6 md:overflow-hidden">
      <div className="w-full max-w-[480px] md:max-w-5xl bg-white dark:bg-navy-900 md:rounded-2xl md:border md:border-gray-100/60 md:shadow-sm overflow-hidden flex flex-col md:flex-row md:h-full md:max-h-[540px]">
        {/* Left Side (Desktop Progress & Assistant Info) */}
        <div className="hidden md:flex w-1/3 bg-teal-50/40 dark:bg-teal-950/40 p-8 text-navy dark:text-white flex-col justify-between relative overflow-hidden border-r border-gray-100/60 dark:border-gray-800/60">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center border border-teal-200 dark:border-teal-800">
                <Image src="/images/roofmintai.png" alt="AI" width={36} height={36} className="w-9 h-9 rounded-full object-cover" priority />
              </div>
              <div>
                <h3 className="font-extrabold text-navy dark:text-white text-base">Roofmint AI</h3>
                <p className="text-xs text-primary font-semibold">Matchmaker Assistant</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Questionnaire Progress</p>
              <div className="space-y-2">
                {questions.map((q, idx) => {
                  const isDone = idx < currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div
                      key={q.id}
                      className={`flex items-center gap-2.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
                        isCurrent
                          ? 'bg-primary text-white shadow-xs'
                          : isDone
                          ? 'text-teal-800 bg-teal-100/60 dark:bg-teal-900/40'
                          : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isCurrent ? 'bg-white dark:bg-navy-900 text-primary font-bold' : isDone ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-navy-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-3 h-3 text-white" /> : idx + 1}
                      </div>
                      <span className="truncate">{q.question}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200/80 dark:border-gray-800/60 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI calculates 100% real DB property match scores</span>
          </div>
        </div>

        {/* Right Side (Active Question & Options) */}
        <div className="flex-1 flex flex-col justify-between p-4 md:p-6 overflow-hidden">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (currentStep > 0) {
                    setCurrentStep(currentStep - 1);
                  } else {
                    router.push('/onboarding');
                  }
                }}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 flex items-center justify-center transition-colors"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4 text-gray-800 dark:text-gray-200" />
              </button>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Step {currentStep + 1} of {questions.length}
              </span>
              <button onClick={() => router.push('/')} className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600">Skip</button>
            </div>

            {/* Mobile Progress Bar */}
            <div className="h-1.5 bg-gray-100 dark:bg-navy-800 rounded-full overflow-hidden mb-6 md:hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* AI Chat Bubble */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0 bg-teal-50 dark:bg-teal-950/40 p-1 md:hidden">
                <Image src="/images/roofmintai.png" alt="AI" width={40} height={40} className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="bg-teal-50/80 dark:bg-teal-950/40 md:bg-gray-50 rounded-2xl rounded-tl-sm p-4 md:p-6 w-full border border-teal-100/60 dark:border-teal-800 md:border-gray-100/60">
                <p className="text-base md:text-xl font-bold text-navy dark:text-white">{question.question}</p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{question.subtitle}</p>
              </div>
            </div>

            {matchCount !== null && (
              <div className="flex items-center gap-2 mb-6 -mt-3 px-1 text-xs md:text-sm font-semibold text-primary">
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                {matchCountLoading ? (
                  <span className="text-gray-400 dark:text-gray-500 font-medium">Updating matches...</span>
                ) : (
                  <span>{matchCount} matching {matchCount === 1 ? 'property' : 'properties'} so far</span>
                )}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            {/* Question Inputs */}
            <div>
              {question.type === 'textarea' ? (
                <textarea
                  value={(answers[question.id] as string) || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                  placeholder="Type your preferences here..."
                  className="w-full h-40 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder:text-gray-400"
                />
              ) : question.type === 'text_input' ? (
                <div>
                  <input
                    type="text"
                    value={(answers[question.id] as string) || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    placeholder={question.placeholder}
                    className="w-full h-12 md:h-14 px-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-400"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2.5 px-1">
                    💡 Tip: Type exact area names (e.g. Whitefield, HSR Layout, Sarjapur) for accurate location matching.
                  </p>
                </div>
              ) : question.type === 'range' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg md:text-xl font-extrabold text-navy dark:text-white">
                      {formatINR(budgetMin)} – {budgetMax >= BUDGET_SLIDER_MAX ? `${formatINR(BUDGET_SLIDER_MAX)}+` : formatINR(budgetMax)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBudgetManual(!budgetManual)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {budgetManual ? 'Use slider instead' : 'Enter exact amount'}
                    </button>
                  </div>

                  {budgetManual ? (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Min (₹)</label>
                        <input
                          type="number"
                          value={budgetMin}
                          min={0}
                          onChange={(e) => setBudgetMin(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Max (₹)</label>
                        <input
                          type="number"
                          value={budgetMax}
                          min={0}
                          onChange={(e) => setBudgetMax(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-2 mt-8 mb-2">
                      <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-navy-800" />
                      <div
                        className="absolute h-full rounded-full bg-primary"
                        style={{
                          left: `${((budgetMin - BUDGET_SLIDER_MIN) / (BUDGET_SLIDER_MAX - BUDGET_SLIDER_MIN)) * 100}%`,
                          right: `${100 - ((budgetMax - BUDGET_SLIDER_MIN) / (BUDGET_SLIDER_MAX - BUDGET_SLIDER_MIN)) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        min={BUDGET_SLIDER_MIN}
                        max={BUDGET_SLIDER_MAX}
                        step={BUDGET_STEP}
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(Math.min(Number(e.target.value), budgetMax - BUDGET_STEP))}
                        className="range-thumb absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none"
                      />
                      <input
                        type="range"
                        min={BUDGET_SLIDER_MIN}
                        max={BUDGET_SLIDER_MAX}
                        step={BUDGET_STEP}
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(Math.max(Number(e.target.value), budgetMin + BUDGET_STEP))}
                        className="range-thumb absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                    <span>{formatINR(BUDGET_SLIDER_MIN)}</span>
                    <span>{formatINR(BUDGET_SLIDER_MAX)}+</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {question.options?.map((option, idx) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`px-4 py-3.5 md:py-4 rounded-2xl text-xs md:text-sm font-semibold transition-colors text-center flex items-center justify-center ${
                        isSelected(option)
                          ? 'bg-primary text-white border-2 border-primary shadow-sm'
                          : 'bg-white dark:bg-navy-900 text-navy dark:text-white border border-gray-200/60 dark:border-gray-800/60 hover:border-gray-300 active:bg-gray-50'
                      }`}
                    >
                      {question.labels?.[idx] || option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="pt-8">
            {currentStep < questions.length - 1 ? (
              <button
                onClick={() => canProceed() && setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="w-full py-4 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 text-sm md:text-base"
              >
                Next Question
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="w-full py-4 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md flex items-center justify-center gap-2 disabled:opacity-60 text-sm md:text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding Your Perfect Home...
                  </>
                ) : (
                  'Find My Home ✨'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
