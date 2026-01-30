"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/batch", label: "Batch Queue", icon: "📋" },
  { href: "/leads", label: "Leads CRM", icon: "👥" },
  { href: "/instagram", label: "Instagram", icon: "📸" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[var(--background-secondary)] border-r border-[var(--border)] p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="text-2xl">🎯</span>
        <h1 className="text-xl font-bold text-white">LeadPilot</h1>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--foreground-muted)] hover:bg-[var(--background-tertiary)] hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pt-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--foreground-muted)] px-2">
          LeadPilot v1.0
        </p>
      </div>
    </aside>
  );
}
