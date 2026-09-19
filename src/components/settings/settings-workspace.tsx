"use client";

import {
  GraduationCap,
  Move,
  Plus,
  RotateCcw,
  RotateCw,
  Signature,
  Stamp,
  Tag,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import { toPersianDigits } from "@/lib/persian";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { resetSettings } from "@/lib/settings/store";
import type {
  CourseEntry,
  SignatoryEntry,
  WatermarkSettings,
} from "@/lib/settings/types";
import {
  DEFAULT_WATERMARK,
  normalizeWatermarkColor,
  normalizeWatermarkSettings,
  WATERMARK_OPACITY_MAX,
  WATERMARK_OPACITY_MIN,
  WATERMARK_OPACITY_STEP,
  WATERMARK_POSITION_MAX,
  WATERMARK_POSITION_MIN,
  WATERMARK_SIZE_MAX,
  WATERMARK_SIZE_MIN,
  WATERMARK_SIZE_STEP,
} from "@/lib/settings/watermark";
import { ASSETS } from "@/lib/templates/halal-training/layout";
import {
  normalizeSignatureScale,
  SIGNATURE_SCALE_DEFAULT,
  SIGNATURE_SCALE_MAX,
  SIGNATURE_SCALE_MIN,
  SIGNATURE_SCALE_STEP,
} from "@/lib/settings/signature-scale";
import {
  normalizeAngle,
  readSignatureImage,
  rotateSignature,
} from "@/lib/settings/signature-image";

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
        <TabsList className="h-auto flex-wrap">
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
          <TabsTrigger value="watermark" className="gap-1.5">
            <Stamp className="size-4" />
            واترمارک
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

      <TabsContent value="watermark">
        <WatermarkPanel
          watermark={settings.watermark}
          onChange={(watermark) =>
            guard(() => update((current) => ({ ...current, watermark })))
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
          زاویه و اندازه‌ی امضا را با کنترل‌های هر ردیف تنظیم کنید؛ روی گواهی دقیقاً
          همان‌طور که اینجا دیده می‌شود چاپ می‌شود.
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
  const [rotating, setRotating] = useState(false);

  // Signatures saved before rotation existed have no separate source; their
  // stored image is the source.
  const source = signatory.signatureSource ?? signatory.signatureImage;
  const angle = signatory.signatureRotation ?? 0;
  const scale = normalizeSignatureScale(signatory.signatureScale);

  /*
   * Rapid clicks must accumulate: the second click has to build on the first
   * one's angle even before its render arrives, and only the last request may
   * write its result.
   */
  const pendingAngle = useRef<number | null>(null);
  const latestRequest = useRef(0);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const uploaded = await readSignatureImage(file);
      pendingAngle.current = null;
      latestRequest.current += 1;
      onPatch({
        signatureSource: uploaded,
        signatureImage: uploaded,
        signatureRotation: 0,
        signatureScale: SIGNATURE_SCALE_DEFAULT,
      });
      toast.success("تصویر امضا ذخیره شد.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خواندن تصویر ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function rotateTo(target: number) {
    if (!source) return;
    const next = normalizeAngle(target);
    pendingAngle.current = next;
    const request = ++latestRequest.current;
    setRotating(true);

    try {
      const baked = await rotateSignature(source, next);
      if (request !== latestRequest.current) return;
      onPatch({ signatureSource: source, signatureImage: baked, signatureRotation: next });
    } catch (error) {
      if (request === latestRequest.current) {
        toast.error(error instanceof Error ? error.message : "چرخش تصویر ناموفق بود.");
      }
    } finally {
      if (request === latestRequest.current) {
        pendingAngle.current = null;
        setRotating(false);
      }
    }
  }

  const rotateBy = (delta: number) => rotateTo((pendingAngle.current ?? angle) + delta);

  const angleLabel = `${angle > 0 ? "+" : angle < 0 ? "−" : ""}${toPersianDigits(Math.abs(angle))}°`;

  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
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
        {/* White, like the certificate paper, so the preview reads true. */}
        <div className="grid h-28 place-items-center overflow-hidden rounded-md border bg-white p-2">
          {signatory.signatureImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={signatory.signatureImage}
              alt=""
              className="max-h-full max-w-full object-contain transition-transform"
              style={{ transform: `scale(${scale})` }}
            />
          ) : (
            <span className="text-xs text-neutral-500">بدون امضا</span>
          )}
        </div>

        {source ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-1" dir="ltr">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={rotating}
                aria-label="چرخش ۹۰ درجه پادساعتگرد"
                title="چرخش ۹۰ درجه پادساعتگرد"
                onClick={() => void rotateBy(-90)}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={rotating}
                aria-label="چرخش ۵ درجه پادساعتگرد"
                onClick={() => void rotateBy(-5)}
              >
                −۵°
              </Button>
              <span className="min-w-10 text-center text-xs tabular-nums">{angleLabel}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={rotating}
                aria-label="چرخش ۵ درجه ساعتگرد"
                onClick={() => void rotateBy(5)}
              >
                +۵°
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={rotating}
                aria-label="چرخش ۹۰ درجه ساعتگرد"
                title="چرخش ۹۰ درجه ساعتگرد"
                onClick={() => void rotateBy(90)}
              >
                <RotateCw className="size-4" />
              </Button>
            </div>
            {angle !== 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs"
                disabled={rotating}
                onClick={() => void rotateTo(0)}
              >
                بدون چرخش
              </Button>
            ) : null}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`signature-scale-${signatory.id}`} className="text-xs">
                  اندازه امضا
                </Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {toPersianDigits(Math.round(scale * 100))}٪
                </span>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0"
                  disabled={scale <= SIGNATURE_SCALE_MIN}
                  aria-label="کوچک‌تر کردن امضا"
                  title="کوچک‌تر کردن امضا"
                  onClick={() =>
                    onPatch({ signatureScale: normalizeSignatureScale(scale - SIGNATURE_SCALE_STEP) })
                  }
                >
                  <ZoomOut className="size-4" />
                </Button>
                <input
                  id={`signature-scale-${signatory.id}`}
                  type="range"
                  min={SIGNATURE_SCALE_MIN}
                  max={SIGNATURE_SCALE_MAX}
                  step={SIGNATURE_SCALE_STEP}
                  value={scale}
                  aria-label="اندازه امضا"
                  className="accent-primary h-1.5 min-w-0 flex-1 cursor-pointer"
                  onChange={(event) =>
                    onPatch({ signatureScale: normalizeSignatureScale(event.target.valueAsNumber) })
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0"
                  disabled={scale >= SIGNATURE_SCALE_MAX}
                  aria-label="بزرگ‌تر کردن امضا"
                  title="بزرگ‌تر کردن امضا"
                  onClick={() =>
                    onPatch({ signatureScale: normalizeSignatureScale(scale + SIGNATURE_SCALE_STEP) })
                  }
                >
                  <ZoomIn className="size-4" />
                </Button>
              </div>
              {scale !== SIGNATURE_SCALE_DEFAULT ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={() => onPatch({ signatureScale: SIGNATURE_SCALE_DEFAULT })}
                >
                  اندازه پیش‌فرض
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

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

const WATERMARK_POSITIONS = [
  { x: 0, y: 0, label: "بالا چپ" },
  { x: 50, y: 0, label: "بالا وسط" },
  { x: 100, y: 0, label: "بالا راست" },
  { x: 0, y: 50, label: "وسط چپ" },
  { x: 50, y: 50, label: "وسط" },
  { x: 100, y: 50, label: "وسط راست" },
  { x: 0, y: 100, label: "پایین چپ" },
  { x: 50, y: 100, label: "پایین وسط" },
  { x: 100, y: 100, label: "پایین راست" },
] as const;

const WATERMARK_COLORS = [
  { value: "#268a69", label: "سبز حلال" },
  { value: "#299dcc", label: "آبی نشان" },
  { value: "#6b7280", label: "خاکستری" },
  { value: "#8a855e", label: "طلایی زیتونی" },
  { value: "#1f3fc3", label: "آبی رسمی" },
] as const;

function WatermarkPanel({
  watermark,
  onChange,
}: {
  watermark: WatermarkSettings;
  onChange: (next: WatermarkSettings) => void;
}) {
  const resolved = normalizeWatermarkSettings(watermark);

  function patch(changes: Partial<WatermarkSettings>) {
    onChange(normalizeWatermarkSettings({ ...resolved, ...changes }));
  }

  const previewWidth =
    28 +
    ((resolved.size - WATERMARK_SIZE_MIN) /
      (WATERMARK_SIZE_MAX - WATERMARK_SIZE_MIN)) *
      34;

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">واترمارک نشان حلال</CardTitle>
            <p className="text-muted-foreground text-xs">
              نشان سیب حلال پشت متن گواهی قرار می‌گیرد و در خروجی تصویر، پی‌دی‌اف
              و صدور گروهی نیز با همین تنظیمات چاپ می‌شود.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <Label htmlFor="watermark-enabled" className="cursor-pointer text-sm">
              نمایش واترمارک
            </Label>
            <Switch
              id="watermark-enabled"
              checked={resolved.enabled}
              onCheckedChange={(enabled) => patch({ enabled })}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <fieldset
          disabled={!resolved.enabled}
          className="space-y-6 disabled:pointer-events-none disabled:opacity-45"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="watermark-x" className="text-xs">
                  جای افقی
                </Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {toPersianDigits(resolved.x)}٪
                </span>
              </div>
              <input
                id="watermark-x"
                type="range"
                min={WATERMARK_POSITION_MIN}
                max={WATERMARK_POSITION_MAX}
                step={1}
                value={resolved.x}
                className="accent-primary h-1.5 w-full cursor-pointer"
                style={{ direction: "ltr" }}
                onChange={(event) => patch({ x: event.target.valueAsNumber })}
              />
              <div
                className="text-muted-foreground grid grid-cols-3 text-[11px]"
                dir="ltr"
              >
                <span dir="rtl" className="text-left">
                  چپ · ۰٪
                </span>
                <span dir="rtl" className="text-center">
                  وسط · ۵۰٪
                </span>
                <span dir="rtl" className="text-right">
                  راست · ۱۰۰٪
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="watermark-y" className="text-xs">
                  جای عمودی
                </Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {toPersianDigits(resolved.y)}٪
                </span>
              </div>
              <input
                id="watermark-y"
                type="range"
                min={WATERMARK_POSITION_MIN}
                max={WATERMARK_POSITION_MAX}
                step={1}
                value={resolved.y}
                className="accent-primary h-1.5 w-full cursor-pointer"
                style={{ direction: "ltr" }}
                onChange={(event) => patch({ y: event.target.valueAsNumber })}
              />
              <div
                className="text-muted-foreground grid grid-cols-3 text-[11px]"
                dir="ltr"
              >
                <span dir="rtl" className="text-left">
                  بالا · ۰٪
                </span>
                <span dir="rtl" className="text-center">
                  وسط · ۵۰٪
                </span>
                <span dir="rtl" className="text-right">
                  پایین · ۱۰۰٪
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Move className="text-muted-foreground size-4" />
              <Label className="text-xs">موقعیت‌های آماده</Label>
            </div>
            <div className="grid w-fit grid-cols-3 gap-1" dir="ltr">
              {WATERMARK_POSITIONS.map((position) => {
                const active =
                  resolved.x === position.x && resolved.y === position.y;
                return (
                  <Button
                    key={position.label}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="icon"
                    className="size-9"
                    aria-label={position.label}
                    title={position.label}
                    onClick={() => patch({ x: position.x, y: position.y })}
                  >
                    <span className="size-2 rounded-full bg-current" />
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="watermark-size" className="text-xs">
                  اندازه نشان
                </Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {toPersianDigits(resolved.size)} پیکسل
                </span>
              </div>
              <input
                id="watermark-size"
                type="range"
                min={WATERMARK_SIZE_MIN}
                max={WATERMARK_SIZE_MAX}
                step={WATERMARK_SIZE_STEP}
                value={resolved.size}
                className="accent-primary h-1.5 w-full cursor-pointer"
                style={{ direction: "ltr" }}
                onChange={(event) => patch({ size: event.target.valueAsNumber })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="watermark-opacity" className="text-xs">
                  شفافیت
                </Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {toPersianDigits(Math.round(resolved.opacity * 100))}٪
                </span>
              </div>
              <input
                id="watermark-opacity"
                type="range"
                min={WATERMARK_OPACITY_MIN}
                max={WATERMARK_OPACITY_MAX}
                step={WATERMARK_OPACITY_STEP}
                value={resolved.opacity}
                className="accent-primary h-1.5 w-full cursor-pointer"
                style={{ direction: "ltr" }}
                onChange={(event) => patch({ opacity: event.target.valueAsNumber })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="watermark-color" className="text-xs">
                رنگ واترمارک
              </Label>
              <code className="text-muted-foreground text-xs" dir="ltr">
                {resolved.color}
              </code>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="watermark-color"
                type="color"
                value={resolved.color}
                aria-label="انتخاب رنگ واترمارک"
                className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                onChange={(event) =>
                  patch({ color: normalizeWatermarkColor(event.target.value) })
                }
              />
              {WATERMARK_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={color.label}
                  title={color.label}
                  className="size-8 cursor-pointer rounded-full border-2 border-white shadow-sm ring-1 ring-border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ backgroundColor: color.value }}
                  onClick={() => patch({ color: color.value })}
                />
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_WATERMARK)}
          >
            <RotateCcw className="size-4" />
            تنظیمات پیش‌فرض واترمارک
          </Button>
        </fieldset>

        <div className="space-y-2">
          <Label className="text-xs">پیش‌نمایش جای واترمارک</Label>
          <div
            className="relative aspect-[1014/689] overflow-hidden rounded-xl border bg-white shadow-inner"
            dir="ltr"
          >
            {resolved.enabled ? (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: `${resolved.x}%`,
                  top: `${resolved.y}%`,
                  width: `${previewWidth}%`,
                  aspectRatio: "800 / 978",
                  backgroundColor: resolved.color,
                  opacity: resolved.opacity,
                  transform: `translate(${-resolved.x}%, ${-resolved.y}%)`,
                  WebkitMaskImage: `url(${ASSETS.logoHalal})`,
                  WebkitMaskPosition: "center",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskSize: "contain",
                  maskImage: `url(${ASSETS.logoHalal})`,
                  maskPosition: "center",
                  maskRepeat: "no-repeat",
                  maskSize: "contain",
                }}
              />
            ) : null}

            <div className="pointer-events-none absolute inset-0 z-10 p-[7%] text-neutral-700">
              <div className="flex items-start justify-between">
                <div className="size-7 rounded-full border-2 border-neutral-400" />
                <div className="h-8 w-10 rounded border border-neutral-300" />
                <div className="size-7 rounded-full border-2 border-neutral-400" />
              </div>
              <div className="mx-auto mt-[8%] h-2 w-1/3 rounded-full bg-neutral-500/65" />
              <div className="mx-auto mt-[4%] h-1.5 w-1/2 rounded-full bg-neutral-400/60" />
              <div className="mt-[12%] space-y-2">
                <div className="h-1.5 w-full rounded-full bg-neutral-400/55" />
                <div className="h-1.5 w-5/6 rounded-full bg-neutral-400/55" />
                <div className="h-1.5 w-11/12 rounded-full bg-neutral-400/55" />
              </div>
            </div>

            {!resolved.enabled ? (
              <div className="absolute inset-0 z-20 grid place-items-center bg-white/75 text-sm font-medium text-neutral-500">
                واترمارک خاموش است
              </div>
            ) : null}
          </div>
          <p className="text-muted-foreground text-[11px]">
            موقعیت درصدی، نشان را همیشه داخل کاغذ نگه می‌دارد؛ ۰٪ و ۱۰۰٪ دقیقاً
            لبه‌های کاغذ هستند.
          </p>
        </div>
      </CardContent>
    </Card>
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
