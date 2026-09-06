import { BulkWorkspace } from "@/components/bulk/bulk-workspace";
import { PageHeader } from "@/components/layout/page-header";

export default function BulkPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="صدور گروهی"
        description="یک فایل اکسل یا CSV بارگذاری کنید تا برای هر سطر یک گواهی ساخته و همه در یک فایل ZIP دانلود شود."
      />
      <BulkWorkspace />
    </div>
  );
}
