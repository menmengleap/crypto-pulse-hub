export type Asset = {
  id: string;
  symbol: string;
  name: string;
  pair: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  rsi: number;
  trend: "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish";
  momentum: "Strong" | "Moderate" | "Weak";
  sector: "Bitcoin" | "Ethereum" | "Layer 1" | "Layer 2" | "DeFi" | "AI" | "Meme" | "Gaming" | "Stablecoin";
  color: string;
  spark: number[];
};

function seededSpark(seed: number, drift: number, len = 32): number[] {
  const out: number[] = [];
  let v = 100;
  let s = seed;
  for (let i = 0; i < len; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const r = (s / 2147483648 - 0.5) * 4;
    v = v + r + drift / len;
    out.push(Number(v.toFixed(2)));
  }
  return out;
}

export const assets: Asset[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", pair: "BTC/USDT", price: 118420.33, change24h: 2.14, change7d: 6.4, marketCap: 2334000000000, volume24h: 48200000000, rsi: 64.2, trend: "Strong Bullish", momentum: "Strong", sector: "Bitcoin", color: "#F7931A", spark: seededSpark(7, 12) },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", pair: "ETH/USDT", price: 4218.71, change24h: 1.42, change7d: 4.1, marketCap: 508000000000, volume24h: 22400000000, rsi: 58.7, trend: "Bullish", momentum: "Moderate", sector: "Ethereum", color: "#7B8CF7", spark: seededSpark(13, 8) },
  { id: "tether", symbol: "USDT", name: "Tether", pair: "USDT/USD", price: 1.0, change24h: 0.01, change7d: -0.01, marketCap: 172000000000, volume24h: 96000000000, rsi: 50.1, trend: "Neutral", momentum: "Weak", sector: "Stablecoin", color: "#2AAE93", spark: seededSpark(21, 0) },
  { id: "solana", symbol: "SOL", name: "Solana", pair: "SOL/USDT", price: 236.44, change24h: -1.86, change7d: 3.2, marketCap: 128000000000, volume24h: 8100000000, rsi: 47.3, trend: "Neutral", momentum: "Moderate", sector: "Layer 1", color: "#14F195", spark: seededSpark(31, -6) },
  { id: "xrp", symbol: "XRP", name: "XRP", pair: "XRP/USDT", price: 2.94, change24h: 3.61, change7d: 9.8, marketCap: 168000000000, volume24h: 6400000000, rsi: 71.4, trend: "Strong Bullish", momentum: "Strong", sector: "Layer 1", color: "#8FA0B5", spark: seededSpark(41, 16) },
  { id: "bnb", symbol: "BNB", name: "BNB", pair: "BNB/USDT", price: 712.08, change24h: 0.54, change7d: -1.4, marketCap: 104000000000, volume24h: 2900000000, rsi: 53.9, trend: "Neutral", momentum: "Moderate", sector: "Layer 1", color: "#F0B90B", spark: seededSpark(53, 2) },
  { id: "cardano", symbol: "ADA", name: "Cardano", pair: "ADA/USDT", price: 0.9312, change24h: -2.74, change7d: -5.9, marketCap: 33000000000, volume24h: 1100000000, rsi: 38.2, trend: "Bearish", momentum: "Weak", sector: "Layer 1", color: "#4C8DF6", spark: seededSpark(61, -10) },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", pair: "DOGE/USDT", price: 0.2186, change24h: 5.12, change7d: 11.2, marketCap: 32000000000, volume24h: 2400000000, rsi: 76.5, trend: "Strong Bullish", momentum: "Strong", sector: "Meme", color: "#C3A634", spark: seededSpark(71, 20) },
  { id: "avalanche", symbol: "AVAX", name: "Avalanche", pair: "AVAX/USDT", price: 41.27, change24h: -3.42, change7d: -7.1, marketCap: 17000000000, volume24h: 780000000, rsi: 31.8, trend: "Bearish", momentum: "Weak", sector: "Layer 1", color: "#E84142", spark: seededSpark(83, -14) },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", pair: "ARB/USDT", price: 0.874, change24h: 4.28, change7d: 8.4, marketCap: 4200000000, volume24h: 410000000, rsi: 68.1, trend: "Bullish", momentum: "Strong", sector: "Layer 2", color: "#2D91E8", spark: seededSpark(97, 14) },
  { id: "optimism", symbol: "OP", name: "Optimism", pair: "OP/USDT", price: 1.842, change24h: -0.92, change7d: 1.1, marketCap: 3100000000, volume24h: 260000000, rsi: 49.6, trend: "Neutral", momentum: "Moderate", sector: "Layer 2", color: "#FF4B4B", spark: seededSpark(101, -2) },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", pair: "UNI/USDT", price: 12.63, change24h: 1.94, change7d: 2.7, marketCap: 7600000000, volume24h: 340000000, rsi: 56.4, trend: "Bullish", momentum: "Moderate", sector: "DeFi", color: "#FF7BC4", spark: seededSpark(103, 6) },
  { id: "aave", symbol: "AAVE", name: "Aave", pair: "AAVE/USDT", price: 318.4, change24h: 6.02, change7d: 14.3, marketCap: 4800000000, volume24h: 420000000, rsi: 74.2, trend: "Strong Bullish", momentum: "Strong", sector: "DeFi", color: "#8FD4E8", spark: seededSpark(107, 22) },
  { id: "render", symbol: "RENDER", name: "Render", pair: "RENDER/USDT", price: 7.94, change24h: -4.61, change7d: -9.2, marketCap: 4100000000, volume24h: 290000000, rsi: 28.4, trend: "Strong Bearish", momentum: "Weak", sector: "AI", color: "#E24A4A", spark: seededSpark(109, -18) },
  { id: "fetch", symbol: "FET", name: "Artificial Superintelligence", pair: "FET/USDT", price: 1.482, change24h: 2.83, change7d: 5.6, marketCap: 3700000000, volume24h: 310000000, rsi: 61.9, trend: "Bullish", momentum: "Strong", sector: "AI", color: "#5F7DF7", spark: seededSpark(113, 10) },
  { id: "immutable", symbol: "IMX", name: "Immutable", pair: "IMX/USDT", price: 1.284, change24h: -1.24, change7d: -3.4, marketCap: 2200000000, volume24h: 140000000, rsi: 44.1, trend: "Neutral", momentum: "Weak", sector: "Gaming", color: "#3BC7C7", spark: seededSpark(127, -4) },
  { id: "sandbox", symbol: "SAND", name: "The Sandbox", pair: "SAND/USDT", price: 0.412, change24h: 0.86, change7d: -2.1, marketCap: 1000000000, volume24h: 92000000, rsi: 51.2, trend: "Neutral", momentum: "Weak", sector: "Gaming", color: "#4FA3F7", spark: seededSpark(131, 1) },
  { id: "pepe", symbol: "PEPE", name: "Pepe", pair: "PEPE/USDT", price: 0.0000182, change24h: 8.42, change7d: 19.4, marketCap: 7700000000, volume24h: 1900000000, rsi: 79.8, trend: "Strong Bullish", momentum: "Strong", sector: "Meme", color: "#5BC236", spark: seededSpark(137, 26) },
];

export const bySymbol = (s: string) => assets.find((a) => a.symbol.toLowerCase() === s.toLowerCase()) ?? assets[0];

export const timeframes = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"] as const;
export type Timeframe = (typeof timeframes)[number];

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export function generateCandles(seed = 42, count = 220, start = 112000, vol = 900): Candle[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const out: Candle[] = [];
  let price = start;
  const base = Math.floor(Date.now() / 1000 / 3600) * 3600 - count * 3600;
  for (let i = 0; i < count; i++) {
    const open = price;
    const drift = (rnd() - 0.46) * vol;
    const close = Math.max(open * 0.9, open + drift);
    const high = Math.max(open, close) + rnd() * vol * 0.5;
    const low = Math.min(open, close) - rnd() * vol * 0.5;
    out.push({
      time: base + i * 3600,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(500 + rnd() * 2500),
    });
    price = close;
  }
  return out;
}

export const globalStats = {
  marketCap: 3980000000000,
  marketCapChange: 1.84,
  volume24h: 168400000000,
  volumeChange: -4.2,
  btcDominance: 58.6,
  ethDominance: 12.8,
  otherDominance: 28.6,
  openInterest: 82400000000,
  openInterestChange: 3.12,
  fearGreed: 68,
  fearGreedLabel: "Greed",
  fearGreedPrev: 61,
  altseasonIndex: 34,
  marketIndex: 1284.6,
  marketIndexChange: 0.94,
};

export const fearGreedHistory7 = [52, 55, 61, 58, 64, 66, 68];
export const fearGreedHistory30 = [
  38, 41, 44, 40, 46, 49, 47, 51, 55, 53, 58, 60, 57, 62, 59, 63, 66, 64, 61, 65, 67, 63, 60, 58, 55, 57, 61, 64, 66, 68,
];

export const dominanceHistory = [
  { label: "Jan", btc: 52.1, eth: 16.4 },
  { label: "Feb", btc: 53.4, eth: 15.8 },
  { label: "Mar", btc: 54.9, eth: 15.1 },
  { label: "Apr", btc: 55.6, eth: 14.6 },
  { label: "May", btc: 56.2, eth: 14.1 },
  { label: "Jun", btc: 57.1, eth: 13.6 },
  { label: "Jul", btc: 57.8, eth: 13.2 },
  { label: "Aug", btc: 58.6, eth: 12.8 },
];

export const marketCapHistory = Array.from({ length: 90 }, (_, i) => {
  const t = i / 89;
  return {
    label: `D${i}`,
    value: 3200 + Math.sin(t * 6) * 180 + t * 700 + ((i * 37) % 60),
  };
});

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  body: string[];
  source: string;
  time: string;
  category: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  assets: string[];
  image: string;
  readTime: string;
};

const img = (q: string) => `https://images.unsplash.com/${q}?auto=format&fit=crop&w=1200&q=70`;

export const news: NewsItem[] = [
  {
    id: "btc-etf-inflows-record",
    title: "Spot Bitcoin ETFs post record weekly inflows as institutional demand accelerates",
    excerpt:
      "Net inflows topped $2.8B last week, the strongest stretch since launch, tightening available supply on exchanges.",
    body: [
      "Spot Bitcoin exchange-traded funds absorbed a record $2.8 billion in net inflows over the past week, according to aggregated issuer disclosures, marking the strongest five-session stretch since the products began trading.",
      "The flows arrive as exchange balances continue to decline, with roughly 2.1 million BTC held on tracked venues, the lowest reading in several years. Analysts describe the setup as structurally supportive: steady ETF absorption meeting a shrinking liquid float.",
      "Derivatives positioning has followed. Open interest across major perpetual venues rose 3.1% while funding remained moderate, suggesting the move has been led by spot rather than leverage.",
      "Risks remain. A sharp macro repricing or a hawkish surprise in rate expectations could stall inflows quickly, and prior record weeks have often preceded short-term consolidation.",
    ],
    source: "Market Wire",
    time: "12m ago",
    category: "ETF",
    sentiment: "Bullish",
    assets: ["BTC", "ETH"],
    image: img("photo-1518546305927-5a555bb7020d"),
    readTime: "4 min read",
  },
  {
    id: "eth-upgrade-scaling",
    title: "Ethereum scaling upgrade cuts rollup data costs by an estimated 40%",
    excerpt: "Layer 2 fee markets reprice sharply as blob capacity expands across the network.",
    body: [
      "The latest Ethereum network upgrade expanded blob capacity, cutting the effective data cost for rollups by an estimated 40% in early measurements.",
      "Layer 2 networks passed most of the savings to users within hours, with median transfer fees on major rollups falling below one cent.",
      "Validator participation remained above 99.5% through the transition, and no client-level incidents were reported.",
    ],
    source: "Chain Report",
    time: "48m ago",
    category: "Ethereum",
    sentiment: "Bullish",
    assets: ["ETH", "ARB", "OP"],
    image: img("photo-1622630998477-20aa696ecb05"),
    readTime: "3 min read",
  },
  {
    id: "regulation-framework",
    title: "Lawmakers advance market structure framework for digital assets",
    excerpt: "A committee vote moves the bill forward, clarifying custody and disclosure obligations.",
    body: [
      "A legislative committee advanced a digital asset market structure bill that would clarify custody rules, disclosure obligations and registration pathways for trading venues.",
      "Industry groups welcomed the clarity while flagging concerns about compliance timelines for smaller firms.",
    ],
    source: "Policy Desk",
    time: "2h ago",
    category: "Regulation",
    sentiment: "Neutral",
    assets: ["BTC", "XRP"],
    image: img("photo-1450101499163-c8848c66ca85"),
    readTime: "5 min read",
  },
  {
    id: "defi-tvl-rebound",
    title: "DeFi total value locked rebounds to a nine-month high",
    excerpt: "Lending markets lead the recovery as stablecoin supply expands.",
    body: [
      "Total value locked across decentralized finance protocols climbed to a nine-month high, driven primarily by lending markets and liquid staking.",
      "Stablecoin supply expanded alongside, a combination historically associated with rising on-chain risk appetite.",
    ],
    source: "DeFi Pulse",
    time: "4h ago",
    category: "DeFi",
    sentiment: "Bullish",
    assets: ["AAVE", "UNI"],
    image: img("photo-1639762681485-074b7f938ba0"),
    readTime: "3 min read",
  },
  {
    id: "macro-rates-crypto",
    title: "Softer inflation print revives risk appetite across macro assets",
    excerpt: "Rate cut odds move higher, lifting long-duration and high-beta exposure including crypto.",
    body: [
      "A cooler than expected inflation reading pushed rate cut expectations higher, lifting equities and high-beta assets.",
      "Crypto correlations with tech equities remain elevated on a 30-day basis, keeping macro releases central to short-term direction.",
    ],
    source: "Macro Lens",
    time: "6h ago",
    category: "Macro",
    sentiment: "Bullish",
    assets: ["BTC"],
    image: img("photo-1611974789855-9c2a0a7236a3"),
    readTime: "4 min read",
  },
  {
    id: "altcoin-rotation",
    title: "Capital rotation into altcoins stalls as Bitcoin dominance grinds higher",
    excerpt: "Dominance at 58.6% keeps altseason indicators firmly in Bitcoin season territory.",
    body: [
      "Bitcoin dominance climbed again this week, keeping the altseason index at 34 and signalling that broad rotation has yet to begin.",
      "Selective strength persists in AI and Layer 2 baskets, but breadth remains narrow.",
    ],
    source: "Market Wire",
    time: "9h ago",
    category: "Altcoins",
    sentiment: "Bearish",
    assets: ["SOL", "ADA", "AVAX"],
    image: img("photo-1621761191319-c6fb62004040"),
    readTime: "3 min read",
  },
  {
    id: "mining-hashrate",
    title: "Network hashrate sets new all-time high ahead of difficulty adjustment",
    excerpt: "Miner revenue holds steady as efficiency gains offset rising competition.",
    body: [
      "Bitcoin network hashrate reached a new all-time high, with the next difficulty adjustment projected to move up modestly.",
      "Miner revenue per terahash held steady thanks to elevated fee activity.",
    ],
    source: "Chain Report",
    time: "12h ago",
    category: "Bitcoin",
    sentiment: "Neutral",
    assets: ["BTC"],
    image: img("photo-1516245834210-c4c142787335"),
    readTime: "2 min read",
  },
  {
    id: "exchange-tech-outage",
    title: "Major venue completes matching engine migration with no downtime",
    excerpt: "Latency improves 35% for API clients after infrastructure overhaul.",
    body: [
      "A major trading venue completed a matching engine migration, reporting a 35% latency improvement for API clients.",
      "The rollout was staged across regions over 72 hours with no reported downtime.",
    ],
    source: "Tech Brief",
    time: "1d ago",
    category: "Technology",
    sentiment: "Neutral",
    assets: ["BNB"],
    image: img("photo-1451187580459-43490279c0fa"),
    readTime: "2 min read",
  },
];

export const newsCategories = [
  "All",
  "Crypto",
  "Bitcoin",
  "Ethereum",
  "Altcoins",
  "DeFi",
  "ETF",
  "Regulation",
  "Macro",
  "Markets",
  "Technology",
];

export const trendingTopics = [
  "ETF inflows",
  "Bitcoin dominance",
  "Rollup fees",
  "Rate cuts",
  "AI tokens",
  "Liquid staking",
  "Market structure bill",
];

export const indicators = [
  { name: "RSI (14)", value: "64.2", signal: "Neutral / Bullish", tone: "up" as const, progress: 64 },
  { name: "MACD (12,26,9)", value: "+184.2", signal: "Bullish crossover", tone: "up" as const, progress: 72 },
  { name: "EMA 20", value: "$117,240", signal: "Price above", tone: "up" as const, progress: 68 },
  { name: "EMA 50", value: "$114,880", signal: "Price above", tone: "up" as const, progress: 74 },
  { name: "EMA 200", value: "$103,410", signal: "Long-term uptrend", tone: "up" as const, progress: 82 },
  { name: "Bollinger Bands", value: "Upper 121.4k", signal: "Expanding volatility", tone: "neutral" as const, progress: 58 },
  { name: "Volume (24h)", value: "$48.2B", signal: "Above average", tone: "up" as const, progress: 66 },
  { name: "ATR (14)", value: "2,140", signal: "Elevated", tone: "neutral" as const, progress: 54 },
  { name: "Stochastic", value: "78.4", signal: "Approaching overbought", tone: "down" as const, progress: 78 },
  { name: "OBV", value: "Rising", signal: "Accumulation", tone: "up" as const, progress: 70 },
];

export const alerts = [
  { id: "1", asset: "BTC", condition: "Price crosses above", target: "$120,000", status: "Active", created: "2h ago" },
  { id: "2", asset: "ETH", condition: "RSI falls below", target: "35", status: "Active", created: "1d ago" },
  { id: "3", asset: "SOL", condition: "24h change exceeds", target: "+8%", status: "Paused", created: "3d ago" },
  { id: "4", asset: "XRP", condition: "Price crosses below", target: "$2.40", status: "Triggered", created: "5d ago" },
];

export const savedAnalyses = [
  { id: "1", title: "BTC 4H — Continuation setup above 116.4k", asset: "BTC/USDT", timeframe: "4H", tag: "Bullish", date: "Today" },
  { id: "2", title: "ETH daily — Range compression before expansion", asset: "ETH/USDT", timeframe: "1D", tag: "Neutral", date: "Yesterday" },
  { id: "3", title: "SOL — Losing the 50 EMA, watch 214", asset: "SOL/USDT", timeframe: "4H", tag: "Bearish", date: "2 days ago" },
  { id: "4", title: "Market breadth review — dominance grinding up", asset: "TOTAL", timeframe: "1W", tag: "Neutral", date: "1 week ago" },
];

export const marketCyclePhases = [
  { phase: "Accumulation", progress: 100, note: "Completed Q1" },
  { phase: "Early Bull", progress: 100, note: "Completed Q2" },
  { phase: "Expansion", progress: 72, note: "Current phase" },
  { phase: "Euphoria", progress: 0, note: "Not reached" },
  { phase: "Distribution", progress: 0, note: "Not reached" },
];

export function fmtPrice(v: number) {
  if (v >= 1000) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (v >= 1) return `$${v.toFixed(3)}`;
  if (v >= 0.001) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(7)}`;
}

export function fmtCompact(v: number) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

export function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
