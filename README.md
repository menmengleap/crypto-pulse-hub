# Crypto Pulse Hub

បាន។ ខាងក្រោមនេះជា Prompt សម្រាប់ AI Coding Agent ដើម្បី Build Frontend ដោយ ផ្តោតខ្លាំងលើ UI/UX និងយករូបដែលអ្នកផ្ញើជាផ្នែកមួយនៃ Design Reference។

Build a modern professional Crypto Market Analytics Web App frontend.

IMPORTANT:
Focus primarily on FRONTEND UI/UX, visual quality, layout, interactions, responsiveness, and component architecture.
Do NOT build trading execution, Buy/Sell, Orders, Wallet, Deposit, Withdrawal, or payment functionality.
Use mock/static data for now.
Do NOT build backend or database functionality yet.

DESIGN DIRECTION
----------------
Use the uploaded reference image as the primary visual inspiration.

The design should feel like a premium professional crypto market intelligence platform:
- Dark theme
- Black / graphite background
- Elegant green market-positive accents
- Red market-negative accents
- Orange Bitcoin accents
- Subtle gradients
- Soft glow effects
- Thin borders
- Rounded cards
- Clean typography
- Dense but organized financial dashboard
- Desktop-first
- Fully responsive
- Professional, minimal, modern
- Do NOT copy the reference image exactly.
- Create our own branding, layout details, components, spacing, and UX.

PRODUCT PURPOSE
---------------
This is a MARKET ANALYSIS platform.

Users can:
- Monitor markets
- View charts
- Analyze technical indicators
- Read crypto news
- Use market screener
- Create watchlists
- View market sentiment
- View market statistics
- Use AI analysis UI
- Save analysis
- Manage their profile

Users CANNOT:
- Buy
- Sell
- Place orders
- Trade
- Deposit
- Withdraw
- Connect trading execution accounts

TECH STACK
----------
Use:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React icons
- Zustand where useful
- TanStack Query where useful
- TradingView Lightweight Charts for chart rendering

Use clean reusable React components.
Keep the frontend architecture scalable.

PAGES
-----
Create these frontend pages:

1. Landing Page
2. Login
3. Register
4. Forgot Password
5. Market Overview
6. Spot Market
7. Derivatives Market
8. Crypto Assets
9. Advanced Chart
10. Compare
11. Watchlist
12. Fear & Greed
13. Market Sentiment
14. Market Cycle
15. Bitcoin Dominance
16. Market Heatmap
17. News
18. News Article
19. Market Screener
20. AI Analysis
21. Alerts
22. Saved Analysis
23. Profile
24. Settings

MAIN APP SHELL
--------------
Create a professional application shell:

Left sidebar:
- Logo / brand
- Market Overview
- Spot Market
- Derivatives
- Crypto Assets
- Fear & Greed
- Market Sentiment
- Market Cycle
- Bitcoin Dominance
- Market Heatmap
- Advanced Chart
- Compare
- Watchlist
- News
- Screener
- AI Analysis
- Alerts
- Saved Analysis
- Profile
- Settings

Sidebar requirements:
- Collapsible
- Active state
- Hover state
- Icons
- Smooth transitions
- Tooltips when collapsed
- Clean section labels

Top navigation:
- Page title
- Global search
- Search assets/news
- Notifications
- Theme/settings
- User avatar/profile menu

MARKET OVERVIEW
---------------
Create a dashboard inspired by the uploaded reference.

Top market cards:
- Bitcoin
- Ethereum
- Tether
- Solana
- XRP
- BNB

Each card should show:
- Icon
- Symbol
- Name
- Price
- 24h change
- Mini sparkline
- Positive/negative state
- More menu

Main dashboard layout:
- Crypto Market Cap chart
- Market Sentiment card
- Fear & Greed card
- Bitcoin Dominance
- Open Interest
- Market Volume
- Market Index
- Market Heatmap preview
- Trending assets

Use responsive CSS grid layouts.

CHART EXPERIENCE
----------------
Create a dedicated Advanced Chart page.

Use TradingView Lightweight Charts only as the chart rendering engine.

Do NOT reproduce the entire TradingView UI.

Build our own surrounding UI.

Chart header:
- Symbol
- Current price
- 24h change
- Market status
- Search/change asset

Chart toolbar:
- 1m
- 5m
- 15m
- 30m
- 1H
- 4H
- 1D
- 1W
- Indicators
- Compare
- Drawing
- Chart settings
- Fullscreen

Chart workspace:
- Candlestick chart
- Volume
- Crosshair
- Zoom
- Pan
- Responsive chart
- Custom toolbar
- Clean dark styling

Below chart create:
- Technical Analysis
- Market Structure
- Momentum
- Volume
- Support & Resistance
- AI Analysis

TECHNICAL ANALYSIS UI
---------------------
Create polished analysis cards for:
- RSI
- MACD
- EMA 20
- EMA 50
- EMA 200
- Bollinger Bands
- Volume
- Trend
- Momentum
- Market Structure

Example:

RSI
64.2
Neutral / Bullish

MACD
Bullish

Trend
Strong Bullish

Market Structure
Higher High / Higher Low

Support
$116,400

Resistance
$120,200

Use visual indicators, progress bars, badges, mini charts, and clear hierarchy.

WATCHLIST
---------
Create customizable watchlists.

Features:
- Create watchlist
- Rename
- Delete
- Add asset
- Remove asset
- Reorder assets
- Search
- Favorite

Show:
- Symbol
- Price
- Change
- Volume
- RSI
- Trend
- Mini chart

MARKET SCREENER
---------------
Create a professional market screener.

Filters:
- All
- Bullish
- Bearish
- Breakout
- Oversold
- Overbought
- High Volume
- RSI
- Market Cap
- Price Change

Table columns:
- Asset
- Price
- 24h
- Market Cap
- Volume
- RSI
- Trend
- Momentum

Include:
- Sorting
- Filtering
- Search
- Pagination
- Hover states

NEWS PAGE
---------
Create a premium crypto news interface.

Categories:
- All
- Crypto
- Bitcoin
- Ethereum
- Altcoins
- DeFi
- ETF
- Regulation
- Macro
- Markets
- Technology

Layout:
- Featured article
- Trending topics
- Latest news
- News cards
- Category filters
- Search
- Time labels
- Source labels

News card:
- Image
- Headline
- Source
- Time
- Category
- Related assets
- Sentiment badge

NEWS ARTICLE PAGE
-----------------
Create:
- Large article header
- Category
- Title
- Source
- Published time
- Hero image
- Article body
- Related assets
- Market impact
- Related news
- "View Chart" action
- AI summary UI

AI ANALYSIS
-----------
Create an AI Analysis interface focused on market research.

DO NOT make it look like a generic ChatGPT clone.

Use an analyst-style interface.

Example:

AI MARKET ANALYSIS

BTC / USDT
4H

Trend
Bullish

Momentum
Strong

Market Structure
Higher High / Higher Low

Key Resistance
$120,200

Key Support
$116,400

Market Context
...

Actions:
- Analyze Current Chart
- Analyze Multiple Timeframes
- Explain Indicators
- Summarize Market
- Analyze News Impact

Use loading states and skeletons.

FEAR & GREED
------------
Create a visually impressive sentiment page.

Show:
- Large sentiment gauge
- Current score
- Previous score
- 7-day history
- 30-day history
- Market explanation
- Related market metrics

BITCOIN DOMINANCE
-----------------
Create:
- BTC dominance percentage
- ETH dominance
- Other assets
- Historical chart
- Market interpretation
- Dominance comparison

MARKET HEATMAP
--------------
Create an interactive visual heatmap.

Groups:
- Bitcoin
- Ethereum
- Layer 1
- Layer 2
- DeFi
- AI
- Meme
- Gaming

Each block:
- Symbol
- Price change
- Market cap
- Hover information

PROFILE
-------
Create polished profile/settings pages.

Profile:
- Avatar
- Name
- Email
- Username
- Account information

Preferences:
- Default asset
- Default timeframe
- Chart preferences
- Theme
- Notifications

Saved:
- Watchlists
- Charts
- Analyses
- AI history

RESPONSIVE DESIGN
-----------------
Desktop:
- Full sidebar
- Large charts
- Multi-column dashboard

Tablet:
- Collapsible sidebar
- Adaptive grids

Mobile:
- Bottom navigation
- Compact header
- Horizontally scrollable market cards
- Stacked dashboard cards
- Full-width charts
- Mobile-friendly tables
- Bottom sheets for filters

COMPONENT SYSTEM
----------------
Create reusable components:

AppShell
Sidebar
Topbar
MarketCard
AssetCard
Sparkline
ChartContainer
ChartToolbar
IndicatorCard
AnalysisCard
SentimentGauge
DominanceCard
MarketCapCard
VolumeCard
Watchlist
WatchlistRow
ScreenerTable
FilterBar
NewsCard
FeaturedNews
NewsList
AIAnalysisPanel
StatCard
Heatmap
ProfileCard
SettingsPanel
Modal
Dropdown
Tooltip
Tabs
Badge
Button
Input
Skeleton
EmptyState

INTERACTIONS
------------
Add polished UI interactions:
- Sidebar collapse
- Hover animations
- Card hover
- Dropdowns
- Tabs
- Filters
- Search
- Modal
- Tooltips
- Skeleton loading
- Toast notifications
- Smooth page transitions
- Chart fullscreen
- Watchlist interactions
- Responsive navigation

Do not overuse animations.
Keep everything professional.

DESIGN TOKENS
-------------
Background:
#08090B
#0D0F12
#111418

Borders:
#1E2329

Text:
#F5F7FA
#9AA1AA

Positive:
Green

Negative:
Red

Accent:
Orange / Emerald

Use subtle gradients only where appropriate.

TYPOGRAPHY
----------
Use a modern UI font such as Inter.

Strong visual hierarchy:
- Large financial numbers
- Medium section headings
- Small metadata
- Clear labels

IMPORTANT UI RULES
------------------
- No Buy button
- No Sell button
- No Order panel
- No Wallet
- No Deposit
- No Withdrawal
- No Trading execution UI
- No unnecessary financial dashboard clutter
- Do not copy TradingView's complete interface
- Do not copy the uploaded reference exactly
- Build an original premium analytics product

MOCK DATA
---------
Use realistic mock crypto market data.

Examples:
BTC/USDT
ETH/USDT
SOL/USDT
BNB/USDT
XRP/USDT
ADA/USDT
DOGE/USDT
AVAX/USDT

No backend required.
No real API required.
No database required.

Use local mock data and reusable data structures.

QUALITY REQUIREMENTS
--------------------
The result must look like a real production SaaS product, not a demo.

Prioritize:
1. Visual quality
2. Layout
3. Spacing
4. Typography
5. Component consistency
6. Responsive behavior
7. Interaction quality
8. Accessibility

Build the UI completely first.
Use mock data everywhere.
Make every page navigable.
Make the application feel cohesive as one professional crypto market analytics platform.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/46e5018a-4144-4f10-9c9a-1b28548a2c2f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
