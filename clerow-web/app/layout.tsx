import type { Metadata } from "next";
import "./globals.css";
import { AuthModalProvider } from "@/components/AuthModalProvider";

export const metadata: Metadata = {
  title: "Clerow — Stop being invisible to AI.",
  description:
    "Clerow scans your website and tells you exactly what to change so ChatGPT, Claude, Perplexity, and Gemini start recommending you by name.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-accent="amber" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Nunito:wght@500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthModalProvider>{children}</AuthModalProvider>
      </body>
    </html>
  );
}
