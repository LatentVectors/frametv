/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for Konva canvas module issue
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    
    // Ignore canvas module during server-side rendering
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }
    
    return config;
  },
}

module.exports = nextConfig

