/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
  },
}

module.exports = nextConfig 