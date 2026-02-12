import { PageHeader } from "@/components/layout/page-header";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure application settings including Google OAuth for single sign-on."
      />

      <SettingsManager />
    </div>
  );
}
