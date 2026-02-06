import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LeadPilot - Automated Lead Generation for Agencies",
  description: "Find businesses with weak digital presence on Google Maps and Instagram. AI-powered scoring and personalized outreach for agencies that want to scale.",
  keywords: ["lead generation", "B2B sales", "agency tools", "Google Maps scraper", "Instagram leads", "AI outreach"],
  authors: [{ name: "Rishet Mehra", url: "https://twitter.com/rishetmehra" }],
  openGraph: {
    title: "LeadPilot - Automated Lead Generation for Agencies",
    description: "Find businesses with weak digital presence on Google Maps and Instagram. Stop hunting, start closing.",
    url: "https://leadpilot.vercel.app",
    siteName: "LeadPilot",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadPilot - Automated Lead Generation for Agencies",
    description: "Find businesses with weak digital presence on Google Maps and Instagram. AI-powered scoring and personalized outreach.",
    creator: "@rishetmehra",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className} suppressHydrationWarning>
        <div className="noise-overlay" />
        {children}
        {/* Tally Popup Widget */}
        <script async src="https://tally.so/widgets/embed.js"></script>
      </body>
    </html>
  );
}
