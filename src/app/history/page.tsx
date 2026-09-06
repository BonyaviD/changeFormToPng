import { ArchiveTable } from "@/components/archive/archive-table";
import { PageHeader } from "@/components/layout/page-header";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="آرشیو گواهی‌ها"
        description="هر گواهی که صادر یا ذخیره می‌کنید اینجا می‌ماند و هر زمان قابل صدور دوباره است."
      />
      <ArchiveTable />
    </div>
  );
}
