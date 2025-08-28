import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Juxa.io - AI-Powered Landing Pages | Build Stunning Websites Fast",
  description: "Juxa.io lets you create beautiful, high-converting landing pages in seconds using AI. No coding, fully customizable, optimized for SEO and performance.",
  keywords: [
    "AI landing page builder",
    "landing page generator",
    "website builder AI",
    "professional landing pages",
    "fast website creation",
    "SEO landing pages",
    "AI website design",
    "digital marketing tools",
    "convert visitors to customers",
  ],
  authors: [{ name: "Juxa.io Team" }],
  creator: "Juxa.io",
  publisher: "Juxa.io",
  applicationName: "Juxa.io",
  category: "Software, AI Tools",
  colorScheme: "light",
  robots: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  openGraph: {
    title: "Juxa.io - AI-Powered Landing Pages",
    description: "Create stunning, professional landing pages in seconds with the power of AI",
    url: "https://juxa.io",
    siteName: "Juxa.io",
    type: "website",
    images: [
      {
        url: "/sitrologo.webp",
        width: 1200,
        height: 630,
        alt: "Juxa.io AI Landing Pages",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Juxa.io - AI-Powered Landing Pages",
    description: "Create stunning, professional landing pages in seconds with the power of AI",
    images: ["/sitrologo.webp"],
    site: "@Juxa_io",
    creator: "@Juxa_io",
  },
  metadataBase: new URL("https://juxa.io"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <link rel="canonical" href="https://juxa.io" />


        <meta property="og:image" content="/sitrologo.webp" />
        <meta property="og:url" content="https://juxa.io" />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/sitrologo.webp" />

        {/* Structured Data (JSON-LD for Google Rich Results) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Juxa.io",
              url: "https://juxa.io",
              logo: "https://juxa.io/sitrologo.webp",
              sameAs: [
                "https://twitter.com/Juxa_io",
                "https://www.linkedin.com/company/juxa-io/",
                "https://www.facebook.com/juxa.io/",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "Juxa.io - AI-Powered Landing Pages",
              description: metadata.description,
              url: "https://juxa.io",
              inLanguage: "en",
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}