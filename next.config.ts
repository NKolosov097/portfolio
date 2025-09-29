import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  experimental: {
    optimizePackageImports: ['@gravity-ui/uikit', '@gravity-ui/components'],
  },

  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

export default nextConfig
