/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // We use plain <img> with lazy loading for catalogue images coming from
    // arbitrary Odoo-hosted URLs. Disable optimisation to avoid mis-domain errors.
    unoptimized: true
  }
};

export default nextConfig;
