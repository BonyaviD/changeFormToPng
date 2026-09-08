import { PageHeader } from "@/components/layout/page-header";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="تنظیمات"
        description="فهرست دوره‌ها، امضاکنندگان و عناوین سربرگ. هر تغییری بلافاصله در فرم صدور اثر می‌کند."
      />
      <SettingsWorkspace />
    </div>
  );
}
