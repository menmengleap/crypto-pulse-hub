import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { assets, news, fmtPct, fmtPrice } from "@/lib/market-data";
import { cn } from "@/lib/utils";

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search assets, news and pages…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Assets">
          {assets.slice(0, 8).map((a) => (
            <CommandItem key={a.id} value={`${a.symbol} ${a.name}`} onSelect={() => go("/chart")}>
              <span className="grid size-6 place-items-center rounded-md text-[10px] font-bold" style={{ background: `${a.color}22`, color: a.color }}>
                {a.symbol.slice(0, 2)}
              </span>
              <span className="font-medium">{a.symbol}</span>
              <span className="text-muted-foreground">{a.name}</span>
              <span className="ml-auto num text-xs text-muted-foreground">{fmtPrice(a.price)}</span>
              <span className={cn("num text-xs", a.change24h >= 0 ? "text-up" : "text-down")}>{fmtPct(a.change24h)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="News">
          {news.slice(0, 4).map((n) => (
            <CommandItem key={n.id} value={n.title} onSelect={() => go(`/news/${n.id}`)}>
              <span className="truncate">{n.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Pages">
          {[
            ["Market Overview", "/market"],
            ["Advanced Chart", "/chart"],
            ["Market Screener", "/screener"],
            ["AI Analysis", "/ai-analysis"],
            ["Fear & Greed", "/fear-greed"],
          ].map(([label, to]) => (
            <CommandItem key={to} value={label as string} onSelect={() => go(to as string)}>
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
