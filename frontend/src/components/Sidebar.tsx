"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredAuthToken } from "@/lib/auth";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/batch",
    label: "Batch Queue",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5" />
        <path d="M8 3H3v5" />
        <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
        <path d="m15 9 6-6" />
      </svg>
    ),
  },
  {
    href: "/leads",
    label: "Leads",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/instagram",
    label: "Instagram",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearStoredAuthToken();
    router.push("/login");
  };

  return (
    <aside className="sidebar w-64 flex flex-col h-screen sticky top-0 bg-[var(--bg-primary)] border-r border-[var(--border-secondary)] z-40">
      {/* Logo */}
      <div className="flex items-center gap-3.5 px-6 h-16 border-b border-[var(--border-secondary)]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-white to-gray-400 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
           <div className="w-3.5 h-3.5 bg-[#030712] rounded-sm" />
        </div>
        <div>
          <span className="text-sm font-bold text-white tracking-tight">LeadPilot</span>
          <p className="text-[10px] font-mono text-[var(--accent-indigo)] font-bold uppercase tracking-widest mt-0.5">Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <p className="text-[10px] font-bold font-mono text-[var(--text-tertiary)] uppercase tracking-widest px-3 mb-4">Navigation</p>
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[var(--bg-secondary)] text-white shadow-inner border border-[var(--border-secondary)]"
                      : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)]/50 border border-transparent"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--accent-indigo)] rounded-r-md shadow-[0_0_10px_var(--glow-indigo)]" />
                  )}
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-br from-[var(--accent-indigo)] to-[var(--accent-violet)] text-white shadow-[0_0_15px_var(--glow-indigo)] scale-110"
                      : "bg-[var(--bg-tertiary)] group-hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] group-hover:text-white"
                  }`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Upgrade Plan Link */}
        <div className="mt-8 pt-6 border-t border-[var(--border-secondary)]">
          <Link
            href="/pricing"
            className={`group flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all border border-transparent hover:border-yellow-500/20 hover:bg-yellow-500/5 ${
              pathname === "/pricing"
                ? "bg-[var(--bg-secondary)] text-white border-yellow-500/30"
                : "text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-500 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            Upgrade for More Credits
          </Link>
          <p className="px-3 mt-2 text-[10px] text-[var(--text-dim)] font-mono uppercase tracking-wider">
            Unlock higher monthly lead volume
          </p>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 pb-6 space-y-2 mt-auto">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] hover:border-[var(--border-highlight)] transition-all group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-secondary)] group-hover:text-[var(--accent-indigo)] transition-colors">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-white transition-colors">Home</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] hover:border-red-500/30 hover:bg-red-500/5 transition-all group lg:min-w-[max-content]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-secondary)] group-hover:text-red-400 transition-colors">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-red-400 transition-colors">Log Out</span>
        </button>
      </div>
    </aside>
  );
}
