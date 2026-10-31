/** @type {import('next').NextConfig} */
export default {
  output: 'standalone',
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ['playwright-core'] },
};
