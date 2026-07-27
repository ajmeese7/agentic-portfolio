import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { siteGraph } from "@/lib/identity";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "making complex systems work smarter, not harder. ex-blue-team, now full-stack.";
const OG_IMAGE = {
  url: "/og-avatar.png",
  width: 1200,
  height: 630,
  alt: "aaron meese — meese.dev",
};

export const metadata: Metadata = {
  title: "Aaron Meese",
  description: DESCRIPTION,
  metadataBase: new URL("https://meese.dev"),
  keywords: [
    "Aaron Meese",
    "full-stack developer",
    "cybersecurity",
    "systems engineering",
    "meese.dev",
  ],
  authors: [{ name: "Aaron Meese", url: "https://meese.dev" }],
  creator: "Aaron Meese",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Aaron Meese",
    description: DESCRIPTION,
    url: "https://meese.dev",
    siteName: "meese.dev",
    type: "website",
    locale: "en_US",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aaron Meese",
    description: DESCRIPTION,
    creator: "@ajmeese7",
    images: [OG_IMAGE.url],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <head>
        {/* This site as its own WebSite, plus the Person shared with meese.rs.
            Both properties reference that Person by the same @id, so crawlers
            merge the person without conflating two sites that do different
            jobs. See src/lib/identity.ts. */}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteGraph()) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
