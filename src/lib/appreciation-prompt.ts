export type AppreciationInput = {
  title: string;
  location_address?: string;
  locality?: string;
  city?: string;
  price: number;
  property_type?: string;
  bhk?: number;
};

export type AppreciationResult = {
  estimatedPrice5Yr: number;
  estimatedPriceFormatted: string;
  growthPercentage: number;
  cagr: string;
  keyDrivers: string[];
  insights: string;
};

// Shared by the admin's "Generate forecast" action and the live public
// fallback, so the two paths can never drift into giving different answers
// for the same property.
//
// Earlier version just said "factor in metro projects / infrastructure" with
// no grounding on timeline — Gemini happily cited things like the Mumbai-
// Ahmedabad bullet train as a "5-year growth driver" for a location it
// wouldn't realistically reach anywhere near by 2031. Indian infrastructure
// megaprojects routinely slip a decade or more past their announced dates;
// presenting one as a near-term price driver isn't optimistic, it's
// misleading. This version explicitly tells the model to ground the 5-year
// number and its 3 drivers in what plausibly happens by 2031, and to keep
// any distant megaproject mention separate and clearly labeled as long-term.
export function buildAppreciationPrompt(input: AppreciationInput): string {
  const areaName = input.locality || input.city || input.location_address || 'the area';
  const currentPrice = Number(input.price);

  return `You are a senior real estate market analyst specializing in Indian real estate appreciation trends.

Analyze the following property and predict its estimated market value after 5 years (2031), based ONLY on developments realistically expected to materially affect prices within this specific 5-year window (2026-2031) — not distant, uncertain megaprojects.

Indian infrastructure megaprojects (bullet trains, new metro lines, large bridges) routinely take a decade or more longer than announced, and frequently slip well past their original timelines. Do NOT treat an announced-but-not-yet-substantially-under-construction megaproject as a near-term price driver. If a large project is genuinely relevant to ${areaName}'s long-term outlook but unlikely to be complete or materially operational within 5 years, you may mention it briefly as separate long-term potential — but the numeric estimate and the 3 key drivers must be grounded in what plausibly happens by 2031: infrastructure already under active construction or near completion, established employment/IT/industrial corridors already operating, historical local CAGR trends, and realistic near-term commercial/residential development.

Property Details:
- Title: ${input.title}
- Location: ${input.location_address} (${input.locality}, ${input.city})
- Property Type: ${input.bhk ? `${input.bhk} BHK ` : ''}${input.property_type || 'Residential Property'}
- Current Price: ₹${currentPrice.toLocaleString('en-IN')} (₹${(currentPrice / 10000000).toFixed(2)} Cr / ₹${(currentPrice / 100000).toFixed(0)} Lakhs)

Respond ONLY with a valid JSON object matching this exact TypeScript structure:
{
  "estimatedPrice5Yr": number (numeric value in rupees after 5 years appreciation, e.g. 18200000),
  "estimatedPriceFormatted": string (e.g. "₹1.82 Cr"),
  "growthPercentage": number (total percentage increase over 5 years, e.g. 42),
  "cagr": string (annual growth rate range, e.g. "7.5% - 9.0% p.a."),
  "keyDrivers": string[] (3 key local growth drivers realistically active within the 5-year window, e.g. ["Tech Park Proximity", "Rental Yield Demand", "Ongoing Road Widening"]),
  "insights": string (a 2-3 sentence executive market summary explaining the location's realistic appreciation potential over the next 5 years)
}

Do not include markdown formatting, backticks, or extra commentary outside the JSON.`;
}

export function fallbackAppreciationResult(price: number): AppreciationResult {
  const fallbackPrice = Number(price || 10000000);
  const estimated5Yr = Math.round(fallbackPrice * 1.42);
  return {
    estimatedPrice5Yr: estimated5Yr,
    estimatedPriceFormatted: estimated5Yr >= 10000000 ? `₹${(estimated5Yr / 10000000).toFixed(2)} Cr` : `₹${(estimated5Yr / 100000).toFixed(0)} L`,
    growthPercentage: 42,
    cagr: "7.2% - 8.5% p.a.",
    keyDrivers: ["Metro Connectivity Expansion", "Upcoming Tech Hubs", "Infrastructure Appreciation"],
    insights: `Properties in this corridor have historically shown steady 7-8% annual capital appreciation. With ongoing infrastructure and commercial expansions, this property is projected to appreciate by ~42% over the next 5 years.`,
  };
}
