import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { type NewsItem } from "@/lib/market-data";
import { cn } from "@/lib/utils";

function tone(s: NewsItem["sentiment"]) {
  return s === "Bullish"
    ? "bg-up/10 text-up"
    : s === "Bearish"
      ? "bg-down/10 text-down"
      : "bg-muted text-muted-foreground";
}

export function NewsArticleDialog({
  item,
  onClose,
}: {
  item: NewsItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-2xl sm:rounded-2xl">
        {item && (
          <>
            <DialogTitle className="sr-only">{item.title}</DialogTitle>
            <DialogDescription className="sr-only">{item.excerpt}</DialogDescription>
            <article>
              <img src={item.image} alt="" className="aspect-[16/7] w-full object-cover" />
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">
                    {item.category}
                  </span>
                  <span className={cn("rounded-md px-2 py-0.5", tone(item.sentiment))}>
                    {item.sentiment}
                  </span>
                  <span className="text-muted-foreground">
                    {item.source} · {item.time} · {item.readTime}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.excerpt}</p>
                <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
                  {item.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Related assets
                  </span>
                  {item.assets.map((s) => (
                    <Link
                      key={s}
                      to="/chart"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/40"
                    >
                      {s} · View chart
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
