import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export is generally good for simple sites, but we have an API route (openai).
  // So we keep default output (Node.js server / Serverless).
  // If we want purely static (no API), we'd need to shift OpenAI calls to client (unsafe) or keep them here.
  // The user uses Vercel, so standard Next.js output is perfect.
};

export default withNextIntl(nextConfig);
