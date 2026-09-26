"use client";

import type { ReactNode } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ChoiceValue = string | number | boolean;

type Choice<T extends ChoiceValue> = Readonly<{
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}>;

type ParameterChoiceGroupProps<T extends ChoiceValue> = Readonly<{
  label: string;
  className: string;
  value: T;
  options: readonly Choice<T>[];
  onValueChange: (value: T) => void;
}>;

/** A controlled single choice; clicking the active value cannot clear a required parameter. */
export function ParameterChoiceGroup<T extends ChoiceValue>({
  label,
  className,
  value,
  options,
  onValueChange,
}: ParameterChoiceGroupProps<T>) {
  return (
    <ToggleGroup
      type="single"
      spacing={1}
      className={className}
      aria-label={label}
      value={String(value)}
      onValueChange={(next) => {
        const choice = options.find((option) => String(option.value) === next);
        if (choice) onValueChange(choice.value);
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={String(option.value)}
          value={String(option.value)}
          className={option.value === value ? "selected" : undefined}
          disabled={option.disabled}
          title={option.title}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
