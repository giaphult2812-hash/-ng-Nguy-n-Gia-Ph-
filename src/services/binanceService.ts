export const fetchCandles = async (limit: number = 100) => {
  // 1. Try Binance endpoints
  const binanceEndpoints = [
    'https://data-api.binance.vision/api/v3/klines',
    'https://api.binance.com/api/v3/klines',
    'https://fapi.binance.com/fapi/v1/klines',
    'https://api.binance.us/api/v3/klines',
    'https://api1.binance.com/api/v3/klines',
    'https://api2.binance.com/api/v3/klines',
    'https://api3.binance.com/api/v3/klines',
    'https://api.mexc.com/api/v3/klines' // MEXC has the same response format
  ];

  for (const endpoint of binanceEndpoints) {
    try {
      const response = await fetch(`${endpoint}?symbol=BTCUSDT&interval=1m&limit=${limit}`);
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${endpoint}, trying next...`);
    }
  }
  
  // 2. Try Bybit
  try {
    const response = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=1&limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      if (data?.result?.list && Array.isArray(data.result.list)) {
        // Bybit returns descending, we need ascending
        const bybitData = data.result.list.map((c: any) => [
          parseInt(c[0]), // Open time
          c[1], // Open
          c[2], // High
          c[3], // Low
          c[4], // Close
          c[5], // Volume
          parseInt(c[0]) + 59999, // Close time
          c[6], // Quote asset volume
          0, // Number of trades
          "0", // Taker buy base asset volume
          "0", // Taker buy quote asset volume
          "0" // Ignore
        ]).reverse();
        if (bybitData.length > 0) return bybitData;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch from Bybit`);
  }

  // 3. Try OKX
  try {
    const response = await fetch(`https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=1m&limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      if (data?.data && Array.isArray(data.data)) {
        // OKX returns descending, we need ascending
        const okxData = data.data.map((c: any) => [
          parseInt(c[0]), // Open time
          c[1], // Open
          c[2], // High
          c[3], // Low
          c[4], // Close
          c[5], // Volume
          parseInt(c[0]) + 59999, // Close time
          c[6], // Quote asset volume
          0, // Number of trades
          "0", // Taker buy base asset volume
          "0", // Taker buy quote asset volume
          "0" // Ignore
        ]).reverse();
        if (okxData.length > 0) return okxData;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch from OKX`);
  }

  // 4. Try KuCoin
  try {
    const response = await fetch(`https://api.kucoin.com/api/v1/market/candles?type=1min&symbol=BTC-USDT`);
    if (response.ok) {
      const data = await response.json();
      if (data?.data && Array.isArray(data.data)) {
        // KuCoin returns descending, we need ascending
        const kucoinData = data.data.slice(0, limit).map((c: any) => [
          parseInt(c[0]) * 1000, // Open time
          c[1], // Open
          c[3], // High
          c[4], // Low
          c[2], // Close
          c[5], // Volume
          parseInt(c[0]) * 1000 + 59999, // Close time
          c[6], // Quote asset volume
          0, // Number of trades
          "0", // Taker buy base asset volume
          "0", // Taker buy quote asset volume
          "0" // Ignore
        ]).reverse();
        if (kucoinData.length > 0) return kucoinData;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch from KuCoin`);
  }

  // 5. Try CryptoCompare
  try {
    const response = await fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      if (data?.Data?.Data && Array.isArray(data.Data.Data)) {
        const ccData = data.Data.Data.map((c: any) => [
          c.time * 1000, // Open time
          c.open.toString(), // Open
          c.high.toString(), // High
          c.low.toString(), // Low
          c.close.toString(), // Close
          c.volumefrom.toString(), // Volume
          c.time * 1000 + 59999, // Close time
          c.volumeto.toString(), // Quote asset volume
          0, // Number of trades
          "0", // Taker buy base asset volume
          "0", // Taker buy quote asset volume
          "0" // Ignore
        ]);
        if (ccData.length > 0) return ccData;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch from CryptoCompare`);
  }

  // 6. Try Kraken
  try {
    const response = await fetch(`https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1`);
    if (response.ok) {
      const data = await response.json();
      if (data?.result?.XXBTZUSD && Array.isArray(data.result.XXBTZUSD)) {
        const krakenData = data.result.XXBTZUSD.slice(-limit).map((c: any) => [
          c[0] * 1000, // Open time
          c[1], // Open
          c[2], // High
          c[3], // Low
          c[4], // Close
          c[6], // Volume
          c[0] * 1000 + 59999, // Close time
          "0", // Quote asset volume
          c[7], // Number of trades
          "0", // Taker buy base asset volume
          "0", // Taker buy quote asset volume
          "0" // Ignore
        ]);
        if (krakenData.length > 0) return krakenData;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch from Kraken`);
  }

  // 7. Try Huobi
  try {
    const response = await fetch(`https://api.huobi.pro/market/history/kline?period=1min&size=${limit}&symbol=btcusdt`);
    if (response.ok) {
      const data = await response.json();
      if (data?.data && Array.isArray(data.data)) {
        const huobiData = data.data.map((c: any) => [
          c.id * 1000, // Open time
          c.open.toString(), // Open
          c.high.toString(), // High
          c.low.toString(), // Low
          c.close.toString(), // Close
          c.amount.toString(), // Volume
          c.id * 1000 + 59999, // Close time
          c.vol.toString(), // Quote asset volume
          c.count, // Number of trades
          "0", // Taker buy base asset volume
          "0", // Taker buy quote asset volume
          "0" // Ignore
        ]).reverse();
        if (huobiData.length > 0) return huobiData;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch from Huobi`);
  }

  // 8. Try CoinGecko
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=1`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        // CoinGecko returns 30-minute candles if days=1, but let's just use it as a fallback if needed
        // Format: [time, open, high, low, close]
        const cgData = data.slice(-limit).map((c: any) => [
          c[0], // Open time
          c[1].toString(), // Open
          c[2].toString(), // High
          c[3].toString(), // Low
          c[4].toString(), // Close
          "0", // Volume
          c[0] + 1799999, // Close time (approx 30m)
          "0", // Quote asset volume
          0, // Number of trades
          "0", // Taker buy base asset volume
          "0", // Taker buy quote asset volume
          "0" // Ignore
        ]);
        if (cgData.length > 0) return cgData;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch from CoinGecko`);
  }

  // 9. Last resort: CORS proxies with multiple exchanges
  const targetUrls = [
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=${limit}`,
    `https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=1&limit=${limit}`,
    `https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=1m&limit=${limit}`
  ];

  const proxyBases = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  ];

  for (const targetUrl of targetUrls) {
    for (const proxyBase of proxyBases) {
      try {
        const proxyUrl = proxyBase(targetUrl);
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const data = await response.json();
          
          // Parse Binance format
          if (targetUrl.includes('binance') && Array.isArray(data) && data.length > 0) {
            return data;
          }
          
          // Parse Bybit format
          if (targetUrl.includes('bybit') && data?.result?.list && Array.isArray(data.result.list)) {
            const bybitData = data.result.list.map((c: any) => [
              parseInt(c[0]), c[1], c[2], c[3], c[4], c[5], parseInt(c[0]) + 59999, c[6], 0, "0", "0", "0"
            ]).reverse();
            if (bybitData.length > 0) return bybitData;
          }
          
          // Parse OKX format
          if (targetUrl.includes('okx') && data?.data && Array.isArray(data.data)) {
            const okxData = data.data.map((c: any) => [
              parseInt(c[0]), c[1], c[2], c[3], c[4], c[5], parseInt(c[0]) + 59999, c[6], 0, "0", "0", "0"
            ]).reverse();
            if (okxData.length > 0) return okxData;
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch via proxy ${proxyBase(targetUrl)}`);
      }
    }
  }
  
  console.warn("Using mock data fallback for candles as all endpoints failed.");
  
  // Generate mock candles as a last resort
  const mockCandles = [];
  let currentPrice = 65000;
  const now = Date.now();
  for (let i = limit - 1; i >= 0; i--) {
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * 100;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;
    mockCandles.push([
      now - i * 60000, // Open time
      open.toString(), // Open
      high.toString(), // High
      low.toString(),  // Low
      close.toString(),// Close
      "0", // Volume
      now - i * 60000 + 59999, // Close time
      "0", // Quote asset volume
      0, // Number of trades
      "0", // Taker buy base asset volume
      "0", // Taker buy quote asset volume
      "0" // Ignore
    ]);
    currentPrice = close;
  }
  return mockCandles;
};
