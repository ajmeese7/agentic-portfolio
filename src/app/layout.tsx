import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aaron Meese",
  description:
    "Aaron Meese — making complex systems work smarter, not harder. Ex-blue-team, now full-stack.",
  metadataBase: new URL("https://meese.dev"),
  openGraph: {
    title: "Aaron Meese",
    description: "Engineer. Ex-blue-team. Currently shipping at a stealth startup.",
    url: "https://meese.dev",
    siteName: "meese.dev",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
