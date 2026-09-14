"use client";

import { Gauge, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "light", label: "روشن", icon: Sun },
  { value: "dark", label: "تیره", icon: Moon },
  { value: "f1", label: "فرمول یک · LH44", icon: Gauge },
  { value: "system", label: "سیستم", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="تغییر پوسته">
          {/*
            The server cannot know the visitor's theme, so the icon is chosen by
            CSS rather than by a mounted flag — no hydration guard, no flash of
            the wrong icon.
          */}
          <Sun className="size-4 dark:hidden f1:hidden" />
          <Moon className="hidden size-4 dark:block" />
          <Gauge className="hidden size-4 f1:block" />
        </Button>
      </DropdownMenuTrigger>
      {/*
        The toggle sits near the left edge of the RTL header, and Radix has no
        DirectionProvider here, so it aligns the menu with LTR rules and grows it
        toward that edge. Collision padding keeps the menu clear of the viewport
        on every side instead of letting it clamp flush against the corner.
      */}
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="min-w-44"
      >
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            className="gap-2"
          >
            <option.icon className="size-4" />
            <span className="flex-1">{option.label}</span>
            {theme === option.value ? (
              <span className="bg-primary size-1.5 rounded-full" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
