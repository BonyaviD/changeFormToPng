"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FieldOption } from "@/lib/templates/types";
import { cn } from "@/lib/utils";

/**
 * A pick-or-type control.
 *
 * The course catalogue covers the courses that already exist, but a brand new
 * course has to be issuable the same day it is invented — so anything typed
 * into the search box is accepted as the value, and only a match from the list
 * carries the extra fields (its certificate code) along with it.
 */
export function ComboboxField({
  id,
  value,
  options,
  onChange,
  onSelectOption,
  placeholder = "انتخاب یا تایپ کنید",
  emptyHint = "موردی در فهرست نیست — همین متن ثبت می‌شود.",
  invalid,
}: {
  id?: string;
  value: string;
  options: readonly FieldOption[];
  onChange: (value: string) => void;
  onSelectOption?: (option: FieldOption) => void;
  placeholder?: string;
  emptyHint?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  function commit(next: string, option?: FieldOption) {
    onChange(next);
    if (option) onSelectOption?.(option);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "h-10 w-full justify-between gap-2 px-3 text-start font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        {/* `shouldFilter` stays on; cmdk's own scoring handles Persian fine. */}
        <Command>
          <CommandInput
            placeholder="جستجو یا عنوان جدید…"
            value={search}
            onValueChange={setSearch}
            onKeyDown={(event) => {
              // Enter on a query that matches nothing keeps what was typed.
              if (event.key === "Enter" && search.trim()) {
                const exact = options.find((option) => option.value === search.trim());
                if (!exact) {
                  event.preventDefault();
                  commit(search.trim());
                }
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              <div className="space-y-2 px-2 py-3 text-center">
                <p className="text-muted-foreground text-xs">{emptyHint}</p>
                {search.trim() ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => commit(search.trim())}
                  >
                    ثبت «{search.trim()}»
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>

            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => commit(option.value, option)}
                  className="items-start gap-2"
                >
                  <Check
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 text-start leading-relaxed">
                    {option.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
