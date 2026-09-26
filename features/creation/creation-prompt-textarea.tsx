"use client";

import { useEffect, useRef } from "react";

import { Textarea } from "@/components/ui/textarea";

type CreationPromptTextareaProps = Readonly<{
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
}>;

function resizePromptTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  const styles = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
  const maxHeight = lineHeight * 8 + verticalPadding;
  element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
  const hasOverflow = element.scrollHeight > maxHeight;
  element.style.overflowY = hasOverflow ? "auto" : "hidden";
  element.classList.toggle("has-overflow", hasOverflow);
}

export function CreationPromptTextarea({ label, placeholder, value, onValueChange }: CreationPromptTextareaProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    const handleResize = () => resizePromptTextarea(element);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (inputRef.current) resizePromptTextarea(inputRef.current);
  }, [value]);

  return <Textarea
    ref={inputRef}
    aria-label={label}
    value={value}
    rows={1}
    placeholder={placeholder}
    className="field-sizing-fixed rounded-none border-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
    onChange={(event) => {
      onValueChange(event.target.value);
      resizePromptTextarea(event.currentTarget);
    }}
  />;
}
