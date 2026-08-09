import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { type NewsItem } from "@/lib/market-data";

function sentimentClass(s: string) {
  return s === "Bullish"
    ? "bg-up/10 text-up"
    : s === "Bearish"
      ? "bg-down/10 text-down"
      : "bg-muted text-muted-foreground";
}

export function FeaturedNewsCard({
  item,
  titleLevel = "h2",
  onSelect,
}: {
  item: NewsItem;
  titleLevel?: "h2" | "h3";
  onSelect?: (item: NewsItem) => void;
}) {
  const Title = titleLevel;
  const cls = "panel group block w-full overflow-hidden text-left";
  const inner = (
    <>
      <div className="aspect-[16/8] overflow-hidden">
        <img
          src={item.image}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">{item.category}</span>
          <span className={cn("rounded-md px-2 py-0.5", sentimentClass(item.sentiment))}>
            {item.sentiment}
          </span>
          <span className="text-muted-foreground">
            {item.source} · {item.time}
          </span>
        </div>
        <Title className="mt-3 text-xl font-semibold tracking-tight">{item.title}</Title>
        <p className="mt-2 text-sm text-muted-foreground">{item.excerpt}</p>
      </div>
    </>
  );
  return onSelect ? (
    <button type="button" onClick={() => onSelect(item)} className={cls}>
      {inner}
    </button>
  ) : (
    <Link to="/news/$newsId" params={{ newsId: item.id }} className={cls}>
      {inner}
    </Link>
  );
}

export function NewsCard({
  item,
  titleLevel = "h3",
  onSelect,
}: {
  item: NewsItem;
  titleLevel?: "h3" | "h4";
  onSelect?: (item: NewsItem) => void;
}) {
  const Title = titleLevel;
  const cls = "panel group block w-full overflow-hidden text-left";
  const inner = (
    <>
      <div className="aspect-[16/9] overflow-hidden">
        <img
          src={item.image}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-md bg-accent px-2 py-0.5 text-muted-foreground">
            {item.category}
          </span>
          <span className={cn("rounded-md px-2 py-0.5", sentimentClass(item.sentiment))}>
            {item.sentiment}
          </span>
        </div>
        <Title className="mt-2 line-clamp-2 text-sm font-semibold">{item.title}</Title>
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{item.excerpt}</p>
        <p className="mt-2 truncate text-[11px] text-muted-foreground">
          {item.source} · {item.time} · {item.assets.join(", ")}
        </p>
      </div>
    </>
  );
  return onSelect ? (
    <button type="button" onClick={() => onSelect(item)} className={cls}>
      {inner}
    </button>
  ) : (
    <Link to="/news/$newsId" params={{ newsId: item.id }} className={cls}>
      {inner}
    </Link>
  );
}

export function LatestNewsList({
  items,
  onSelect,
}: {
  items: NewsItem[];
  onSelect?: (item: NewsItem) => void;
}) {
  const cls = "block w-full px-4 py-3 text-left transition-colors hover:bg-accent/40";
  return (
    <ul className="divide-y divide-border">
      {items.map((n) => {
        const inner = (
          <>
            <p className="line-clamp-2 text-xs font-medium">{n.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {n.source} · {n.time}
            </p>
          </>
        );
        return (
          <li key={n.id}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(n)} className={cls}>
                {inner}
              </button>
            ) : (
              <Link to="/news/$newsId" params={{ newsId: n.id }} className={cls}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TrendingTopics({ topics }: { topics: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((t) => (
        <span
          key={t}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
