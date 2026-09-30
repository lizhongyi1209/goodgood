import { CanvasPage } from "../../../features/canvas/canvas-page";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanvasPage initialProjectId={projectId} />;
}
