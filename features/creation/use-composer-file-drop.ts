import { useState, type DragEvent } from "react";

export function useComposerFileDrop(onFiles: (files: readonly File[]) => void) {
  const [dragActive, setDragActive] = useState(false);
  const hasFiles = (event: DragEvent<HTMLElement>) => Array.from(event.dataTransfer.types).includes("Files");
  return {
    dragActive,
    onDragEnter(event: DragEvent<HTMLElement>) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setDragActive(true);
    },
    onDragOver(event: DragEvent<HTMLElement>) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave(event: DragEvent<HTMLElement>) {
      if (!hasFiles(event)) return;
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setDragActive(false);
    },
    onDrop(event: DragEvent<HTMLElement>) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setDragActive(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
  };
}
