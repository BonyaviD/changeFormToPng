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
import { useId, type ReactNode } from "react";

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

/**
 * The three-pointed star.
 *
 * One arm is drawn and the other two are the same path rotated by 120°, so the
 * star is exactly symmetric rather than three hand-placed shapes that almost
 * line up. Each arm is split down its centre line into a lit and a shaded half,
 * which is what gives the flat mark its faceted, chrome look without any
 * outlines or glow.
 *
 * The star renders twice on the page (header and the LH44 badge), so gradient
 * ids come from `useId` — a fixed id would make both instances resolve to the
 * first definition in the document.
 */
function MercedesStar({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const ring = `${id}-ring`;
  const lit = `${id}-lit`;
  const shade = `${id}-shade`;

  const arm = (
    <>
      {/* Tip at the top, waist at the centre; halves meet on the arm's axis. */}
      <path d="M24 5.5 21.35 22.5 24 24Z" fill={`url(#${lit})`} />
      <path d="M24 5.5 26.65 22.5 24 24Z" fill={`url(#${shade})`} />
    </>
  );

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={ring} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#aeb8bd" />
          <stop offset="1" stopColor="#e9eef0" />
        </linearGradient>
        <linearGradient id={lit} x1="20" y1="6" x2="26" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d7dee1" />
        </linearGradient>
        <linearGradient id={shade} x1="28" y1="6" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9aa5ab" />
          <stop offset="1" stopColor="#c5cdd1" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="21" stroke={`url(#${ring})`} strokeWidth="1.6" />
      <g>{arm}</g>
      <g transform="rotate(120 24 24)">{arm}</g>
      <g transform="rotate(240 24 24)">{arm}</g>
    </svg>
  );
}

/**
 * A side-on Formula 1 car for the footer lane.
 *
 * Drawn here rather than downloaded: an inline SVG stays sharp at any size,
 * takes the theme's palette, costs no extra request behind the login gate, and
 * carries no real team livery. It faces left because, in the RTL footer, it
 * drives from the right edge toward the note in the middle.
 */
function F1Car({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const body = `${id}-body`;
  const streak = `${id}-streak`;

  const wheel = (cx: number, cy: number, r: number) => (
    <g className="f1-car-wheel">
      <circle cx={cx} cy={cy} r={r} fill="#0a0d0f" />
      <circle cx={cx} cy={cy} r={r - 1.4} stroke="#2d363b" strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={r * 0.45} stroke="#c9d2d6" strokeWidth="1" />
      {[0, 72, 144, 216, 288].map((angle) => (
        <line
          key={angle}
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - r * 0.45}
          stroke="#c9d2d6"
          strokeWidth="0.8"
          transform={`rotate(${angle} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r="0.9" fill="#00d2be" />
    </g>
  );

  return (
    <svg
      className={className}
      viewBox="0 0 150 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={body} x1="0" y1="10" x2="0" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4f7f8" />
          <stop offset="0.55" stopColor="#aab4b9" />
          <stop offset="1" stopColor="#5d676c" />
        </linearGradient>
        <linearGradient id={streak} x1="116" y1="0" x2="150" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Speed lines trailing behind the rear wing. */}
      <g stroke={`url(#${streak})`} strokeWidth="1" strokeLinecap="round">
        <line x1="120" y1="15" x2="146" y2="15" />
        <line x1="116" y1="20" x2="140" y2="20" />
        <line x1="122" y1="25" x2="148" y2="25" />
      </g>

      {/* Rear wing: main plane, pylon, endplate. */}
      <path d="M100 8h17v3h-17z" fill="#d7dee1" />
      <path d="M104 14h9v2h-9z" fill="#1a2024" />
      <path d="M113 8h4v16h-4z" fill="#1a2024" />

      {/* Body: nose, cockpit, engine cover down to the rear. */}
      <path
        d="M5 25.5C14 23.5 28 22 42 21L50 17C54 13.5 60 12 68 12L80 12.5C90 13 98 16 104 20L108 26L18 27.5Z"
        fill={`url(#${body})`}
      />
      <path d="M16 27.2H110V28.6H16Z" fill="#151a1d" />
      <path d="M22 24C40 22.4 70 21 102 22" stroke="#00d2be" strokeWidth="1.1" strokeLinecap="round" />

      {/* Airbox, halo and helmet. */}
      <path d="M64 12.2C65 8.6 71 8.2 73 12.4Z" fill="#1a2024" />
      <path d="M49 17.5C52 11.6 60 10.6 64.5 12.6" stroke="#262e33" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="57.5" cy="14.8" r="2.5" fill="#a86cff" />

      {/* Front wing and endplate. */}
      <path d="M1.5 26.5H21V29H1.5Z" fill="#d7dee1" />
      <path d="M1.5 22.8H4.2V29H1.5Z" fill="#1a2024" />

      {wheel(26, 27.6, 6.2)}
      {wheel(92, 27.2, 7)}
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <SessionGuard />
      <header className="app-header bg-card/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="app-brand flex items-center gap-2.5">
            {/*
              Size and shape for the F1 mark are utilities, not component CSS:
              `size-9` and `rounded-lg` live in Tailwind's utilities layer,
              which outranks anything in the components layer, so overriding
              them there silently kept the default square tile.
            */}
            <span className="app-brand-mark bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-lg f1:size-11 f1:rounded-full f1:bg-transparent">
              <FileSignature className="app-default-mark size-4.5" />
              <MercedesStar className="f1-brand-star" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold">سامانه صدور گواهی</span>
              <span className="text-muted-foreground block text-xs">
                مرکز تحقیقات حلال
              </span>
            </span>
          </Link>

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

      <footer className="app-footer text-muted-foreground border-t text-xs">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 py-4 sm:px-6">
          {/*
            RTL row: the first child sits on the right, the last on the left.
            The lane and the badge only exist in the F1 theme; elsewhere the
            note is alone and centred, as before.
          */}
          <div className="f1-footer-lane" aria-hidden="true">
            <span className="f1-footer-track" />
            <F1Car className="f1-footer-car" />
          </div>

          <p className="flex-1 text-center">همه‌ی داده‌ها فقط در همین مرورگر ذخیره می‌شود.</p>

          <div className="f1-footer-badge-slot">
            <span className="f1-mode-badge" aria-hidden="true" dir="ltr">
              <MercedesStar className="f1-badge-star" />
              <span className="f1-driver-code">LH</span>
              <strong>44</strong>
              <span className="f1-mode-divider" />
              <Gauge className="size-3.5" />
              <span>SILVER RACE</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
