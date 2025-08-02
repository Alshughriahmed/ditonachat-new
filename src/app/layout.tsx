// ditonachat-new/src/app/layout.tsx

import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'DitonaChat',
  description: 'Simple Peer-to-Peer & Ably Chat with Next.js',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* هنا يمكنك إضافة أي وسم <meta> إضافي أو روابط لخطوط */}
      </head>
      <body className="bg-gray-50 text-gray-900">
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-lg font-semibold text-center">DitonaChat</h1>
        </header>
        <main className="py-8">{children}</main>
        <footer className="text-center text-sm text-gray-500 py-4">
          © {new Date().getFullYear()} DitonaChat
        </footer>
      </body>
    </html>
  );
}
