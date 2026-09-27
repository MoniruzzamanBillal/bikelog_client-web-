"use client";

import { clearToken } from "@/lib/tokenManager";
import { isAdminUser } from "@/lib/userRole";
import { LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const adminNavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // ! safe to read the cookie here — both layouts only render AppShell after their post-mount session check
  const [isAdmin] = useState(isAdminUser);
  const visibleNavItems = isAdmin ? [...navItems, adminNavItem] : navItems;

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-base font-semibold">Bike Log</span>
        <div className="flex items-center gap-3">
          <Link
            href="/settings/catalog"
            className="flex items-center text-sm text-surface-text hover:text-foreground"
            title="Maintenance Catalog"
          >
            <Settings className="size-4" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-surface-text"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-16">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex h-16 border-t border-border bg-background">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
