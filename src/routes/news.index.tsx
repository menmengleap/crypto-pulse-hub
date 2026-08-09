import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Newspaper } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/market/ui";
import {
  FeaturedNewsCard,
  LatestNewsList,
  NewsCard,
  TrendingTopics,
} from "@/components/market/news-cards";
import { news, newsCategories, trendingTopics } from "@/lib/market-data";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Crypto News — Cryptolytic" },
      {
        name: "description",
        content: "Crypto news with sentiment tags, related assets and market impact context.",
      },
      { property: "og:title", content: "Crypto News — Cryptolytic" },
      {
        property: "og:description",
        content: "Market-relevant crypto headlines, filtered and tagged for analysts.",
      },
    ],
  }),
  component: NewsPage,
});

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
                  cat === c
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search news"
            aria-label="Search news"
            className="h-9 w-40 text-xs sm:w-56"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {list.length === 0 && (
              <div className="panel flex flex-col items-center justify-center px-6 py-14 text-center">
                <Newspaper className="size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No matching news</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a different category or search term.
                </p>
              </div>
            )}
            {featured && <FeaturedNewsCard item={featured} />}

            <div className="grid gap-4 sm:grid-cols-2">
              {rest.map((n) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Panel title="Trending topics">
              <TrendingTopics topics={trendingTopics} />
            </Panel>
            <Panel title="Latest" bodyClassName="p-0">
              <LatestNewsList items={news.slice(0, 6)} />
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
