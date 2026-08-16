'use client';

import { useEffect, useState } from 'react';

const DISPLAY_MS = 2800;
const FADE_MS = 400;

// Shows on every full page load/reload (this component lives in a layout,
// which only remounts on a hard navigation — moving between pages via
// in-app links does not retrigger it).
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
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
