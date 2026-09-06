"use client";

import { Check } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { templates } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

/**
 * Lists everything in the template registry. With a single design registered it
 * reads as a header for the current template; the moment a second one is added
 * it becomes a real picker, with no change here.
 */
export function TemplatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const single = templates.length === 1;

  return (
    <Card>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium">قالب گواهی</p>

        <div className="grid gap-2">
          {templates.map((template) => {
            const selected = template.id === value;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onChange(template.id)}
                disabled={single}
                aria-pressed={selected}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-right transition-colors",
                  selected ? "border-primary bg-primary/5" : "hover:bg-muted",
                  single && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                    selected && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {selected ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{template.name}</span>
                  <span className="text-muted-foreground block text-xs leading-relaxed">
                    {template.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
