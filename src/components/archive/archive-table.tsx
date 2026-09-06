"use client";

import { Eye, FileImage, FileText, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CertificateStage } from "@/components/certificate/certificate-stage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useArchive } from "@/hooks/use-archive";
import { formatJalaliLong } from "@/lib/jalali";
import { dateToJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/persian";
import { downloadCertificate, type ExportFormat } from "@/lib/render/export";
import { certificateRepository, notifyArchiveChanged } from "@/lib/storage";
import type { CertificateRecord } from "@/lib/storage";
import { findTemplate } from "@/lib/templates/registry";

export function ArchiveTable() {
  const { records, loading } = useArchive();
  const [query, setQuery] = useState("");
  const [previewed, setPreviewed] = useState<CertificateRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((record) =>
      [record.serial, record.summary.primary, record.summary.secondary]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [records, query]);

  async function reissue(record: CertificateRecord, format: ExportFormat) {
    const template = findTemplate(record.templateId);
    if (!template) {
      toast.error("قالب این گواهی دیگر در برنامه وجود ندارد.");
      return;
    }

    setBusyId(record.id);
    try {
      await downloadCertificate(
        template,
        record.values,
        { serial: record.serial },
        format,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ساخت خروجی ناموفق بود.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(record: CertificateRecord) {
    await certificateRepository.remove(record.id);
    notifyArchiveChanged();
    toast.success("گواهی از آرشیو حذف شد.");
  }

  const previewTemplate = previewed ? findTemplate(previewed.templateId) : null;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجو بر اساس نام، دوره یا شماره پیگیری"
          className="h-10 ps-9"
        />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>فراگیر</TableHead>
                <TableHead>دوره</TableHead>
                <TableHead className="w-40">شماره پیگیری</TableHead>
                <TableHead className="w-36">تاریخ صدور</TableHead>
                <TableHead className="w-44 text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-12 text-center">
                    در حال بارگذاری…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-12 text-center">
                    {records.length === 0
                      ? "هنوز گواهی‌ای صادر نشده است."
                      : "نتیجه‌ای یافت نشد."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.summary.primary}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.summary.secondary}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{record.serial}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatJalaliLong(dateToJalali(new Date(record.issuedAt)))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="پیش‌نمایش"
                          onClick={() => setPreviewed(record)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="دانلود تصویر"
                          disabled={busyId === record.id}
                          onClick={() => reissue(record, "png")}
                        >
                          <FileImage className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="دانلود PDF"
                          disabled={busyId === record.id}
                          onClick={() => reissue(record, "pdf")}
                        >
                          <FileText className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="حذف"
                          className="text-destructive hover:text-destructive"
                          onClick={() => remove(record)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {records.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {toPersianDigits(records.length)} گواهی در این مرورگر ذخیره شده است.
        </p>
      ) : null}

      <Dialog open={previewed !== null} onOpenChange={(open) => !open && setPreviewed(null)}>
        <DialogContent className="max-w-4xl! sm:max-w-4xl!">
          <DialogHeader>
            <DialogTitle>{previewed?.summary.primary}</DialogTitle>
          </DialogHeader>
          {previewed && previewTemplate ? (
            <div className="overflow-hidden rounded-md border">
              <CertificateStage
                template={previewTemplate}
                values={previewed.values}
                context={{ serial: previewed.serial }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
