"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, FileImage, FileText, RotateCcw, Save, Wand2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CertificateStage } from "@/components/certificate/certificate-stage";
import { TemplatePicker } from "@/components/certificate/template-picker";
import { TemplateForm } from "@/components/form/template-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toPersianDigits } from "@/lib/persian";
import { useSettings } from "@/hooks/use-settings";
import { generateSerial } from "@/lib/serial";
import { buildArtworkContext } from "@/lib/settings/artwork-context";
import { downloadCertificate, type ExportFormat } from "@/lib/render/export";
import { certificateRepository, notifyArchiveChanged } from "@/lib/storage";
import { DEFAULT_TEMPLATE_ID, getTemplate } from "@/lib/templates/registry";
import type { ArtworkContext } from "@/lib/templates/types";

type Values = Record<string, unknown>;

export function IssueWorkspace() {
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const template = useMemo(() => getTemplate(templateId), [templateId]);
  const { settings } = useSettings();

  /**
   * The tracking number for this form session. It is minted on first use rather
   * than at mount: generating it during render would produce a different value
   * on the server than in the browser, and hydration would tear the tree down.
   */
  const [serial, setSerial] = useState("");
  const [busy, setBusy] = useState<ExportFormat | "save" | null>(null);

  const form = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(template.schema as any),
    defaultValues: template.defaults as Values,
    mode: "onTouched",
  });

  const { control, handleSubmit, reset, setValue, formState } = form;
  // `useWatch` returns a value rather than a subscription function, which keeps
  // this component memoizable — `watch()` opts the whole tree out.
  const values = useWatch({ control }) as Values;

  const ensureSerial = useCallback(() => {
    if (serial) return serial;
    const minted = generateSerial();
    setSerial(minted);
    return minted;
  }, [serial]);


  const context: ArtworkContext = useMemo(
    () => buildArtworkContext(settings, serial),
    [settings, serial],
  );

  /** Clears the identity of the current certificate without touching the form. */
  function startNewCertificate() {
    setSerial("");
  }

  function handleTemplateChange(nextId: string) {
    // A different template means a different schema, so the form starts over.
    setTemplateId(nextId);
    reset(getTemplate(nextId).defaults as Values);
    startNewCertificate();
  }

  const persist = useCallback(
    async (validated: Values, trackingNumber: string) => {
      // One form session is one certificate. Downloading it as PNG and then as
      // PDF, or saving after downloading, must update the same archive row
      // rather than filing the same serial twice.
      const existing = await certificateRepository.findBySerial(trackingNumber);

      await certificateRepository.save({
        id: existing?.id ?? crypto.randomUUID(),
        serial: trackingNumber,
        templateId: template.id,
        templateVersion: template.version,
        values: validated,
        summary: template.summarize(validated),
        issuedAt: existing?.issuedAt ?? new Date().toISOString(),
        source: "single",
      });
      notifyArchiveChanged();
    },
    [template],
  );

  const onExport = (format: ExportFormat) =>
    handleSubmit(
      async (validated) => {
        const trackingNumber = ensureSerial();
        setBusy(format);
        try {
          await downloadCertificate(template, validated, context, format);
          await persist(validated, trackingNumber);
          toast.success(
            format === "pdf" ? "فایل PDF دانلود شد." : "تصویر گواهی دانلود شد.",
            { description: `شماره پیگیری: ${trackingNumber}` },
          );
        } catch (error) {
          console.error(error);
          toast.error("صدور گواهی ناموفق بود.", {
            description: error instanceof Error ? error.message : undefined,
          });
        } finally {
          setBusy(null);
        }
      },
      () => toast.error("لطفاً خطاهای فرم را برطرف کنید."),
    );

  const onSaveOnly = handleSubmit(
    async (validated) => {
      const trackingNumber = ensureSerial();
      setBusy("save");
      try {
        await persist(validated, trackingNumber);
        toast.success("گواهی در آرشیو ذخیره شد.", {
          description: `شماره پیگیری: ${trackingNumber}`,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "ذخیره‌سازی ناموفق بود.");
      } finally {
        setBusy(null);
      }
    },
    () => toast.error("لطفاً خطاهای فرم را برطرف کنید."),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      {/* ---------------------------------------------------------------- */}
      <div className="min-w-0 space-y-6">
        <TemplatePicker value={templateId} onChange={handleTemplateChange} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">اطلاعات گواهی</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
              <TemplateForm
                template={template}
                control={control}
                setValue={setValue}
                values={values}
                errors={formState.errors as Record<string, { message?: string }>}
              />

            </form>
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      <div className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="overflow-hidden py-0">
          <div className="bg-muted/40 p-4 sm:p-6">
            <div className="mx-auto max-w-4xl overflow-hidden rounded-md shadow-lg">
              <CertificateStage template={template} values={values} context={context} />
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onExport("png")} disabled={busy !== null}>
            <FileImage className="size-4" />
            {busy === "png" ? "در حال ساخت…" : "دانلود تصویر"}
          </Button>
          <Button variant="secondary" onClick={onExport("pdf")} disabled={busy !== null}>
            <FileText className="size-4" />
            {busy === "pdf" ? "در حال ساخت…" : "دانلود PDF"}
          </Button>
          <Button variant="outline" onClick={onSaveOnly} disabled={busy !== null}>
            <Save className="size-4" />
            ذخیره در آرشیو
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            onClick={() => {
              reset(template.sample as Values);
              startNewCertificate();
              toast.info("داده‌های نمونه بارگذاری شد.");
            }}
          >
            <Wand2 className="size-4" />
            نمونه
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              reset(template.defaults as Values);
              startNewCertificate();
            }}
          >
            <RotateCcw className="size-4" />
            پاک کردن
          </Button>
        </div>

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Download className="size-3.5" />
          {`خروجی همیشه با ابعاد ثابت ${toPersianDigits(template.size.width * 2)}×${toPersianDigits(template.size.height * 2)} پیکسل ساخته می‌شود؛ نوع نمایشگر روی نتیجه اثری ندارد.`}
        </p>
      </div>
    </div>
  );
}
