/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // تجاهل تحذيرات ESLint أثناء البناء
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
