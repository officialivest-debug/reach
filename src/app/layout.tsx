import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, Inter } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { CallProvider } from "@/context/CallContext";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0F" },
    { media: "(prefers-color-scheme: light)", color: "#0A0A0F" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://reachinvestment.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "REACH — Verified Deal Room & Venture Network",
    template: "%s | REACH Ecosystem",
  },
  description:
    "A cross-border verified ecosystem connecting Angel & VC Investors, High-Growth Founders, and Elite Tech Talent — with native calling, KYC verification, and 1-click YC SAFE term sheets.",
  keywords: [
    "REACH",
    "Angel Investment",
    "Venture Capital",
    "Startup Funding",
    "Deal Room",
    "SAFE Note",
    "Term Sheet",
    "Tech Talent Hiring",
    "KYC Verified",
    "Cross-Border Investment",
    "Emerging Markets",
    "Africa Tech",
    "Fintech",
  ],
  authors: [{ name: "REACH Capital & Horizons Network" }],
  creator: "REACH Ecosystem",
  publisher: "REACH",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "REACH — Verified Deal Room & Startup Capital Network",
    description:
      "Empowering Entrepreneurs. Expanding Horizons. A global, verified ecosystem connecting Resources, Entrepreneurs, Access, Capital, Horizons, and Talent across borders.",
    url: baseUrl,
    siteName: "REACH Ecosystem",
    images: [
      {
        url: "/logo-icon.png",
        width: 800,
        height: 800,
        alt: "REACH Verified Venture Network",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "REACH — Verified Deal Room & Startup Capital Network",
    description:
      "Connecting accredited investors with high-growth startup founders. Native calls, pitch deck telemetry, and YC SAFE agreements.",
    images: ["/logo-icon.png"],
    creator: "@reach_invest",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/logo-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-precomposed.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "REACH",
        url: baseUrl,
        logo: `${baseUrl}/logo-icon.png`,
        description: "A cross-border verified venture deal room connecting investors, startup founders, and tech talent.",
        sameAs: [
          "https://twitter.com/reach_invest",
          "https://linkedin.com/company/reach-investment",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "REACH Ecosystem",
        publisher: { "@id": `${baseUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${baseUrl}/dashboard/investor?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "REACH Verified Deal Room",
        operatingSystem: "Web, iOS, Android",
        applicationCategory: "FinanceApplication, BusinessApplication",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <html lang="en" className={`${jakarta.variable} ${outfit.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-[#0A0A0F] text-[#F5F3ED] antialiased selection:bg-[#C9A84C] selection:text-[#0A0A0F]`}>
        <CurrencyProvider>
          <Web3Provider>
            <CallProvider>
              {children}
              <PwaInstallPrompt />
              <CookieConsentBanner />
            </CallProvider>
          </Web3Provider>
        </CurrencyProvider>
      </body>
    </html>
  );
}