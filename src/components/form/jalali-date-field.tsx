"use client";

import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

import { JalaliCalendar } from "@/components/form/jalali-calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatJalali, parseJalali, serializeJalali } from "@/lib/jalali";
import { cn } from "@/lib/utils";

/**
 * The form control for a Jalali date. The value it reads and writes is always
 * the canonical `"1404-02-04"` storage string; the Persian form is presentation
 * only.
 */
export function JalaliDateField({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "انتخاب تاریخ",
  invalid,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseJalali(value);

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid}
            onBlur={onBlur}
            className={cn(
              "h-10 flex-1 justify-start gap-2 font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarDays className="size-4 opacity-70" />
            {selected ? formatJalali(selected) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <JalaliCalendar
            value={selected}
            onSelect={(date) => {
              onChange(serializeJalali(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      {selected && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          aria-label="پاک کردن تاریخ"
          onClick={() => onChange("")}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
