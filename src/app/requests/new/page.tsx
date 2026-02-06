import { PageHeader } from "@/components/layout/page-header";
import { RequestForm } from "@/components/requests/request-form";

export default function NewRequestPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Position Authorization Request"
        description="Fill out the form below to request authorization for a new or replacement position."
      />

      <RequestForm mode="create" />
    </div>
  );
}
