"use client";

import { TBike } from "@/components/(main)/Bike/type/bike.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFetchData } from "@/hooks/useApi";
import { clearToken } from "@/lib/tokenManager";
import { getUserEmail, isAdminUser } from "@/lib/userRole";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bike,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  LucideIcon,
  Moon,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Wallet,
  Wrench,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type TNavItem = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
};

// ! route segment under /bikes/[bikeId]/ → nav key; empty segment = overview
const bikeSections: {
  key: string;
  segment: string;
  label: string;
  short?: string;
  icon: LucideIcon;
}[] = [
  { key: "overview", segment: "", label: "Overview", icon: LayoutGrid },
  { key: "fuel", segment: "fuel-logs", label: "Fuel logs", short: "Fuel", icon: Fuel },
  { key: "mileage", segment: "mileage", label: "Mileage", icon: Gauge },
  {
    key: "maintenance",
    segment: "maintenance-logs",
    label: "Maintenance",
    short: "Service",
    icon: Wrench,
  },
  { key: "spending", segment: "spending", label: "Spending", short: "Spend", icon: Wallet },
  { key: "issues", segment: "issues", label: "Issues", icon: AlertTriangle },
  { key: "accessories", segment: "accessories", label: "Accessories", icon: ShoppingBag },
  { key: "documents", segment: "documents", label: "Documents", icon: FileText },
  { key: "manual", segment: "manual", label: "Manual", icon: BookOpen },
  { key: "assistant", segment: "assistant", label: "AI Assistant", icon: Sparkles },
];

const mobileBikeTabKeys = ["overview", "fuel", "maintenance", "spending"];

const bikeSectionHref = (bikeId: string, segment: string) =>
  segment ? `/bikes/${bikeId}/${segment}` : `/bikes/${bikeId}`;

const useRouteInfo = () => {
  const pathname = usePathname();
  const segments = pathname?.split("/")?.filter(Boolean);
  const bikeId = segments[0] === "bikes" ? segments[1] : undefined;
  const section = bikeId
    ? bikeSections?.find((s) => s?.segment === (segments[2] ?? ""))
    : undefined;

  let activeKey = "dashboard";
  if (section) activeKey = section?.key;
  else if (pathname?.startsWith("/settings/catalog")) activeKey = "catalog";
  else if (pathname?.startsWith("/admin")) activeKey = "admin";

  return { bikeId, section, activeKey };
};

const ThemeToggle = ({ className }: { className?: string }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "grid place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground",
        className,
      )}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
};

export const BrandMark = ({ size = "sm" }: { size?: "sm" | "md" }) => (
  <span
    className={cn(
      "grid shrink-0 place-items-center rounded-md text-primary shadow-glow",
      size === "sm" ? "size-[22px]" : "size-9 rounded-lg",
    )}
  >
    <Bike className={size === "sm" ? "size-3.5" : "size-5"} />
  </span>
);

const SidebarLink = ({
  item,
  active,
  compact,
}: {
  item: TNavItem;
  active: boolean;
  compact?: boolean;
}) => {
  const Icon = item?.icon;
  return (
    <Link
      href={item?.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 transition-colors",
        compact ? "h-8 text-[13px]" : "h-[34px] text-[13.5px]",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-surface-hover hover:text-sidebar-foreground",
      )}
    >
      <Icon className={compact ? "size-[15px]" : "size-4"} />
      <span>{item?.label}</span>
    </Link>
  );
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { bikeId, section, activeKey } = useRouteInfo();
  // ! safe to read the cookie here — both layouts only render AppShell after their post-mount session check
  const [isAdmin] = useState(isAdminUser);
  const [userEmail] = useState(getUserEmail);

  // same query key as the bike hub, so it's served from cache there
  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId ?? ""],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const bike = bikeId ? bikeData?.data : undefined;

  const handleLogout = () => {
    clearToken();
    router?.replace("/login");
  };

  const bikeItems: TNavItem[] = bikeId
    ? bikeSections?.map((s) => ({
        key: s?.key,
        href: bikeSectionHref(bikeId, s?.segment),
        label: s?.label,
        icon: s?.icon,
      }))
    : [];

  const adminItem: TNavItem = {
    key: "admin",
    href: "/admin",
    label: "Admin",
    icon: ShieldCheck,
  };

  const footItems: TNavItem[] = [
    {
      key: "catalog",
      href: "/settings/catalog",
      label: "Maintenance catalog",
      icon: Settings,
    },
    ...(isAdmin ? [adminItem] : []),
  ];

  // ── mobile header: title / subtitle / back target derived from the route ──
  let mobileTitle = "My bikes";
  let mobileSubtitle: string | undefined;
  let backHref: string | undefined;
  if (bikeId) {
    if (!section || section?.key === "overview") {
      mobileTitle = bike?.nickname ?? "Bike";
      mobileSubtitle = bike ? `${bike?.brand} ${bike?.model}` : undefined;
      backHref = "/dashboard";
    } else {
      mobileTitle = section?.label;
      mobileSubtitle = bike?.nickname;
      backHref = `/bikes/${bikeId}`;
    }
  } else if (activeKey === "catalog") {
    mobileTitle = "Maintenance catalog";
  } else if (activeKey === "admin") {
    mobileTitle = "Admin";
  }

  // ── mobile tab bar ──
  const mobileTabs: TNavItem[] = bikeId
    ? bikeSections
        ?.filter((s) => mobileBikeTabKeys?.includes(s?.key))
        ?.map((s) => ({
          key: s?.key,
          href: bikeSectionHref(bikeId, s?.segment),
          label: s?.short ?? s?.label,
          icon: s?.icon,
        }))
    : [
        { key: "dashboard", href: "/dashboard", label: "Bikes", icon: LayoutDashboard },
        { key: "catalog", href: "/settings/catalog", label: "Catalog", icon: Settings },
        ...(isAdmin ? [adminItem] : []),
      ];
  const moreItems = bikeItems?.filter((i) => !mobileBikeTabKeys?.includes(i?.key));
  const moreActive = moreItems?.some((i) => i?.key === activeKey);

  return (
    <div className="flex min-h-dvh bg-background bg-ground text-foreground">
      {/* ── desktop sidebar ── */}
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-3.5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 pt-1 pb-1.5">
          <BrandMark />
          <span className="text-[15px] font-medium tracking-tight">Bike Log</span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          <SidebarLink
            item={{
              key: "dashboard",
              href: "/dashboard",
              label: "Dashboard",
              icon: LayoutDashboard,
            }}
            active={activeKey === "dashboard"}
          />
        </nav>

        {bikeId && (
          <div className="flex flex-col gap-0.5">
            <Link
              href="/dashboard"
              title="Switch bike"
              className="mt-0.5 mb-1.5 flex items-center justify-between gap-2 rounded-lg bg-card px-2.5 py-2 shadow-sm"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">
                  {bike?.nickname ?? "…"}
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {bike ? `${bike?.currentOdometer?.toLocaleString()} km` : " "}
                </div>
              </div>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </Link>
            {bikeItems?.map((item) => (
              <SidebarLink
                key={item?.key}
                item={item}
                active={activeKey === item?.key}
                compact
              />
            ))}
          </div>
        )}

        <div className="flex-1" />

        <nav className="flex flex-col gap-0.5">
          {footItems?.map((item) => (
            <SidebarLink
              key={item?.key}
              item={item}
              active={activeKey === item?.key}
              compact
            />
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-2 pt-2.5">
          <div className="min-w-0 truncate text-[11.5px] text-muted-foreground">
            {userEmail ?? ""}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <ThemeToggle className="size-7" />
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── mobile header ── */}
        <header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-background/90 pr-2 pl-3 backdrop-blur lg:hidden">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Back"
              className="-ml-1.5 grid size-9 place-items-center rounded-lg hover:bg-surface-hover"
            >
              <ChevronLeft className="size-5" />
            </Link>
          ) : (
            <BrandMark />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium">{mobileTitle}</div>
            {mobileSubtitle && (
              <div className="-mt-px truncate text-[11px] text-muted-foreground">
                {mobileSubtitle}
              </div>
            )}
          </div>
          <ThemeToggle className="size-10" />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="grid size-10 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground"
            >
              <Settings className="size-[18px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              {userEmail && (
                <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">
                  {userEmail}
                </div>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings/catalog">
                  <Settings />
                  Maintenance catalog
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleLogout} variant="destructive">
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 pt-4 pb-24 lg:px-10 lg:pt-8 lg:pb-12">
          {children}
        </main>

        {/* ── mobile tab bar ── */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-border bg-background/95 pb-1.5 backdrop-blur lg:hidden">
          {mobileTabs?.map(({ key, href, label, icon: Icon }) => {
            const active = activeKey === key;
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0 h-0.5 w-5 rounded-full",
                    active ? "bg-primary" : "bg-transparent",
                  )}
                />
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
          {bikeId && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] outline-none",
                  moreActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0 h-0.5 w-5 rounded-full",
                    moreActive ? "bg-primary" : "bg-transparent",
                  )}
                />
                <MoreHorizontal className="size-5" />
                More
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="mb-2 min-w-52">
                {moreItems?.map(({ key, href, label, icon: Icon }) => (
                  <DropdownMenuItem key={key} asChild>
                    <Link
                      href={href}
                      className={cn(activeKey === key && "text-primary")}
                    >
                      <Icon />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </div>
  );
}
