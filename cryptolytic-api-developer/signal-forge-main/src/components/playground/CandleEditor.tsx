import { useMemo, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { Candle } from "@/types/indicator";
import { LIMITS } from "@/lib/api/config";
import { parseCandles } from "@/lib/indicators";
import { cn } from "@/lib/utils";

const FIELDS: { key: keyof Candle; label: string; width: string }[] = [
  { key: "time", label: "Time", width: "min-w-[7.5rem]" },
  { key: "open", label: "Open", width: "min-w-[6rem]" },
  { key: "high", label: "High", width: "min-w-[6rem]" },
  { key: "low", label: "Low", width: "min-w-[6rem]" },
  { key: "close", label: "Close", width: "min-w-[6rem]" },
  { key: "volume", label: "Volume", width: "min-w-[6rem]" },
];

/** Documented example payload from the API reference — not market data. */
export const EXAMPLE_CANDLES: Candle[] = Array.from({ length: 8 }, (_, i) => ({
  time: 1700000000 + i * 14400,
  open: 42000 + i * 120,
  high: 42500 + i * 120,
  low: 41800 + i * 120,
  close: 42300 + i * 120,
  volume: 1200.5 + i * 10,
}));

export function CandleEditor({
  candles,
  onChange,
  rowErrors,
}: {
  candles: Candle[];
  onChange: (candles: Candle[]) => void;
  rowErrors: Set<number>;
}) {
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");

  const visible = useMemo(() => candles.slice(-200), [candles]);
  const hiddenCount = candles.length - visible.length;

  function update(index: number, field: keyof Candle, raw: string) {
    const next = candles.slice();
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, [field]: raw === "" ? Number.NaN : Number(raw) };
    onChange(next);
  }

  function addCandle() {
    if (candles.length >= LIMITS.maxCandles) {
      toast.error(`Maximum ${LIMITS.maxCandles} candles reached`);
      return;
    }
    const last = candles[candles.length - 1];
    const base: Candle = last
      ? { ...last, time: last.time + 14400 }
      : { time: Math.floor(Date.now() / 1000), open: 0, high: 0, low: 0, close: 0, volume: 0 };
    onChange([...candles, base]);
  }

  function applyImport() {
    const { candles: parsed, error } = parseCandles(importText);
    if (error) {
      toast.error(error);
      return;
    }
    onChange(parsed);
    setImporting(false);
    setImportText("");
    toast.success(`Imported ${parsed.length} candles`);
  }

  return (
    <section className="panel overflow-hidden" aria-label="Candle editor">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="mono-label">Candles</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {candles.length} rows · {LIMITS.minCandles}–{LIMITS.maxCandles} allowed
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ToolButton onClick={addCandle} icon={<Plus className="h-3 w-3" />}>
            Add
          </ToolButton>
          <ToolButton onClick={() => setImporting(true)} icon={<Upload className="h-3 w-3" />}>
            Import JSON
          </ToolButton>
          <ToolButton onClick={() => onChange(EXAMPLE_CANDLES)}>Example rows</ToolButton>
          <ToolButton onClick={() => onChange([])} icon={<X className="h-3 w-3" />}>
            Clear
          </ToolButton>
        </div>
      </header>

      {importing && (
        <div className="border-b border-border bg-surface-2 p-4">
          <label htmlFor="candle-import" className="mono-label">
            Paste a candle array
          </label>
          <textarea
            id="candle-import"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={6}
            spellCheck={false}
            placeholder='[{"time":1700000000,"open":42000,"high":42500,"low":41800,"close":42300,"volume":1200.5}]'
            className="scroll-thin mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={applyImport}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => setImporting(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {candles.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No candles yet. Add rows, import a JSON array, or load the documented example payload.
        </p>
      ) : (
        <div className="scroll-thin overflow-x-auto">
          {hiddenCount > 0 && (
            <p className="border-b border-border px-4 py-2 text-xs text-subtle">
              Showing the most recent 200 of {candles.length} rows. All rows are sent with the
              request.
            </p>
          )}
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {FIELDS.map((field) => (
                  <th key={field.key} scope="col" className={cn("px-3 py-2", field.width)}>
                    <span className="mono-label">{field.label}</span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((candle, i) => {
                const index = i + hiddenCount;
                const invalid = rowErrors.has(index);
                return (
                  <tr
                    key={index}
                    className={cn(
                      "border-b border-border/60 last:border-0",
                      invalid && "bg-destructive/5",
                    )}
                  >
                    {FIELDS.map((field) => (
                      <td key={field.key} className="px-2 py-1">
                        <input
                          aria-label={`${field.label} for row ${index + 1}`}
                          value={Number.isFinite(candle[field.key]) ? String(candle[field.key]) : ""}
                          onChange={(event) => update(index, field.key, event.target.value)}
                          inputMode="decimal"
                          className={cn(
                            "h-8 w-full rounded border border-transparent bg-transparent px-2 font-mono text-xs text-foreground focus:border-border-strong focus:bg-background focus:outline-none",
                            invalid && "border-destructive/40",
                          )}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        aria-label={`Remove row ${index + 1}`}
                        onClick={() => onChange(candles.filter((_, r) => r !== index))}
                        className="grid h-7 w-7 place-items-center rounded border border-transparent text-subtle transition-colors hover:border-border hover:text-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ToolButton({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      {icon}
      {children}
    </button>
  );
}
