import "./globals.css";
import React from "react";

export const metadata = {
  title: "DitonaChat",
  description: "Simple Peer-to-Peer & Ably Chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
