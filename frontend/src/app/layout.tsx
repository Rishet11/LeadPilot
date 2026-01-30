import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "LeadPilot - Lead Generation Dashboard",
  description: "AI-powered lead generation system for agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${playfair.variable}`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="max-w-[1100px] mx-auto px-8 py-8 lg:px-10 lg:py-10 animate-page-in">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
