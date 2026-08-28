import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = "https://roofmint.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Roofmint — AI finds. You decide. Perfect Home.",
    template: "%s",
  },
  description: "Discover your dream home with AI-powered property search. Verified listings, personalized recommendations, and smart home matching.",
  keywords: "real estate, property, home, apartment, AI search, Bangalore, India",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    siteName: "Roofmint",
    title: "Roofmint — AI finds. You decide. Perfect Home.",
    description: "Discover your dream home with AI-powered property search. Verified listings, personalized recommendations, and smart home matching.",
    url: siteUrl,
    type: "website",
    images: [{ url: "/images/logo.png", width: 1200, height: 400, alt: "Roofmint" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Roofmint — AI finds. You decide. Perfect Home.",
    description: "Discover your dream home with AI-powered property search.",
    images: ["/images/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={cn("antialiased font-sans")} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey="roofmint-theme">
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

