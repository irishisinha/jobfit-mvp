/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    isrMemoryCacheSize: 0,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig
