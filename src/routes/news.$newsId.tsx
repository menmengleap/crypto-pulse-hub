import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/market/ui";
import { news } from "@/lib/market-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/news/$newsId")({
  loader: ({ params }) => {
    const article = news.find((n) => n.id === params.newsId);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article not found — Cryptolytic" }, { name: "robots", content: "noindex" }] };
    }
    const a = loaderData.article;
    return {
      meta: [
        { title: `${a.title} — Cryptolytic` },
        { name: "description", content: a.excerpt },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.excerpt },
        { property: "og:image", content: a.image },
        { name: "twitter:image", content: a.image },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData();
  const related = news.filter((n) => n.id !== article.id).slice(0, 4);
  const tone =
    article.sentiment === "Bullish" ? "bg-up/10 text-up" : article.sentiment === "Bearish" ? "bg-down/10 text-down" : "bg-muted text-muted-foreground";

  return (
    <AppShell title="Article" subtitle={article.category}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <article className="panel overflow-hidden">
          <img src={article.image} alt="" className="aspect-[16/7] w-full object-cover" />
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">{article.category}</span>
              <span className={cn("rounded-md px-2 py-0.5", tone)}>{article.sentiment}</span>
              <span className="text-muted-foreground">
                {article.source} · {article.time} · {article.readTime}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{article.title}</h1>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              {article.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </article>

        <div className="space-y-4">
          <Panel title="AI summary">
            <p className="text-sm text-muted-foreground">{article.excerpt}</p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>· Sentiment read: {article.sentiment.toLowerCase()}</li>
              <li>· Primary assets affected: {article.assets.join(", ")}</li>
              <li>· Expected impact window: 1–3 sessions</li>
            </ul>
          </Panel>

          <Panel title="Related assets">
            <div className="flex flex-wrap gap-2">
              {article.assets.map((s) => (
                <Link key={s} to="/chart" className="rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/40">
                  {s} · View chart
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Market impact">
            <div className="space-y-3">
              {[
                ["Short term", 72],
                ["Medium term", 54],
                ["Structural", 31],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{k}</span>
                    <span className="num">{v}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Related news" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {related.map((n) => (
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
    </AppShell>
  );
}
