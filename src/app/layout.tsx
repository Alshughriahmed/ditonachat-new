// ditonachat-new/src/app/layout.tsx
import React from 'react';
import './globals.css';

export const metadata = {
  title: 'DitonaChat',
  description: 'A simple video chat powered by Ably',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{metadata.title}</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
