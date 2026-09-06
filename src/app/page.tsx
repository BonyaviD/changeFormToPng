import { IssueWorkspace } from "@/components/certificate/issue-workspace";
import { PageHeader } from "@/components/layout/page-header";

export default function IssuePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="صدور گواهی"
        description="فرم را پر کنید، پیش‌نمایش را ببینید و خروجی تصویر یا PDF بگیرید."
      />
      <IssueWorkspace />
    </div>
  );
}
