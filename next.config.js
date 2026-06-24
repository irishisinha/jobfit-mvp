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

// Skip static export step that's causing build failures
if (process.env.SKIP_EXPORT === 'true') {
  nextConfig.skipExporting = true
}
