'use client';

import { useEffect, useState } from 'react';

const DISPLAY_MS = 1600;
const FADE_MS = 300;

// Shown once per browser session (not once ever, not on every navigation) —
// sessionStorage resets on a fresh tab/window, matching the same pattern
// used for the first-visit location/login prompts in the client layout.
export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('roofmint_splash_seen') === 'true'; } catch {}
    if (seen) return;

    setVisible(true);
    try { sessionStorage.setItem('roofmint_splash_seen', 'true'); } catch {}

    const fadeTimer = setTimeout(() => setFading(true), DISPLAY_MS);
    const hideTimer = setTimeout(() => setVisible(false), DISPLAY_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] bg-white flex items-center justify-center transition-opacity ${fading ? 'opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF, next/image doesn't optimize/animate these */}
      <img src="/images/splashscreen.gif" alt="Roofmint" className="w-40 h-40 md:w-56 md:h-56 object-contain" />
    </div>
  );
}
