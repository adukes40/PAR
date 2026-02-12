import { PageHeader } from "@/components/layout/page-header";
import { RequestForm } from "@/components/requests/request-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewRequestPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { buildingId: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Position Authorization Request"
        description="Fill out the form below to request authorization for a new or replacement position."
      />

      <RequestForm mode="create" defaultBuildingId={user?.buildingId} />
    </div>
  );
}
