"use client";

import { GraduationCap, Plus, RotateCcw, Signature, Tag, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import { toPersianDigits } from "@/lib/persian";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { resetSettings } from "@/lib/settings/store";
import type { CourseEntry, SignatoryEntry } from "@/lib/settings/types";
import { readSignatureImage } from "@/lib/settings/signature-image";

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SettingsWorkspace() {
  const { settings, update } = useSettings();

  function guard(action: () => void) {
    try {
      action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ذخیره‌سازی ناموفق بود.");
    }
  }

  return (
    <Tabs defaultValue="courses" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="courses" className="gap-1.5">
            <GraduationCap className="size-4" />
            دوره‌ها
          </TabsTrigger>
          <TabsTrigger value="signatories" className="gap-1.5">
            <Signature className="size-4" />
            امضاکنندگان
          </TabsTrigger>
          <TabsTrigger value="captions" className="gap-1.5">
            <Tag className="size-4" />
            عناوین سربرگ
          </TabsTrigger>
        </TabsList>

        <Button
          variant="ghost"
          onClick={() => {
            resetSettings();
            toast.success("تنظیمات به حالت اولیه برگشت.");
          }}
        >
          <RotateCcw className="size-4" />
          بازگردانی پیش‌فرض‌ها
        </Button>
      </div>

      <TabsContent value="courses">
        <CoursesPanel
          courses={settings.courses}
          onChange={(courses) => guard(() => update((current) => ({ ...current, courses })))}
        />
      </TabsContent>

      <TabsContent value="signatories">
        <SignatoriesPanel
          signatories={settings.signatories}
          onChange={(signatories) =>
            guard(() => update((current) => ({ ...current, signatories })))
          }
        />
      </TabsContent>

      <TabsContent value="captions">
        <CaptionsPanel
          captions={settings.unitCaptions}
          onChange={(unitCaptions) =>
            guard(() => update((current) => ({ ...current, unitCaptions })))
          }
        />
      </TabsContent>
    </Tabs>
  );
}

/* -------------------------------------------------------------------------- */

function CoursesPanel({
  courses,
  onChange,
}: {
  courses: CourseEntry[];
  onChange: (next: CourseEntry[]) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? courses.filter((course) =>
        `${course.title} ${course.code}`.toLowerCase().includes(needle),
      )
    : courses;

  const missingCode = courses.filter((course) => !course.code.trim()).length;

  function patch(id: string, changes: Partial<CourseEntry>) {
    onChange(courses.map((course) => (course.id === id ? { ...course, ...changes } : course)));
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="text-base">فهرست دوره‌ها</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجوی عنوان یا کد"
            className="h-9 max-w-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange([{ id: newId("course"), title: "", code: "" }, ...courses])
            }
          >
            <Plus className="size-4" />
            دوره جدید
          </Button>
          <span className="text-muted-foreground text-xs">
            {toPersianDigits(courses.length)} دوره
            {missingCode > 0 ? ` · ${toPersianDigits(missingCode)} بدون کد` : ""}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[32rem]">
          <div className="space-y-2 px-6 pb-6">
            {shown.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                نتیجه‌ای یافت نشد.
              </p>
            ) : (
              shown.map((course) => (
                <div
                  key={course.id}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-center"
                >
                  <Input
                    value={course.title}
                    onChange={(event) => patch(course.id, { title: event.target.value })}
                    placeholder="عنوان دوره"
                    className="h-9"
                  />
                  <Input
                    value={course.code}
                    onChange={(event) => patch(course.id, { code: event.target.value })}
                    placeholder="کد گواهی"
                    className="h-9 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="حذف دوره"
                    className="text-destructive hover:text-destructive justify-self-end"
                    onClick={() =>
                      onChange(courses.filter((entry) => entry.id !== course.id))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function SignatoriesPanel({
  signatories,
  onChange,
}: {
  signatories: SignatoryEntry[];
  onChange: (next: SignatoryEntry[]) => void;
}) {
  function patch(id: string, changes: Partial<SignatoryEntry>) {
    onChange(
      signatories.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="text-base">امضاکنندگان</CardTitle>
        <p className="text-muted-foreground text-xs">
          نام و سمت اینجا ذخیره می‌شود و در فرم صدور از همین فهرست انتخاب می‌شود.
          هیچ امضایی همراه برنامه منتشر نمی‌شود تا از آدرس عمومی قابل دانلود نباشد؛
          تصویر امضا را یک‌بار اینجا بارگذاری کنید و فقط در همین مرورگر می‌ماند.
        </p>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange([...signatories, { id: newId("sig"), name: "", title: "" }])
            }
          >
            <Plus className="size-4" />
            امضاکننده جدید
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {signatories.map((signatory) => (
          <SignatoryRow
            key={signatory.id}
            signatory={signatory}
            onPatch={(changes) => patch(signatory.id, changes)}
            onRemove={() =>
              onChange(signatories.filter((entry) => entry.id !== signatory.id))
            }
          />
        ))}

        {signatories.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            هیچ امضاکننده‌ای ثبت نشده است.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SignatoryRow({
  signatory,
  onPatch,
  onRemove,
}: {
  signatory: SignatoryEntry;
  onPatch: (changes: Partial<SignatoryEntry>) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      onPatch({ signatureImage: await readSignatureImage(file) });
      toast.success("تصویر امضا ذخیره شد.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خواندن تصویر ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">نام</Label>
          <Input
            value={signatory.name}
            onChange={(event) => onPatch({ name: event.target.value })}
            placeholder="برای مثال: دکتر حسین رستگار"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">سمت</Label>
          <Input
            value={signatory.title}
            onChange={(event) => onPatch({ title: event.target.value })}
            placeholder="برای مثال: رئیس مرکز تحقیقات حلال"
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-muted/40 grid h-24 place-items-center overflow-hidden rounded-md border">
          {signatory.signatureImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={signatory.signatureImage}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-muted-foreground text-xs">بدون امضا</span>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "…" : signatory.signatureImage ? "تغییر" : "آپلود"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="حذف امضاکننده"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CaptionsPanel({
  captions,
  onChange,
}: {
  captions: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="text-base">عناوین زیر لوگوی سمت راست</CardTitle>
        <p className="text-muted-foreground text-xs">
          خط دومی که در گواهی‌های دو امضا زیر لوگوی «سازمان غذا و دارو» چاپ می‌شود.
          پیش‌فرض: «{DEFAULT_SETTINGS.unitCaptions[0]}»
        </p>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange([...captions, ""])}
          >
            <Plus className="size-4" />
            عنوان جدید
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {captions.map((caption, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={caption}
              onChange={(event) =>
                onChange(
                  captions.map((entry, position) =>
                    position === index ? event.target.value : entry,
                  ),
                )
              }
              placeholder="برای مثال: اداره کل امور دارو و مواد تحت کنترل"
              className="h-9"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="حذف عنوان"
              className="text-destructive hover:text-destructive"
              onClick={() => onChange(captions.filter((_, position) => position !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {captions.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            هیچ عنوانی ثبت نشده است.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
