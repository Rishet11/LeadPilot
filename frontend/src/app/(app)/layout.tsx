"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = isLoggedIn();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[var(--text-secondary)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto">
        <MobileNav />
        <div className="max-w-[1100px] mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-10 animate-page-in">
          {children}
        </div>
      </main>
    </div>
  );
}
