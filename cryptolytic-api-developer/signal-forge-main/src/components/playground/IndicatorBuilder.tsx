import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { IndicatorConfig, IndicatorType } from "@/types/indicator";
import { INDICATORS, INDICATOR_MAP, defaultConfig } from "@/lib/indicators";
import { LIMITS } from "@/lib/api/config";

export function IndicatorBuilder({
  indicators,
  onChange,
}: {
  indicators: IndicatorConfig[];
  onChange: (next: IndicatorConfig[]) => void;
}) {
  function add(type: IndicatorType) {
    if (indicators.length >= LIMITS.maxIndicators) {
      toast.error(`Maximum ${LIMITS.maxIndicators} indicators per request`);
      return;
    }
    onChange([...indicators, defaultConfig(type)]);
  }

  function setParam(index: number, key: string, raw: string) {
    const next = indicators.slice();
    const current = next[index];
    if (!current) return;
    next[index] = {
      ...current,
      params: { ...current.params, [key]: raw === "" ? Number.NaN : Number(raw) },
    };
    onChange(next);
  }

  return (
    <section className="panel p-4" aria-label="Indicator builder">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="mono-label">Indicators</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {indicators.length} of {LIMITS.maxIndicators} configured
          </p>
        </div>
        <select
          aria-label="Add indicator"
          value=""
          onChange={(event) => {
            if (event.target.value) add(event.target.value as IndicatorType);
          }}
          className="h-9 rounded-md border border-border bg-surface-2 px-2.5 text-xs text-foreground focus:border-border-strong focus:outline-none"
        >
          <option value="">+ Add indicator</option>
          {INDICATORS.map((meta) => (
            <option key={meta.type} value={meta.type}>
              {meta.short}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {indicators.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            At least one indicator is required.
          </p>
        )}
        {indicators.map((indicator, index) => {
          const meta = INDICATOR_MAP[indicator.type];
          return (
            <div key={`${indicator.type}-${index}`} className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs uppercase tracking-widest text-foreground">
                    {meta?.short ?? indicator.type}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-subtle">{meta?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(indicators.filter((_, i) => i !== index))}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-destructive/40 hover:text-foreground"
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                  Remove
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {(meta?.params ?? []).map((spec) => (
                  <label key={spec.key} className="flex flex-col gap-1">
                    <span className="mono-label">{spec.label}</span>
                    <input
                      value={
                        Number.isFinite(indicator.params[spec.key])
                          ? String(indicator.params[spec.key])
                          : ""
                      }
                      onChange={(event) => setParam(index, spec.key, event.target.value)}
                      inputMode="decimal"
                      className="h-8 w-24 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground focus:border-border-strong focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {indicators.length < LIMITS.maxIndicators && (
        <button
          type="button"
          onClick={() => add("sma")}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add indicator
        </button>
      )}
    </section>
  );
}
