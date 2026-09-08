import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { nastaliqFont, naskhFont, uiFont } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "سامانه صدور گواهی",
  description:
    "صدور، بایگانی و استعلام گواهی‌های پایان دوره آموزشی مرکز تحقیقات حلال.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${uiFont.variable} ${nastaliqFont.variable} ${naskhFont.variable}`}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-left" dir="rtl" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
