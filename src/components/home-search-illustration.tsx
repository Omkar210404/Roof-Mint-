import Image from 'next/image';

// home2.png's illustration is colored for a light background — swap to the
// dark-tuned variant whenever dark mode is active, same idea as RoofmintLogo.
export function HomeSearchIllustration({ width, height, className, priority }: {
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <>
      <Image src="/images/home2.png" alt="AI Home Search" width={width} height={height} className={`${className || ''} dark:hidden`} priority={priority} />
      <Image src="/images/home2-dark.png" alt="AI Home Search" width={width} height={height} className={`${className || ''} hidden dark:block`} priority={priority} />
    </>
  );
}
