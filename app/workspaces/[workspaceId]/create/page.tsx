import Home from "@/app/page";

export default async function WorkspaceCreationPage({
  params,
}: Readonly<{ params: Promise<Readonly<{ workspaceId: string }>> }>) {
  const { workspaceId } = await params;
  return <Home workspaceId={workspaceId} />;
}
