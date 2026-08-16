import type { MetadataRoute } from 'next';

const siteUrl = 'https://roofmint.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Internal-only portals and API routes have no public/SEO value and
      // shouldn't be crawled or show up in search results.
      disallow: ['/admin', '/agent', '/api', '/profile', '/onboarding', '/accept-terms'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
