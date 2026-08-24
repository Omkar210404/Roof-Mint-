// Races a promise against a plain timer so a slow upstream call (e.g.
// Gemini) hits our own error handling instead of running until Vercel's
// platform-level maxDuration kills the function outright — a hard kill
// returns Vercel's own plain-text error page, not JSON, which breaks
// whatever was waiting on a normal response.
export function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Request timed out'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}
