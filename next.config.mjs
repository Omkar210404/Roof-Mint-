/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      // Old admin paths from before the Technical Panel became its own
      // top-level route — anyone with these bookmarked, or a stale link,
      // hit the default 404 instead of landing anywhere useful.
      { source: '/admin/security', destination: '/technical/security', permanent: true },
      { source: '/admin/technical', destination: '/technical', permanent: true },
      { source: '/admin/technical/usage', destination: '/technical/usage', permanent: true },
      { source: '/admin/technical/security', destination: '/technical/security', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Applies site-wide. frame-ancestors + X-Frame-Options block the
        // site from being loaded inside an iframe on another origin
        // (clickjacking — tricking a visitor into clicking something on
        // an invisible embedded Roofmint page, e.g. the admin panel).
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};
export default nextConfig;
