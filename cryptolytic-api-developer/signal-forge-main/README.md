# Signal Forge

BUILD COMPLETE PREMIUM INDICATOR API PLATFORM NAME Cryptolutic API 

Build a complete, production-quality Technical Indicator API Platform Website for developers, traders, fintech applications, AI agents, trading dashboards, bots, and analytics platforms.

The website must combine:

Premium Landing / Homepage

User Dashboard

API Playground

Indicator Explorer

Indicator Detail Pages

API Key Management

API Usage

Developer Documentation

Account Settings

Responsive Mobile Experience

The entire website must use ONE consistent premium design system.

1. PRODUCT CONCEPT

This platform provides an API that allows users and developers to call a centralized technical-indicator engine.

Core API:

POST /api/v1/indicators/calculate
Content-Type: application/json


Example request:

curl -s http://localhost:8000/api/v1/indicators/calculate \
-H 'content-type: application/json' \
-d '{
  "symbol": "BTC",
  "timeframe": "4h",
  "candles": [
    {
      "time": 1700000000,
      "open": 42000.0,
      "high": 42500.0,
      "low": 41800.0,
      "close": 42300.0,
      "volume": 1200.5
    }
  ],
  "indicators": [
    {
      "type": "sma",
      "params": {
        "period": 20
      }
    },
    {
      "type": "macd",
      "params": {
        "fast": 12,
        "slow": 26,
        "signal": 9
      }
    }
  ]
}'


Example response:

{
  "symbol": "BTC",
  "timeframe": "4h",
  "computedAt": "2026-08-10T12:00:00Z",
  "results": [
    {
      "type": "sma",
      "params": {
        "period": 20
      },
      "lines": {
        "sma": [
          {
            "time": 1700000000,
            "value": 42300.0
          }
        ]
      }
    },
    {
      "type": "macd",
      "params": {
        "fast": 12,
        "slow": 26,
        "signal": 9
      },
      "lines": {
        "macd": [
          {
            "time": 1700000000,
            "value": 12.34
          }
        ],
        "signal": [
          {
            "time": 1700000000,
            "value": 11.22
          }
        ],
        "histogram": [
          {
            "time": 1700000000,
            "value": 1.12
          }
        ]
      }
    }
  ]
}


Backend validation:

5–5000 candles

Candle timestamps must be strictly ascending

Candle timestamps must be unique

All numerical values must be finite

timeframe must be one of:

1m
5m
15m
30m
1h
4h
1d
1w


1–12 indicators per request

Request body maximum 2 MB

Errors:

400 Bad Request
413 Payload Too Large
422 Validation Error
401 Unauthorized
403 Forbidden
429 Rate Limited
500 Internal Server Error


The frontend must respect this contract.

2. IMPORTANT DEVELOPMENT RULES

The frontend must be connected to the real backend.

Use environment configuration:

NEXT_PUBLIC_API_BASE_URL


Example:

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000


Do NOT hardcode the backend URL throughout the application.

Do NOT create fake backend logic.

Do NOT generate random API responses.

Do NOT create fake trading signals.

Do NOT fabricate API statistics.

Do NOT fabricate uptime numbers.

Do NOT fabricate customer logos or testimonials.

If backend analytics data is unavailable, display an honest empty state.

All visual indicator charts must use real API response data.

Separate:

UI
API Service
Types
Business Logic
State


Use reusable components.

3. TECHNOLOGY

Use:

Next.js

React

TypeScript

Tailwind CSS

Framer Motion

Reusable component architecture

Responsive design

Modern chart library

Syntax highlighting for code

Accessible UI

Recommended structure:

src/
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   ├── playground/
│   ├── indicators/
│   ├── api-keys/
│   ├── usage/
│   ├── docs/
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── navbar/
│   ├── sidebar/
│   ├── hero/
│   ├── dashboard/
│   ├── playground/
│   ├── indicators/
│   ├── charts/
│   ├── api-keys/
│   └── docs/
│
├── lib/
│   └── api/
│
├── hooks/
│
├── types/
│   └── indicator.ts
│
└── styles/


4. GLOBAL DESIGN SYSTEM

Create a premium Black / Dark futuristic financial developer interface.

Background:

#030303
#050505
#080808


Cards:

#0B0B0B
#101010


Borders:

rgba(255,255,255,0.08)


Primary text:

#FFFFFF


Secondary:

#A1A1AA


Muted:

#666666


Use ONE accent color such as:

Electric Green


or

Premium Orange


Do not use multiple bright accent colors.

Visual characteristics:

Minimal

Futuristic

Technical

Premium

Financial

Developer-first

High contrast

Clean typography

Subtle glass effects

Thin borders

Soft shadows

Large whitespace

Do not make it look like a generic admin dashboard.

5. GLOBAL ANIMATION SYSTEM

Use Framer Motion.

Animations should be subtle and premium.

Page transitions:

opacity: 0 → 1
y: 20 → 0


Cards:

translateY(-4px)
border highlight


Buttons:

Hover scale

Press feedback

Smooth transitions

API Playground:

Request
↓
Validation
↓
Calculation
↓
Response


Animate these stages.

Background:

Very subtle grid

Tiny particles

Indicator lines

Data points

Never let animation interfere with readability.

Respect:

prefers-reduced-motion


6. PUBLIC WEBSITE

Public pages:

/
 /indicators
 /pricing
 /docs
 /login
 /register


Authenticated pages:

/dashboard
/playground
/api-keys
/usage
/settings


7. HOMEPAGE

Navbar

LOGO

Products
Indicators
Developers
Pricing

Documentation
Login
[ Get API Key ]


Navbar:

Sticky

Transparent initially

Blur/dark background on scroll

Smooth transitions

Responsive mobile menu

8. HERO SECTION

Hero headline:

Powerful Market
Indicators.
Built for Developers.


Supporting text:

Access technical indicators through a fast,
simple and developer-friendly API.


Buttons:

Get Started →
View Documentation


Small status:

● API STATUS — OPERATIONAL


Do not claim operational status from frontend unless the backend status endpoint confirms it.

If no status endpoint exists, use:

● Developer API


9. HERO API VISUALIZATION

Create an animated API request visualization.

Left:

POST /api/v1/indicators/calculate


Show:

{
  "symbol": "BTC",
  "timeframe": "4h",
  "indicators": [
    {
      "type": "sma",
      "params": {
        "period": 20
      }
    },
    {
      "type": "macd",
      "params": {
        "fast": 12,
        "slow": 26,
        "signal": 9
      }
    }
  ]
}


Animate the request flowing through:

API
↓
Validation
↓
Indicator Engine
↓
JSON Response


Right:

200 OK

SMA
42,300.00

MACD
12.34

SIGNAL
11.22

HISTOGRAM
+1.12


The visualization must be based on the actual API contract.

Do not claim these values are real market data.

10. HERO BACKGROUND

Create a subtle animated technical-market background:

Dark grid

Minimal candlestick shapes

Thin indicator lines

Tiny data points

Moving particles

Keep opacity extremely low.

Do not display fake trading profits or buy/sell signals.

11. CAPABILITY BAR

Below Hero:

Technical Indicator API

✓ REST API
✓ JSON Responses
✓ Multiple Indicators
✓ Multiple Timeframes
✓ Developer Friendly
✓ Strict Validation


12. FEATURES SECTION

Headline:

Everything you need
for market analytics.


Cards:

Technical Indicators

SMA
EMA
RSI
MACD
ATR
ADX


API First

One endpoint.
Structured JSON.
Simple integration.


Developer Ready

Build dashboards,
bots, analytics tools,
AI agents and fintech applications.


13. INDICATOR SHOWCASE

Create interactive indicator cards.

Examples:

SMA
Simple Moving Average

EMA
Exponential Moving Average

RSI
Relative Strength Index

MACD
Moving Average Convergence Divergence

Bollinger Bands
Volatility Analysis

ATR
Average True Range

ADX
Trend Strength


Only display indicators actually supported by the backend.

Cards should animate on hover.

14. USE CASES

Create:

Trading Dashboards
Trading Bots
AI Agents
Fintech Applications
Research Tools
Portfolio Analytics


Use clean visual icons.

Do not claim profitability.

15. DEVELOPER CODE SECTION

Headline:

One API.
Infinite possibilities.


Tabs:

cURL
JavaScript
Python
Go
PHP


Generate code dynamically from the current API request.

Add:

Copy Code


After clicking:

✓ Copied


16. API REQUEST FLOW

Visualize:

YOUR APPLICATION
       ↓
    API KEY
       ↓
INDICATOR API
       ↓
VALIDATION
       ↓
INDICATOR ENGINE
       ↓
STRUCTURED JSON
       ↓
YOUR APPLICATION


Animate a small data particle through each step.

17. FINAL HOMEPAGE CTA

Headline:

Your application.
Our indicator engine.


Description:

Start building with technical indicators
through a simple developer-first API.


Buttons:

Get API Key →
Open API Playground →


18. AUTHENTICATED APPLICATION SHELL

After login, use a professional developer dashboard.

Desktop sidebar:

LOGO

Overview
Indicators
API Playground
API Keys
Usage
Documentation

────────────

Settings
Account


Bottom:

● Connected


Top bar:

Search
Docs
API Status
User Profile


19. DASHBOARD

Header:

Welcome back

Monitor your Indicator API activity.


Stats:

API REQUESTS
[real data]

SUCCESS RATE
[real data]

AVG LATENCY
[real data]

ACTIVE API KEYS
[real data]


If analytics endpoint is unavailable:

No usage data available
Connect your API to start monitoring requests.


Never fabricate statistics.

20. API PLAYGROUND

Create the most powerful page in the application.

Header:

API PLAYGROUND

POST /api/v1/indicators/calculate


Environment:

[ Production ▼ ]


Request builder:

SYMBOL
[ BTC ]

TIMEFRAME
[ 4h ▼ ]


Timeframes:

1m
5m
15m
30m
1h
4h
1d
1w


21. CANDLE EDITOR

Create an interactive table:

TIME
OPEN
HIGH
LOW
CLOSE
VOLUME


Example:

1700000000
42000
42500
41800
42300
1200.5


Buttons:

+ Add Candle
Import JSON
Clear


Validation:

Minimum 5 candles
Maximum 5000 candles
Strictly ascending timestamps
Unique timestamps
Finite numeric values
Maximum body size 2 MB


Show inline validation.

22. INDICATOR BUILDER

Create dynamic indicator configuration.

INDICATORS

┌──────────────────────────────┐
│ SMA                          │
│ Period [20]          Remove  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ MACD                         │
│ Fast [12]                    │
│ Slow [26]                    │
│ Signal [9]           Remove  │
└──────────────────────────────┘

[ + Add Indicator ]


Maximum:

12 indicators


Minimum:

1 indicator


Only expose backend-supported indicators.

23. RUN REQUEST

Primary button:

▶ Run Request


During request:

VALIDATING
    ↓
PROCESSING CANDLES
    ↓
CALCULATING INDICATORS
    ↓
BUILDING RESPONSE


Show elapsed time if available.

24. RESPONSE PANEL

Show:

RESPONSE

200 OK
128ms


Then formatted JSON.

Actions:

Copy JSON
Download
Expand
Collapse


Use syntax highlighting.

25. INDICATOR VISUALIZATION

Parse the real API response.

For SMA:

SMA
42,300.00


For MACD:

MACD
12.34

Signal
11.22

Histogram
1.12


If response contains enough time-series points, create interactive charts.

Charts must use:

response.results[].lines


Never use random data.

26. API CODE GENERATOR

After request:

cURL
JavaScript
Python
Go
PHP


Generate code from the actual request.

Include authentication placeholder:

YOUR_API_KEY


Never expose secret API keys in generated source.

27. INDICATORS PAGE

Create an indicator explorer.

Header:

Technical Indicators

Explore available indicators.


Search:

Search indicators...


Cards:

SMA
EMA
RSI
MACD
Bollinger Bands
ATR
ADX


Each card:

Name
Description
Parameters
Endpoint / API method
View Documentation →


28. INDICATOR DETAIL PAGE

Example:

RSI
Relative Strength Index


Sections:

Overview
Parameters
Request
Response
Example
Visualization


Show API request format.

Show real response structure.

Add:

Try in Playground →


29. API KEYS

Page:

API Keys

[ + Create API Key ]


Card:

Production API Key

sk_live_••••••••••••••••

Status
● Active

Created
Aug 10, 2026

Last Used
2 minutes ago

[ Copy ]
[ Details ]
[ Revoke ]


Security:

Never display complete secret after initial creation

Never store keys in localStorage unless explicitly required

Never expose secret keys in client logs

Use backend authentication for key management

30. USAGE PAGE

Show API usage from the real backend.

Sections:

Total Requests
Successful Requests
Failed Requests
Average Latency
Rate Limit


Charts:

Requests over time
Errors over time
Latency


If data does not exist:

No usage data available.


Do not fabricate values.

31. DOCUMENTATION

Create professional developer docs.

Navigation:

Introduction
Quick Start
Authentication
API Reference
Calculate Indicators
Indicators
Request Format
Response Format
Validation
Errors
Rate Limits
API Keys
Examples


Main endpoint:

POST /api/v1/indicators/calculate


Documentation must include:

Endpoint

Authentication

Request body

Candle schema

Indicator schema

Timeframes

Validation

Response format

Errors

Examples

32. ERROR DOCUMENTATION

Document:

400 Bad Request
413 Payload Too Large
422 Validation Error
401 Unauthorized
403 Forbidden
429 Too Many Requests
500 Internal Server Error


Use clean error cards.

Never expose raw stack traces.

33. SETTINGS

Create:

Profile
Security
API Preferences
Appearance
Notifications


Appearance:

Dark
System


Default:

Dark


34. RESPONSIVE DESIGN

Desktop:

Full sidebar

Large playground

Multi-column layouts

Tablet:

Collapsible sidebar

Responsive cards

Mobile:

Drawer navigation

Single-column layout

Responsive code panels

Horizontal-scroll tables

Full-width CTA buttons

Compact API playground

The UI must feel intentional on mobile, not simply scaled down.

35. LOADING STATES

Every async operation must have:

Loading
Success
Error
Empty


Use skeleton loaders.

Avoid excessive spinner usage.

36. TOAST SYSTEM

Use elegant notifications:

✓ API request completed
✓ API key copied
✓ Code copied
✓ Changes saved


Errors:

× Request failed
× Invalid candle data
× API authentication failed


37. ACCESSIBILITY

Support:

Keyboard navigation

Focus states

ARIA labels

Good contrast

Screen reader-friendly controls

Reduced motion

38. PERFORMANCE

Optimize for:

Fast initial load
Minimal JavaScript
Lazy-loaded charts
GPU-friendly animations
Efficient API calls
Debounced search
Virtualized large candle tables if necessary


Do not add unnecessary 3D libraries.

Do not use huge background videos.

39. COMPONENT SYSTEM

Create reusable components:

Button
Card
Badge
Modal
Dialog
Dropdown
Tabs
Tooltip
Toast
CodeBlock
JsonViewer
DataTable
Chart
StatCard
Sidebar
Navbar
Search
CommandPalette
IndicatorCard
IndicatorBuilder
CandleEditor
ApiResponse
ApiCodeGenerator


40. TYPES

Create strong TypeScript types:

Candle

IndicatorConfig

IndicatorParams

IndicatorRequest

IndicatorLine

IndicatorResult

IndicatorResponse

APIError

APIKey

UsageStats


Do not use any unnecessarily.

41. FINAL USER EXPERIENCE

The complete flow should be:

LANDING PAGE
      ↓
Get API Key
      ↓
Register / Login
      ↓
Dashboard
      ↓
API Keys
      ↓
Create / Select API Key
      ↓
API Playground
      ↓
Select Symbol
      ↓
Select Timeframe
      ↓
Add Candles
      ↓
Select Indicators
      ↓
Run Request
      ↓
Backend API
      ↓
Real Response
      ↓
Visualization
      ↓
Generate Code
      ↓
Documentation
      ↓
Integrate API


42. FINAL DESIGN GOAL

The website must feel like a real commercial developer infrastructure product.

Think:

Premium API Platform
+
Trading Technology
+
Developer Experience
+
Modern SaaS


The homepage should attract users.

The dashboard should help users manage their API.

The playground should let developers test the API.

The indicator explorer should explain the available indicators.

The documentation should help developers integrate quickly.

The API key page should manage credentials.

The usage page should show real API activity.

Everything must feel like one unified product.

MOST IMPORTANT

Do not build a generic admin template.

Do not use fake data.

Do not use fake testimonials.

Do not use fake company logos.

Do not use fake performance metrics.

Do not fabricate trading results.

Do not invent unsupported indicators.

Do not invent unsupported API parameters.

Use the actual API contract.

Build the UI first-class, polished, responsive, animated and production-ready.

The final product should look like a premium next-generation Indicator API infrastructure platform that developers would trust to integrate into real applications.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5a871305-c388-49dd-8b2b-39d9c87cb972).

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
