"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredAuthToken } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/batch", label: "Batch" },
  { href: "/leads", label: "Leads" },
  { href: "/instagram", label: "Instagram" },
  { href: "/settings", label: "Settings" },
  { href: "/pricing", label: "Pricing" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearStoredAuthToken();
    router.replace("/login");
  };

  return (
    <div className="lg:hidden sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]/95 backdrop-blur-xl">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--accent)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">LeadPilot</span>
        </Link>

        <button
          onClick={handleLogout}
          className="btn-secondary px-3 py-1.5 text-[11px]"
        >
          Log Out
        </button>
      </div>

      <div className="px-3 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30"
                    : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
