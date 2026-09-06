import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifyPanel } from "@/components/verify/verify-panel";

export default function VerifyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="استعلام گواهی"
        description="شماره پیگیری را وارد کنید یا کد QR روی گواهی را اسکن کنید."
      />
      {/* `useSearchParams` needs a boundary so the shell can still prerender. */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <VerifyPanel />
      </Suspense>
    </div>
  );
}
