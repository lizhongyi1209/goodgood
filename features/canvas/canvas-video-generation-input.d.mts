import type { Connection, Edge } from "@xyflow/react";
import type { CanvasNode } from "./canvas-workspace";
export function isCanvasVideoGenerationConnection(connection: Connection | Edge, nodes: readonly CanvasNode[], edges: readonly Edge[]): boolean;
