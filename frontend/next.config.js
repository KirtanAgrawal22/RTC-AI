const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Stub 'canvas' so Konva's Node entry doesn't break the build.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: path.resolve(__dirname, 'src/canvas-stub.js'),
    };
    return config;
  },
};

module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
};