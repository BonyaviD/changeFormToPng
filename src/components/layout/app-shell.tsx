"use client";

import {
  Archive,
  BadgeCheck,
  FileSignature,
  Gauge,
  Layers,
  LogOut,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { SessionGuard } from "@/components/auth/session-guard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "صدور گواهی", icon: FileSignature },
  { href: "/bulk", label: "صدور گروهی", icon: Layers },
  { href: "/history", label: "آرشیو", icon: Archive },
  { href: "/verify", label: "استعلام", icon: BadgeCheck },
  { href: "/settings", label: "تنظیمات", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <SessionGuard />
      <header className="app-header bg-card/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="app-brand flex items-center gap-2.5">
            <span className="app-brand-mark bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg">
              <FileSignature className="size-4.5" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold">سامانه صدور گواهی</span>
              <span className="text-muted-foreground block text-xs">
                مرکز تحقیقات حلال
              </span>
            </span>
          </Link>

          <span className="f1-mode-badge" aria-hidden="true" dir="ltr">
            <Gauge className="size-3.5" />
            <span>RACE MODE</span>
          </span>

          <nav className="app-nav flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <ThemeToggle />
          <form action="/api/auth/logout" method="post">
            <Button variant="ghost" size="icon" type="submit" aria-label="خروج از حساب" title="خروج از حساب">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <main className="app-main mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="app-footer text-muted-foreground border-t py-4 text-center text-xs">
        همه‌ی داده‌ها فقط در همین مرورگر ذخیره می‌شود.
      </footer>
    </div>
  );
}
