/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // يتجاهل أخطاء ESLint أثناء تشغيل الأمر `next build` أو `next start`
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
