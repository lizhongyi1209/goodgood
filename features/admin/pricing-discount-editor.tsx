"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  applyPricingDiscount,
  parsePricingDiscount,
} from "@/shared/contracts/pricing-discount.mjs";

type DraftPrices = Record<
  string,
  {
    output: string;
    input: string;
    billing?: "tokens";
    qualities?: Record<string, string>;
  }
>;
type DiscountState = {
  value: string;
  baseline?: DraftPrices;
  error?: string;
  message?: string;
};

export function PricingDiscountEditor({
  scope,
  prices,
  onChange,
}: {
  scope: string;
  prices: DraftPrices;
  onChange: (prices: DraftPrices) => void;
}) {
  const [states, setStates] = useState<Record<string, DiscountState>>({});
  const state = states[scope] ?? { value: "100" };
  function apply() {
    try {
      const baseline = state.baseline ?? prices;
      const next = applyPricingDiscount(baseline, state.value);
      const percent = parsePricingDiscount(state.value);
      onChange(next);
      setStates({
        ...states,
        [scope]: {
          ...state,
          baseline: structuredClone(baseline),
          error: undefined,
          message: `已应用${percent === 100 ? "原价" : `${percent / 10} 折`}，保存后生效。`,
        },
      });
    } catch (failure) {
      setStates({
        ...states,
        [scope]: {
          ...state,
          message: undefined,
          error:
            failure instanceof Error
              ? failure.message
              : "无法应用折扣，价格已保留。",
        },
      });
    }
  }
  return (
    <section aria-label="整体折扣" className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          整体折扣
          <Input
            aria-label="整体折扣百分比"
            inputMode="numeric"
            className="w-20 tabular-nums"
            value={state.value}
            onChange={(event) =>
              setStates({
                ...states,
                [scope]: {
                  ...state,
                  value: event.target.value,
                  error: undefined,
                  message: undefined,
                },
              })
            }
          />
          <span className="text-xs text-zinc-500">%</span>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={apply}>
          应用折扣
        </Button>
      </div>
      <p className="text-xs leading-5 text-zinc-400">
        98 = 9.8 折，80 = 8 折，100 =
        原价。调整当前线路全部价格；以首次应用前的价格为基准，不叠加。
      </p>
      <p className="text-xs leading-5 text-zinc-400">
        四舍五入至 0.01 元，正价最低 0.01
        元。保存后再次打开，以已保存价格为新基准。
      </p>
      {state.error && (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-xs text-zinc-600">
          {state.message}
        </p>
      )}
    </section>
  );
}
