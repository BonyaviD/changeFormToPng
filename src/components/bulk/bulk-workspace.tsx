"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Package,
  Upload,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CertificateStage } from "@/components/certificate/certificate-stage";
import { TemplatePicker } from "@/components/certificate/template-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateBulkArchive, type BulkProgress } from "@/lib/bulk/generate";
import { buildImportTemplateCsv, mapSheetToRows, type MappingResult } from "@/lib/bulk/mapping";
import { parseSpreadsheet } from "@/lib/bulk/parse";
import { toPersianDigits } from "@/lib/persian";
import { downloadBlob } from "@/lib/render/download";
import { certificateRepository, notifyArchiveChanged } from "@/lib/storage";
import { DEFAULT_TEMPLATE_ID, getTemplate } from "@/lib/templates/registry";

export function BulkWorkspace() {
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const template = useMemo(() => getTemplate(templateId), [templateId]);

  const [fileName, setFileName] = useState<string>();
  const [mapping, setMapping] = useState<MappingResult>();
  const [asPdf, setAsPdf] = useState(false);
  const [progress, setProgress] = useState<BulkProgress>();
  const inputRef = useRef<HTMLInputElement>(null);

  const validCount = mapping?.rows.filter((row) => row.valid).length ?? 0;
  const invalidCount = (mapping?.rows.length ?? 0) - validCount;
  const firstValid = mapping?.rows.find((row) => row.valid);

  async function handleFile(file: File) {
    setProgress(undefined);
    try {
      const table = await parseSpreadsheet(file);
      const result = mapSheetToRows(template, table);
      setMapping(result);
      setFileName(file.name);

      if (result.missingFields.length > 0) {
        toast.warning("بعضی ستون‌ها پیدا نشد.", {
          description: result.missingFields.map((field) => field.label).join("، "),
        });
      }
    } catch (error) {
      setMapping(undefined);
      setFileName(undefined);
      toast.error(error instanceof Error ? error.message : "خواندن فایل ناموفق بود.");
    }
  }

  async function handleGenerate() {
    if (!mapping) return;
    setProgress({ completed: 0, total: validCount, currentLabel: "" });

    try {
      const { zip, records } = await generateBulkArchive(
        template,
        mapping.rows,
        { format: asPdf ? "pdf" : "png" },
        setProgress,
      );

      downloadBlob(zip, `certificates-${new Date().toISOString().slice(0, 10)}.zip`);
      await certificateRepository.saveMany(records);
      notifyArchiveChanged();

      toast.success(`${toPersianDigits(records.length)} گواهی صادر شد.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "صدور گروهی ناموفق بود.");
    } finally {
      setProgress(undefined);
    }
  }

  function downloadCsvTemplate() {
    const csv = buildImportTemplateCsv(template);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "import-template.csv");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <TemplatePicker value={templateId} onChange={setTemplateId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">فایل ورودی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="hover:border-primary hover:bg-primary/5 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors"
            >
              <Upload className="text-muted-foreground size-6" />
              <span className="text-sm font-medium">
                {fileName ?? "انتخاب فایل اکسل یا CSV"}
              </span>
              <span className="text-muted-foreground text-xs">
                هر سطر یک گواهی. ستون‌ها با نام فارسی شناسایی می‌شوند.
              </span>
            </button>

            <Button variant="outline" className="w-full" onClick={downloadCsvTemplate}>
              <FileSpreadsheet className="size-4" />
              دانلود فایل نمونه
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">تنظیمات خروجی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label
              htmlFor="bulk-pdf"
              className="hover:bg-muted/60 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm"
            >
              خروجی PDF به‌جای تصویر
              <Switch id="bulk-pdf" checked={asPdf} onCheckedChange={setAsPdf} />
            </Label>

            <Button
              className="w-full"
              disabled={!mapping || validCount === 0 || progress !== undefined}
              onClick={handleGenerate}
            >
              <Package className="size-4" />
              {progress
                ? `در حال صدور… ${toPersianDigits(progress.completed)}/${toPersianDigits(progress.total)}`
                : `صدور ${toPersianDigits(validCount)} گواهی و دانلود ZIP`}
            </Button>

            {progress ? (
              <div className="space-y-2">
                <Progress value={(progress.completed / progress.total) * 100} />
                <p className="text-muted-foreground truncate text-xs">
                  {progress.currentLabel}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        {!mapping ? (
          <Card>
            <CardContent className="text-muted-foreground py-16 text-center text-sm">
              پس از انتخاب فایل، پیش‌نمایش ردیف‌ها اینجا نمایش داده می‌شود.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <CheckCircle2 className="text-success size-3.5" />
                {toPersianDigits(validCount)} ردیف آماده
              </Badge>
              {invalidCount > 0 ? (
                <Badge variant="secondary" className="gap-1.5">
                  <XCircle className="text-destructive size-3.5" />
                  {toPersianDigits(invalidCount)} ردیف دارای خطا
                </Badge>
              ) : null}
              {mapping.unmatchedHeaders.length > 0 ? (
                <Badge variant="outline">
                  ستون‌های نادیده‌گرفته‌شده: {mapping.unmatchedHeaders.join("، ")}
                </Badge>
              ) : null}
            </div>

            {mapping.missingFields.length > 0 ? (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertTitle>ستون‌های پیدانشده</AlertTitle>
                <AlertDescription>
                  برای این فیلدها ستونی در فایل نبود و مقدار پیش‌فرض قالب استفاده
                  می‌شود: {mapping.missingFields.map((field) => field.label).join("، ")}
                </AlertDescription>
              </Alert>
            ) : null}

            {firstValid ? (
              <Card className="overflow-hidden py-0">
                <div className="bg-muted/40 p-4">
                  <div className="mx-auto max-w-3xl overflow-hidden rounded-md shadow">
                    <CertificateStage template={template} values={firstValid.values} />
                  </div>
                </div>
              </Card>
            ) : null}

            <Card className="overflow-hidden">
              <ScrollArea className="h-[26rem]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">سطر</TableHead>
                      <TableHead>فراگیر</TableHead>
                      <TableHead>دوره</TableHead>
                      <TableHead className="w-64">وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapping.rows.map((row) => {
                      const summary = template.summarize(row.values);
                      const messages = Object.values(row.errors);
                      return (
                        <TableRow key={row.line}>
                          <TableCell className="text-muted-foreground tabular-nums">
                            {toPersianDigits(row.line)}
                          </TableCell>
                          <TableCell className="font-medium">{summary.primary}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {summary.secondary}
                          </TableCell>
                          <TableCell>
                            {row.valid ? (
                              <span className="text-success inline-flex items-center gap-1.5 text-xs">
                                <CheckCircle2 className="size-3.5" />
                                آماده
                              </span>
                            ) : (
                              <span className="text-destructive inline-flex items-start gap-1.5 text-xs">
                                <XCircle className="mt-0.5 size-3.5 shrink-0" />
                                <span>{messages.join("، ")}</span>
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>

            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Download className="size-3.5" />
              ردیف‌های دارای خطا صادر نمی‌شوند؛ فایل را اصلاح کنید و دوباره بارگذاری
              کنید.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
