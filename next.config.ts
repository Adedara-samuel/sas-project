import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // transpilePackages: ['@firebase/app', '@firebase/auth', '@firebase/firestore', '@firebase/storage'],
  reactStrictMode: false,
  devIndicators: false

  webpack: (config) => {
    config.externals.push('@google-cloud/tasks');
    return config;
  },

  /* config options here */
};

export default nextConfig;
