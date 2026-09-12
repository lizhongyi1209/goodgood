import { OrganizationManagementPage } from "@/features/organizations/organization-management-page";

export default async function OrganizationMembersPage({ params }: Readonly<{
  params: Promise<Readonly<{ organizationId: string }>>;
}>) {
  const { organizationId } = await params;
  return <OrganizationManagementPage activeTab="members" workspaceId={organizationId} />;
}
