import Image from "next/image";
import type { TextGenerationModel } from "@/shared/contracts/text-generation.mjs";

export function TextModelIcon({ icon, size = 16 }: { icon: TextGenerationModel["icon"]; size?: number }) {
  if (icon === "openai" || icon === "bytedance") return <Image src={`/model-icons/${icon === "openai" ? "openai.svg" : "bytedance-color.svg"}`} width={size} height={size} alt="" unoptimized style={{ filter: "grayscale(1)", flexShrink: 0 }} />;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    {icon === "gemini" ? <path d="M12 1C10.6 7.6 7.6 10.6 1 12c6.6 1.4 9.6 4.4 11 11 1.4-6.6 4.4-9.6 11-11C16.4 10.6 13.4 7.6 12 1Z" fill="currentColor" />
      : icon === "claude" ? <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">{Array.from({ length: 12 }, (_, index) => <path key={index} d="M12 2v6" transform={`rotate(${index * 30} 12 12)`} />)}</g>
        : <path d="M3 8c2-2 6-2 9 0 2-3 6-3 8-1l-2 3c2 1 3 3 3 5-2 4-8 6-13 3-3-2-4-5-5-10Zm5 3c2 2 5 3 8 2m0-5 1 1M21 6l1-2M21 6l2 1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>;
}
