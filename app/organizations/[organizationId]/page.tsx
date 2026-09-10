import { OrganizationManagementPage } from "@/features/organizations/organization-management-page";

export default async function OrganizationPage({ params }: Readonly<{
  params: Promise<Readonly<{ organizationId: string }>>;
}>) {
  const { organizationId } = await params;
  return <OrganizationManagementPage activeTab="overview" workspaceId={organizationId} />;
}
