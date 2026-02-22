import type { Metadata } from "next";
import "./globals.css";

function resolveMetadataBase(): URL {
  const fallback = "http://127.0.0.1:3000";
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || fallback;
  try {
    return new URL(raw);
  } catch {
    return new URL(fallback);
  }
}

const metadataBase = resolveMetadataBase();

export const metadata: Metadata = {
  metadataBase,
  title: "LeadPilot - Automated Lead Generation for Agencies",
  description: "Find businesses with weak digital presence on Google Maps and Instagram. AI-powered scoring and personalized outreach for agencies that want to scale.",
  keywords: ["lead generation", "B2B sales", "agency tools", "Google Maps scraper", "Instagram leads", "AI outreach"],
  authors: [{ name: "Rishet Mehra", url: "https://twitter.com/rishetmehra" }],
  openGraph: {
    title: "LeadPilot - Automated Lead Generation for Agencies",
    description: "Find businesses with weak digital presence on Google Maps and Instagram. Stop hunting, start closing.",
    url: "/",
    siteName: "LeadPilot",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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
      </body>
    </html>
  );
}
