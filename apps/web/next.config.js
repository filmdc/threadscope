/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@threadscope/shared', '@threadscope/ui'],
  async rewrites() {
    return [
      {
        source: '/api/trpc/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:4000'}/trpc/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://scontent.cdninstagram.com https://*.threads.net",
              "font-src 'self'",
              "connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'),
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '*.threads.net',
      },
    ],
  },
};

module.exports = nextConfig;
