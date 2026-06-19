/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NEXT_STANDALONE === '1' ? { output: 'standalone' } : {}),
  transpilePackages: ['@betv/shared', '@betv/emails'],
  experimental: {
    serverComponentsExternalPackages: ['argon2', 'pino'],
  },
}

export default nextConfig
