import { Bell, Plus } from "lucide-react";
import { alerts } from "@/lib/market-data";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_STYLE: Record<string, string> = {
  Active: "border-up/25 bg-up/10 text-up",
  Paused: "border-border bg-muted/40 text-muted-foreground",
  Triggered: "border-down/25 bg-down/10 text-down",
};

/**
 * Compact alerts dropdown — statuses are demo data today; wiring to the
 * backend alerts API can slot in behind the same trigger.
 */
export function AlertsPopover({ compact = false }: { compact?: boolean }) {
  const activeCount = alerts.filter((a) => a.status === "Active").length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Alerts"
          aria-label="Alerts"
          className="relative grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Bell className="size-3.5" />
          {activeCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="px-3 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          Price alerts
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-72 overflow-y-auto px-1 py-1">
          {alerts.map((a) => (
            <DropdownMenuItem
              key={a.id}
              className="flex items-center justify-between gap-2 px-2 py-2"
              onSelect={(e) => e.preventDefault()}
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-foreground">
                  {a.asset} · {a.condition} {a.target}
                </span>
                <span className="block text-[10px] text-muted-foreground">{a.created}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                  STATUS_STYLE[a.status] ?? "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {a.status}
              </span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center gap-1.5 py-2 text-[11px] font-medium text-primary"
          onSelect={(e) => e.preventDefault()}
        >
          <Plus className="size-3.5" />
          Create alert
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
