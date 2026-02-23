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
  title: "LeadPilot - Local Business Data Workspace",
  description: "Collect, score, and export local business records from Google Maps and Instagram in a self-serve SaaS workspace.",
  keywords: ["local business data", "Google Maps data", "Instagram data", "SaaS workspace", "record scoring", "CSV export"],
  authors: [{ name: "Rishet Mehra", url: "https://twitter.com/rishetmehra" }],
  openGraph: {
    title: "LeadPilot - Local Business Data Workspace",
    description: "Collect, score, and export local business records from Google Maps and Instagram in one SaaS workspace.",
    url: "/",
    siteName: "LeadPilot",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeadPilot - Local business data workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadPilot - Local Business Data Workspace",
    description: "Collect, score, and export local business records from Google Maps and Instagram in a self-serve SaaS workspace.",
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
