"use client";

// Adapted from React Flow UI's Zoom Select for GoodGood's compact canvas controls.
// https://reactflow.dev/ui/components/zoom-select
import { useCallback } from "react";
import { Panel, useReactFlow, useStore, type PanelProps } from "@xyflow/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const zoomLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function ZoomSelect({ className, ...props }: Omit<PanelProps, "children">) {
  const { zoomTo } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const minZoom = useStore((state) => state.minZoom);
  const maxZoom = useStore((state) => state.maxZoom);
  const selectedZoom = zoomLevels.find((level) => Math.abs(level - zoom) < 0.005);

  const handleZoomChange = useCallback(
    (value: string) => {
      void zoomTo(Number(value), { duration: 180 });
    },
    [zoomTo],
  );

  return (
    <Panel className={cn("rounded-md bg-white", className)} {...props}>
      <Select value={selectedZoom?.toString() ?? ""} onValueChange={handleZoomChange}>
        <SelectTrigger aria-label="画布缩放" className="w-[92px] bg-white shadow-none">
          <SelectValue placeholder={`${Math.round(zoom * 100)}%`} />
        </SelectTrigger>
        <SelectContent>
          {zoomLevels.filter((level) => level >= minZoom && level <= maxZoom).map((level) => (
            <SelectItem key={level} value={level.toString()}>
              {Math.round(level * 100)}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Panel>
  );
}
