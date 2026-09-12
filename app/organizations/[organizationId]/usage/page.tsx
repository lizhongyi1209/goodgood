import { OrganizationManagementPage } from "@/features/organizations/organization-management-page";

export default async function OrganizationUsagePage({ params }: Readonly<{
  params: Promise<Readonly<{ organizationId: string }>>;
}>) {
  const { organizationId } = await params;
  return <OrganizationManagementPage activeTab="usage" workspaceId={organizationId} />;
}
