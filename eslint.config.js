import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat();

export default [
  // تجاهل مجلدات البناء والأنواع المولّدة
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**'],
  },
  // قواعد Next.js الأساسية
  ...compat.extends('next/core-web-vitals'),
  // قواعد TypeScript الموصى بها
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  {
    rules: {
      // هنا يمكنك إضافة أو تعديل قواعد ESLint الخاصة بك
    },
  },
];
