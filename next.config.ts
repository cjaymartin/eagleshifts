import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    experimental: {
        webpackMemoryOptimizations: true,
    },
    /* config options here */
};

export default nextConfig;
