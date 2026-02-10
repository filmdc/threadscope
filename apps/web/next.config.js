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
