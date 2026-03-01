/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Forward API calls in production
  async rewrites() {
    return process.env.NODE_ENV === "production"
      ? []
      : [];
  },
};

export default nextConfig;
