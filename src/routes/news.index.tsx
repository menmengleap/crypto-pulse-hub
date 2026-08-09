import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/market/ui";
import { news, newsCategories, trendingTopics } from "@/lib/market-data";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Crypto News — Cryptolytic" },
      { name: "description", content: "Crypto news with sentiment tags, related assets and market impact context." },
      { property: "og:title", content: "Crypto News — Cryptolytic" },
      { property: "og:description", content: "Market-relevant crypto headlines, filtered and tagged for analysts." },
    ],
  }),
  component: NewsPage,
});

function sentimentClass(s: string) {
  return s === "Bullish" ? "bg-up/10 text-up" : s === "Bearish" ? "bg-down/10 text-down" : "bg-muted text-muted-foreground";
}

function NewsPage() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const list = news.filter(
    (n) => (cat === "All" || n.category === cat) && n.title.toLowerCase().includes(q.toLowerCase()),
  );
  const featured = list[0];
  const rest = list.slice(1);

  return (
    <AppShell title="News" subtitle="Market-moving headlines">
      <div className="space-y-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            {newsCategories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                  cat === c ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search news" className="h-9 w-40 text-xs sm:w-56" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {featured && (
              <Link to="/news/$newsId" params={{ newsId: featured.id }} className="panel group block overflow-hidden">
                <div className="aspect-[16/8] overflow-hidden">
                  <img src={featured.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">{featured.category}</span>
                    <span className={cn("rounded-md px-2 py-0.5", sentimentClass(featured.sentiment))}>{featured.sentiment}</span>
                    <span className="text-muted-foreground">{featured.source} · {featured.time}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight">{featured.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{featured.excerpt}</p>
                </div>
              </Link>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {rest.map((n) => (
                <Link key={n.id} to="/news/$newsId" params={{ newsId: n.id }} className="panel group overflow-hidden">
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={n.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-md bg-accent px-2 py-0.5 text-muted-foreground">{n.category}</span>
                      <span className={cn("rounded-md px-2 py-0.5", sentimentClass(n.sentiment))}>{n.sentiment}</span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold">{n.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{n.excerpt}</p>
                    <p className="mt-2 truncate text-[11px] text-muted-foreground">{n.source} · {n.time} · {n.assets.join(", ")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Panel title="Trending topics">
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((t) => (
                  <span key={t} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </Panel>
            <Panel title="Latest" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {news.slice(0, 6).map((n) => (
                  <li key={n.id}>
                    <Link to="/news/$newsId" params={{ newsId: n.id }} className="block px-4 py-3 transition-colors hover:bg-accent/40">
                      <p className="line-clamp-2 text-xs font-medium">{n.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{n.source} · {n.time}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
