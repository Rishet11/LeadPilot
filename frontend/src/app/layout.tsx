import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadPilot - Automated Lead Generation for Agencies",
  description: "Find businesses with weak digital presence on Google Maps and Instagram. AI-powered scoring and personalized outreach for agencies that want to scale.",
  keywords: ["lead generation", "B2B sales", "agency tools", "Google Maps scraper", "Instagram leads", "AI outreach"],
  authors: [{ name: "Rishet Mehra", url: "https://twitter.com/rishetmehra" }],
  openGraph: {
    title: "LeadPilot - Automated Lead Generation for Agencies",
    description: "Find businesses with weak digital presence on Google Maps and Instagram. Stop hunting, start closing.",
    url: "https://lead-pilot-ten.vercel.app",
    siteName: "LeadPilot",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://lead-pilot-ten.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeadPilot - Find businesses that need what you sell",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadPilot - Automated Lead Generation for Agencies",
    description: "Find businesses with weak digital presence on Google Maps and Instagram. AI-powered scoring and personalized outreach.",
    creator: "@MehraRishe90311",
    images: ["https://lead-pilot-ten.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div className="noise-overlay" />
        {children}
        {/* Tally Popup Widget */}
        <script async src="https://tally.so/widgets/embed.js"></script>
      </body>
    </html>
  );
}
