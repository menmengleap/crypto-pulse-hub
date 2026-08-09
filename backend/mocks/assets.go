// Package mocks holds the deterministic seed catalog used by the mock market
// data provider. It exists so the provider stays a pure algorithm and the
// catalog can be swapped for real exchange listings later.
package mocks

import "cryptolytic/backend/internal/marketdata"

// Assets is the initial market catalog. BasePrice is the starting point of the
// price walk; Volatility scales the per-candle drift.
var Assets = []marketdata.AssetMeta{
	{Symbol: "BTC", Name: "Bitcoin", Pair: "BTC/USDT", Sector: "Bitcoin", Color: "#F7931A", ImageURL: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400", BasePrice: 64800, Volatility: 0.006},
	{Symbol: "ETH", Name: "Ethereum", Pair: "ETH/USDT", Sector: "Ethereum", Color: "#7B8CF7", ImageURL: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628", BasePrice: 3150, Volatility: 0.008},
	{Symbol: "USDT", Name: "Tether", Pair: "USDT/USD", Sector: "Stablecoin", Color: "#2AAE93", ImageURL: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661", BasePrice: 1.0, Volatility: 0.0001},
	{Symbol: "SOL", Name: "Solana", Pair: "SOL/USDT", Sector: "Layer 1", Color: "#14F195", ImageURL: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756", BasePrice: 142.0, Volatility: 0.012},
	{Symbol: "XRP", Name: "XRP", Pair: "XRP/USDT", Sector: "Layer 1", Color: "#8FA0B5", ImageURL: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442", BasePrice: 2.40, Volatility: 0.011},
	{Symbol: "BNB", Name: "BNB", Pair: "BNB/USDT", Sector: "Layer 1", Color: "#F0B90B", ImageURL: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970", BasePrice: 640.0, Volatility: 0.007},
	{Symbol: "ADA", Name: "Cardano", Pair: "ADA/USDT", Sector: "Layer 1", Color: "#4C8DF6", ImageURL: "https://coin-images.coingecko.com/coins/images/975/large/cardano.png?1696502090", BasePrice: 0.75, Volatility: 0.012},
	{Symbol: "DOGE", Name: "Dogecoin", Pair: "DOGE/USDT", Sector: "Meme", Color: "#C3A634", ImageURL: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409", BasePrice: 0.15, Volatility: 0.014},
	{Symbol: "AVAX", Name: "Avalanche", Pair: "AVAX/USDT", Sector: "Layer 1", Color: "#E84142", ImageURL: "https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png?1696512369", BasePrice: 41.0, Volatility: 0.013},
	{Symbol: "ARB", Name: "Arbitrum", Pair: "ARB/USDT", Sector: "Layer 2", Color: "#2D91E8", ImageURL: "https://coin-images.coingecko.com/coins/images/16547/large/arb.jpg?1721358242", BasePrice: 0.87, Volatility: 0.015},
	{Symbol: "OP", Name: "Optimism", Pair: "OP/USDT", Sector: "Layer 2", Color: "#FF4B4B", ImageURL: "https://coin-images.coingecko.com/coins/images/25244/large/Token.png?1774456081", BasePrice: 1.84, Volatility: 0.016},
	{Symbol: "UNI", Name: "Uniswap", Pair: "UNI/USDT", Sector: "DeFi", Color: "#FF7BC4", ImageURL: "https://coin-images.coingecko.com/coins/images/12504/large/uniswap-logo.png?1720676669", BasePrice: 12.6, Volatility: 0.014},
	{Symbol: "AAVE", Name: "Aave", Pair: "AAVE/USDT", Sector: "DeFi", Color: "#8FD4E8", ImageURL: "https://coin-images.coingecko.com/coins/images/12645/large/aave-token-round.png?1720472354", BasePrice: 318.0, Volatility: 0.015},
	{Symbol: "RENDER", Name: "Render", Pair: "RENDER/USDT", Sector: "AI", Color: "#E24A4A", ImageURL: "https://coin-images.coingecko.com/coins/images/11636/large/rndr.png?1696511529", BasePrice: 7.9, Volatility: 0.018},
	{Symbol: "FET", Name: "Artificial Superintelligence", Pair: "FET/USDT", Sector: "AI", Color: "#5F7DF7", ImageURL: "https://coin-images.coingecko.com/coins/images/5681/large/ASI.png?1719827289", BasePrice: 1.48, Volatility: 0.017},
	{Symbol: "IMX", Name: "Immutable", Pair: "IMX/USDT", Sector: "Gaming", Color: "#3BC7C7", ImageURL: "https://coin-images.coingecko.com/coins/images/17233/large/immutableX-symbol-BLK-RGB.png?1696516787", BasePrice: 1.28, Volatility: 0.016},
	{Symbol: "SAND", Name: "The Sandbox", Pair: "SAND/USDT", Sector: "Gaming", Color: "#4FA3F7", ImageURL: "https://coin-images.coingecko.com/coins/images/12129/large/sandbox_logo.jpg?1696511971", BasePrice: 0.41, Volatility: 0.018},
	{Symbol: "PEPE", Name: "Pepe", Pair: "PEPE/USDT", Sector: "Meme", Color: "#5BC236", ImageURL: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776", BasePrice: 0.000012, Volatility: 0.02},
}
