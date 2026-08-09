package mocks

// NewsSeed is a single news item to insert on first startup.
type NewsSeed struct {
	Title     string
	Excerpt   string
	Body      []string
	Source    string
	Category  string
	Sentiment string
	ImageURL  string
	ReadTime  string
	HoursAgo  int
	Assets    []string
}

// News is the initial news catalog used to populate the news tables.
var News = []NewsSeed{
	{
		Title:     "Spot Bitcoin ETFs post record weekly inflows as institutional demand accelerates",
		Excerpt:   "Net inflows topped $2.8B last week, the strongest stretch since launch, tightening available supply on exchanges.",
		Body:      []string{"Spot Bitcoin exchange-traded funds absorbed a record $2.8 billion in net inflows over the past week, according to aggregated issuer disclosures.", "The flows arrive as exchange balances continue to decline, with roughly 2.1 million BTC held on tracked venues.", "Derivatives positioning has followed, with open interest rising while funding remained moderate."},
		Source:    "Market Wire",
		Category:  "ETF",
		Sentiment: "bullish",
		ReadTime:  "4 min read",
		HoursAgo:  2,
		Assets:    []string{"BTC", "ETH"},
	},
	{
		Title:     "Ethereum scaling upgrade cuts rollup data costs by an estimated 40%",
		Excerpt:   "Layer 2 fee markets reprice sharply as blob capacity expands across the network.",
		Body:      []string{"The latest Ethereum network upgrade expanded blob capacity, cutting the effective data cost for rollups by an estimated 40%.", "Layer 2 networks passed most of the savings to users within hours.", "Validator participation remained above 99.5% through the transition."},
		Source:    "Chain Report",
		Category:  "Ethereum",
		Sentiment: "bullish",
		ReadTime:  "3 min read",
		HoursAgo:  5,
		Assets:    []string{"ETH", "ARB", "OP"},
	},
	{
		Title:     "Lawmakers advance market structure framework for digital assets",
		Excerpt:   "A committee vote moves the bill forward, clarifying custody and disclosure obligations.",
		Body:      []string{"A legislative committee advanced a digital asset market structure bill clarifying custody rules and disclosure obligations.", "Industry groups welcomed the clarity while flagging compliance timelines for smaller firms."},
		Source:    "Policy Desk",
		Category:  "Regulation",
		Sentiment: "neutral",
		ReadTime:  "5 min read",
		HoursAgo:  9,
		Assets:    []string{"BTC", "XRP"},
	},
	{
		Title:     "DeFi total value locked rebounds to a nine-month high",
		Excerpt:   "Lending markets lead the recovery as stablecoin supply expands.",
		Body:      []string{"Total value locked across decentralized finance protocols climbed to a nine-month high, driven primarily by lending markets and liquid staking.", "Stablecoin supply expanded alongside, a combination historically associated with rising on-chain risk appetite."},
		Source:    "DeFi Pulse",
		Category:  "DeFi",
		Sentiment: "bullish",
		ReadTime:  "3 min read",
		HoursAgo:  14,
		Assets:    []string{"AAVE", "UNI"},
	},
	{
		Title:     "Softer inflation print revives risk appetite across macro assets",
		Excerpt:   "Rate cut odds move higher, lifting long-duration and high-beta exposure including crypto.",
		Body:      []string{"A cooler than expected inflation reading pushed rate cut expectations higher, lifting equities and high-beta assets.", "Crypto correlations with tech equities remain elevated on a 30-day basis."},
		Source:    "Macro Lens",
		Category:  "Macro",
		Sentiment: "bullish",
		ReadTime:  "4 min read",
		HoursAgo:  20,
		Assets:    []string{"BTC"},
	},
	{
		Title:     "Capital rotation into altcoins stalls as Bitcoin dominance grinds higher",
		Excerpt:   "Dominance at 56.6% keeps altseason indicators firmly in Bitcoin season territory.",
		Body:      []string{"Bitcoin dominance climbed again this week, keeping the altseason index at 34 and signalling that broad rotation has yet to begin.", "Selective strength persists in AI and Layer 2 baskets, but breadth remains narrow."},
		Source:    "Market Wire",
		Category:  "Altcoins",
		Sentiment: "bearish",
		ReadTime:  "3 min read",
		HoursAgo:  28,
		Assets:    []string{"SOL", "ADA", "AVAX"},
	},
	{
		Title:     "Network hashrate sets new all-time high ahead of difficulty adjustment",
		Excerpt:   "Miner revenue holds steady as efficiency gains offset rising competition.",
		Body:      []string{"Bitcoin network hashrate reached a new all-time high, with the next difficulty adjustment projected to move up modestly.", "Miner revenue per terahash held steady thanks to elevated fee activity."},
		Source:    "Chain Report",
		Category:  "Bitcoin",
		Sentiment: "neutral",
		ReadTime:  "2 min read",
		HoursAgo:  40,
		Assets:    []string{"BTC"},
	},
	{
		Title:     "Major venue completes matching engine migration with no downtime",
		Excerpt:   "Latency improves 35% for API clients after infrastructure overhaul.",
		Body:      []string{"A major trading venue completed a matching engine migration, reporting a 35% latency improvement for API clients.", "The rollout was staged across regions over 72 hours with no reported downtime."},
		Source:    "Tech Brief",
		Category:  "Technology",
		Sentiment: "neutral",
		ReadTime:  "2 min read",
		HoursAgo:  52,
		Assets:    []string{"BNB"},
	},
	{
		Title:     "Meme sector cools as funding rates across perpetual venues normalize",
		Excerpt:   "Open interest trims while spot holders take profit after a strong run.",
		Body:      []string{"Meme tokens cooled this week as funding rates across perpetual venues normalized and open interest trimmed.", "Spot holders took profit after a strong run, though social momentum remains elevated."},
		Source:    "Market Wire",
		Category:  "Altcoins",
		Sentiment: "bearish",
		ReadTime:  "3 min read",
		HoursAgo:  66,
		Assets:    []string{"DOGE", "PEPE"},
	},
	{
		Title:     "Layer 2 fees approach multi-year lows after blob space expansion",
		Excerpt:   "Median transfer fees on major rollups fall below one cent.",
		Body:      []string{"Layer 2 median transfer fees fell below one cent after blob space expansion.", "Cheaper settlement is expected to support new on-chain applications and user growth."},
		Source:    "Chain Report",
		Category:  "Ethereum",
		Sentiment: "bullish",
		ReadTime:  "2 min read",
		HoursAgo:  80,
		Assets:    []string{"ARB", "OP", "IMX"},
	},
}
