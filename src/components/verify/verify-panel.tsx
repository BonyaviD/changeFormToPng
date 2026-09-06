"use client";

import { BadgeCheck, Info, Search, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CertificateStage } from "@/components/certificate/certificate-stage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dateToJalali, formatJalaliLong } from "@/lib/jalali";
import { certificateRepository, type CertificateRecord } from "@/lib/storage";
import { findTemplate } from "@/lib/templates/registry";

type LookupState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; record: CertificateRecord }
  | { status: "missing"; serial: string };

export function VerifyPanel() {
  const searchParams = useSearchParams();
  // A QR scan lands here with the serial already in the URL, so it seeds the
  // field directly. (This subtree is inside a Suspense boundary, so the client
  // owns the render and there is nothing to reconcile against.)
  const serialFromUrl = searchParams.get("serial")?.trim() ?? "";
  const [serial, setSerial] = useState(serialFromUrl);
  const [state, setState] = useState<LookupState>(
    serialFromUrl ? { status: "searching" } : { status: "idle" },
  );

  const resolve = useCallback(async (value: string) => {
    const record = await certificateRepository.findBySerial(value);
    return record
      ? ({ status: "found", record } as const)
      : ({ status: "missing", serial: value } as const);
  }, []);

  const lookup = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      setState({ status: "searching" });
      setState(await resolve(trimmed));
    },
    [resolve],
  );

  // A serial arriving in the URL is looked up on load; the initial state above
  // already reads as "searching", so nothing is set synchronously here.
  useEffect(() => {
    if (!serialFromUrl) return;

    let cancelled = false;
    void resolve(serialFromUrl).then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [serialFromUrl, resolve]);

  const template =
    state.status === "found" ? findTemplate(state.record.templateId) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void lookup(serial);
            }}
          >
            <Input
              value={serial}
              onChange={(event) => setSerial(event.target.value)}
              placeholder="شماره پیگیری گواهی"
              className="h-10 max-w-xs font-mono"
            />
            <Button type="submit" disabled={state.status === "searching"}>
              <Search className="size-4" />
              استعلام
            </Button>
          </form>
        </CardContent>
      </Card>

      {state.status === "missing" ? (
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertTitle>گواهی‌ای با این شماره پیدا نشد</AlertTitle>
          <AlertDescription>
            شماره «{state.serial}» در آرشیو این مرورگر ثبت نشده است.
          </AlertDescription>
        </Alert>
      ) : null}

      {state.status === "found" && template ? (
        <div className="space-y-4">
          <Alert>
            <BadgeCheck className="text-success size-4" />
            <AlertTitle>گواهی معتبر است</AlertTitle>
            <AlertDescription>
              {state.record.summary.primary} — {state.record.summary.secondary} · صادرشده
              در {formatJalaliLong(dateToJalali(new Date(state.record.issuedAt)))}
            </AlertDescription>
          </Alert>

          <Card className="overflow-hidden py-0">
            <div className="bg-muted/40 p-4">
              <div className="mx-auto max-w-3xl overflow-hidden rounded-md shadow">
                <CertificateStage
                  template={template}
                  values={state.record.values}
                  context={{ serial: state.record.serial }}
                />
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <Alert>
        <Info className="size-4" />
        <AlertTitle>محدوده‌ی استعلام</AlertTitle>
        <AlertDescription>
          آرشیو گواهی‌ها در همین مرورگر نگهداری می‌شود، بنابراین استعلام فقط
          گواهی‌هایی را می‌شناسد که روی همین دستگاه صادر شده‌اند. برای استعلام سراسری
          باید آرشیو روی یک سرور مشترک قرار بگیرد.
        </AlertDescription>
      </Alert>
    </div>
  );
}
