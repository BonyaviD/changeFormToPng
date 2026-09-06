"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, FileImage, FileText, RotateCcw, Save, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CertificateStage } from "@/components/certificate/certificate-stage";
import { TemplatePicker } from "@/components/certificate/template-picker";
import { TemplateForm } from "@/components/form/template-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { generateQrDataUrl, generateSerial } from "@/lib/qr";
import { downloadCertificate, type ExportFormat } from "@/lib/render/export";
import { certificateRepository, notifyArchiveChanged } from "@/lib/storage";
import { DEFAULT_TEMPLATE_ID, getTemplate } from "@/lib/templates/registry";
import type { ArtworkContext } from "@/lib/templates/types";

type Values = Record<string, unknown>;

export function IssueWorkspace() {
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const template = useMemo(() => getTemplate(templateId), [templateId]);

  const [includeQr, setIncludeQr] = useState(false);
  // Generated after mount: a random serial rendered on the server would not
  // match the one the client produces, and React would tear down the tree.
  const [serial, setSerial] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>();
  const [busy, setBusy] = useState<ExportFormat | "save" | null>(null);

  const form = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(template.schema as any),
    defaultValues: template.defaults as Values,
    mode: "onTouched",
  });

  const { control, watch, handleSubmit, reset, formState } = form;
  const values = watch();

  // Switching template swaps the schema, so the form has to start over.
  useEffect(() => {
    reset(template.defaults as Values);
    setSerial(generateSerial());
  }, [template, reset]);

  useEffect(() => {
    if (!includeQr || !template.supportsQr) {
      setQrDataUrl(undefined);
      return;
    }
    let cancelled = false;
    generateQrDataUrl(serial)
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => toast.error("ساخت کد استعلام ناموفق بود."));
    return () => {
      cancelled = true;
    };
  }, [includeQr, serial, template.supportsQr]);

  const context: ArtworkContext = useMemo(
    () => ({ qrDataUrl, serial: qrDataUrl ? serial : undefined }),
    [qrDataUrl, serial],
  );

  const persist = useCallback(
    async (validated: Values) => {
      await certificateRepository.save({
        id: crypto.randomUUID(),
        serial,
        templateId: template.id,
        templateVersion: template.version,
        values: validated,
        summary: template.summarize(validated),
        issuedAt: new Date().toISOString(),
        source: "single",
      });
      notifyArchiveChanged();
    },
    [serial, template],
  );

  const onExport = (format: ExportFormat) =>
    handleSubmit(
      async (validated) => {
        setBusy(format);
        try {
          await downloadCertificate(template, validated, context, format);
          await persist(validated);
          toast.success(
            format === "pdf" ? "فایل PDF دانلود شد." : "تصویر گواهی دانلود شد.",
            { description: `شماره پیگیری: ${serial}` },
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
      setBusy("save");
      try {
        await persist(validated);
        toast.success("گواهی در آرشیو ذخیره شد.", {
          description: `شماره پیگیری: ${serial}`,
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
        <TemplatePicker value={templateId} onChange={setTemplateId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">اطلاعات گواهی</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
              <TemplateForm
                template={template}
                control={control}
                watch={watch}
                errors={formState.errors as Record<string, { message?: string }>}
              />

              {template.supportsQr ? (
                <>
                  <Separator />
                  <Label
                    htmlFor="include-qr"
                    className="hover:bg-muted/60 flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-3 text-sm transition-colors"
                  >
                    <span className="space-y-1">
                      <span className="block">درج کد استعلام (QR)</span>
                      <span className="text-muted-foreground block text-xs font-normal">
                        شماره پیگیری {serial} روی گواهی چاپ می‌شود.
                      </span>
                    </span>
                    <Switch
                      id="include-qr"
                      checked={includeQr}
                      onCheckedChange={setIncludeQr}
                    />
                  </Label>
                </>
              ) : null}
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
              setSerial(generateSerial());
            }}
          >
            <RotateCcw className="size-4" />
            پاک کردن
          </Button>
        </div>

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Download className="size-3.5" />
          خروجی همیشه با ابعاد ثابت {template.size.width * 2}×{template.size.height * 2}
          پیکسل ساخته می‌شود؛ نوع نمایشگر روی نتیجه اثری ندارد.
        </p>
      </div>
    </div>
  );
}
