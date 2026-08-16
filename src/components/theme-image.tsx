import Image from 'next/image';

// Generic light/dark asset swap — renders the light-tuned image by default
// and the dark-tuned one only when dark mode is active, via CSS dark:
// variants (no JS/flicker). Use this for any illustration that has separate
// light/dark artwork; RoofmintLogo and HomeSearchIllustration are thin
// wrappers around the same idea for their specific assets.
export function ThemeImage({ lightSrc, darkSrc, alt, width, height, className, priority }: {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <>
      <Image src={lightSrc} alt={alt} width={width} height={height} className={`${className || ''} dark:hidden`} priority={priority} />
      <Image src={darkSrc} alt={alt} width={width} height={height} className={`${className || ''} hidden dark:block`} priority={priority} />
    </>
  );
}
