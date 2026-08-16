import Image from 'next/image';

// logo.png's "roof" wordmark is navy, which disappears against dark
// backgrounds — swap to the white-roof variant whenever dark mode is active
// instead of rendering the same asset everywhere.
export function RoofmintLogo({ width, height, className, priority }: {
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <>
      <Image src="/images/logo.png" alt="Roofmint" width={width} height={height} className={`${className || ''} dark:hidden`} priority={priority} />
      <Image src="/images/logo-dark.png" alt="Roofmint" width={width} height={height} className={`${className || ''} hidden dark:block`} priority={priority} />
    </>
  );
}
