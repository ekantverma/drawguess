/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@drawguess/shared'],
  webpack: (config) => {
    // konva's node build optionally requires 'canvas'; we only render it in the browser
    config.resolve.alias.canvas = false;
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
};
export default nextConfig;
