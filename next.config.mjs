/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
  
  // Security configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Strict-Transport-Security: Enforce HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // X-Content-Type-Options: Prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // X-Frame-Options: Prevent Clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-XSS-Protection: Enable XSS filtering
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer-Policy: Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions-Policy: Control browser features
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
          },
          // Content-Security-Policy: Prevent XSS and other attacks
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust as needed
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'", // Allow fonts from Google Fonts
              "connect-src 'self'",
              "media-src 'self'",
              "object-src 'none'",
              "child-src 'none'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "manifest-src 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // API routes specific headers
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
  
  // Redirect HTTP to HTTPS in production
  async redirects() {
    return process.env.NODE_ENV === 'production' ? [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://:host/:path*',
        permanent: true,
      },
    ] : [];
  },
  
  // Environment variables configuration
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },
  
  // Build-time security optimizations
  experimental: {
    // Enable modern JavaScript output
    esmExternals: true,
  },
  
  // Webpack configuration for additional security
  webpack: (config, { dev, isServer }) => {
    // Additional security configurations can be added here
    if (!dev && !isServer) {
      // Production client-side optimizations
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\/\\]node_modules[\/\\]/,
          name: 'vendors',
          chunks: 'all',
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;