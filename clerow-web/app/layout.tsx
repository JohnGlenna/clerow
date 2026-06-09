import type { Metadata } from "next";
import "./globals.css";
import { AuthModalProvider } from "@/components/AuthModalProvider";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo/site";

const TITLE = "Clerow — Get your brand recommended by AI";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Clerow",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "GEO",
    "AEO",
    "generative engine optimization",
    "answer engine optimization",
    "AI visibility",
    "get recommended by ChatGPT",
    "AI SEO tool",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/assets/clerow-mascot.png", width: 512, height: 512, alt: "Clerow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SITE_DESCRIPTION,
    images: ["/assets/clerow-mascot.png"],
  },
  icons: {
    icon: "/assets/clerow-mascot.png",
    apple: "/assets/clerow-mascot.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-accent="amber" suppressHydrationWarning>
      <head>
        {/* No-flash theme init: set data-theme before paint so a reload never
            flashes the wrong neumorphic dashboard theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("clerow:theme")||"light";document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
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
