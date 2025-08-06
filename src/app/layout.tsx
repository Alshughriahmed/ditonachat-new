// src/app/layout.tsx
import './globals.css';
import Providers from './providers';
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers> {/* استخدم Providers لتغليف children */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
