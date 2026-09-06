"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  addJalaliMonths,
  daysInJalaliMonth,
  firstWeekdayOfJalaliMonth,
  isSameJalaliDate,
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  todayJalali,
  type JalaliDate,
} from "@/lib/jalali";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

/**
 * A month grid for the Jalali calendar.
 *
 * The app previously leaned on a vanilla-JS date picker that had to be told
 * about every input on the page. Owning the calendar keeps it inside the design
 * system, makes it keyboard- and RTL-correct, and removes a global side effect.
 */
export function JalaliCalendar({
  value,
  onSelect,
}: {
  value: JalaliDate | null;
  onSelect: (date: JalaliDate) => void;
}) {
  const today = useMemo(() => todayJalali(), []);
  const [visibleMonth, setVisibleMonth] = useState<JalaliDate>(value ?? today);

  const daysInMonth = daysInJalaliMonth(visibleMonth.year, visibleMonth.month);
  const leadingBlanks = firstWeekdayOfJalaliMonth(visibleMonth.year, visibleMonth.month);

  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  return (
    <div className="w-[17.5rem] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        {/* In RTL the "previous" affordance points right. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="ماه قبل"
          onClick={() => setVisibleMonth((current) => addJalaliMonths(current, -1))}
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="text-sm font-medium">
          {JALALI_MONTHS[visibleMonth.month - 1]} {toPersianDigits(visibleMonth.year)}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="ماه بعد"
          onClick={() => setVisibleMonth((current) => addJalaliMonths(current, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <div className="text-muted-foreground mb-1 grid grid-cols-7 gap-1 text-center text-[0.7rem]">
        {JALALI_WEEKDAYS_SHORT.map((weekday, index) => (
          <div key={index} className="py-1">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} />
        ))}

        {days.map((day) => {
          const date: JalaliDate = {
            year: visibleMonth.year,
            month: visibleMonth.month,
            day,
          };
          const selected = isSameJalaliDate(value, date);
          const isToday = isSameJalaliDate(today, date);
          // Friday is the weekend in Iran; it is the last column of the grid.
          const isFriday = (leadingBlanks + day - 1) % 7 === 6;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={selected}
              className={cn(
                "grid size-9 place-items-center rounded-md text-sm transition-colors",
                "hover:bg-muted focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                isFriday && !selected && "text-destructive",
                isToday && !selected && "ring-primary/40 ring-1",
                selected &&
                  "bg-primary text-primary-foreground hover:bg-primary font-medium",
              )}
            >
              {toPersianDigits(day)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between border-t pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setVisibleMonth(today);
            onSelect(today);
          }}
        >
          امروز
        </Button>
      </div>
    </div>
  );
}
