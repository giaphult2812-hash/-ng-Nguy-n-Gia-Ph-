import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, CandlestickSeries, Time, LineSeries, HistogramSeries } from 'lightweight-charts';
import { fetchCandles } from '../services/binanceService';

interface ChartComponentProps {
  data: any[];
}

export const ChartComponent: React.FC<ChartComponentProps> = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const sma5SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma10SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceColor, setPriceColor] = useState<'text-emerald-500' | 'text-rose-500' | 'text-white'>('text-white');
  const [sentiment, setSentiment] = useState<{ buy: number; sell: number }>({ buy: 50, sell: 50 });
  
  const lastPriceRef = useRef<number | null>(null);
  const candlesDataRef = useRef<any[]>([]); // Store full candle data for calculations
  const wsRef = useRef<WebSocket | null>(null);
  const colorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to calculate SMA
  const calculateSMA = (data: any[], period: number) => {
    const smaData = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        // Not enough data for SMA yet
        smaData.push({ time: data[i].time, value: NaN });
        continue;
      }
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
      smaData.push({ time: data[i].time, value: sum / period });
    }
    return smaData.filter(d => !isNaN(d.value)); // Filter out NaNs for Lightweight Charts
  };

  // Helper to calculate Sentiment (Buy/Sell Volume Ratio)
  const calculateSentiment = (data: any[]) => {
    // Look at last 20 candles
    const recent = data.slice(-20);
    let buyVol = 0;
    let sellVol = 0;

    recent.forEach(c => {
      if (c.close >= c.open) {
        buyVol += c.volume;
      } else {
        sellVol += c.volume;
      }
    });

    const total = buyVol + sellVol;
    if (total === 0) return { buy: 50, sell: 50 };

    const buyPercent = (buyVol / total) * 100;
    return {
      buy: parseFloat(buyPercent.toFixed(1)),
      sell: parseFloat((100 - buyPercent).toFixed(1))
    };
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0F0518' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1E112A' },
        horzLines: { color: '#1E112A' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2A1B3D',
      },
      rightPriceScale: {
        borderColor: '#2A1B3D',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Add Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set as an overlay
    });

    // Configure the overlay price scale for volume to sit at the bottom
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8, // Highest volume bar will be at 80% from top (so bottom 20%)
        bottom: 0,
      },
    });

    // Add SMA Series
    const sma5Series = chart.addSeries(LineSeries, {
      color: '#10B981', // Green for SMA 5
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const sma10Series = chart.addSeries(LineSeries, {
      color: '#EF4444', // Red for SMA 10
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    sma5SeriesRef.current = sma5Series;
    sma10SeriesRef.current = sma10Series;
    volumeSeriesRef.current = volumeSeries;

    const initializeChart = async () => {
      try {
        const binanceData = await fetchCandles(100);
        const initialData = binanceData.map((d: any) => ({
          time: Math.floor(d[0] / 1000) as Time,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }));

        candlesDataRef.current = initialData;
        candleSeries.setData(initialData);

        const volumeData = initialData.map((d: any) => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? '#10B981' : '#EF4444',
        }));
        volumeSeries.setData(volumeData);
        
        const sma5Data = calculateSMA(initialData, 5);
        const sma10Data = calculateSMA(initialData, 10);
        sma5Series.setData(sma5Data);
        sma10Series.setData(sma10Data);

        setSentiment(calculateSentiment(initialData));

        if (initialData.length > 0) {
          const lastClose = initialData[initialData.length - 1].close;
          setCurrentPrice(lastClose);
          lastPriceRef.current = lastClose;
        }

        // Real-time Updates via Binance WebSocket
        let currentCandle = { ...initialData[initialData.length - 1] };
        
        const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
        wsRef.current = ws;

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const kline = data.k;
          
          const newPrice = parseFloat(kline.c); // Current close price
          const newVolume = parseFloat(kline.v); // Current volume
          
          const currentMinuteSec = Math.floor(kline.t / 1000) as Time;

          if (currentCandle.time !== currentMinuteSec) {
            // New minute, start new candle
            currentCandle = {
              time: currentMinuteSec,
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: newPrice,
              volume: newVolume
            };
            candlesDataRef.current.push(currentCandle);
            if (candlesDataRef.current.length > 200) {
              candlesDataRef.current.shift();
            }
          } else {
            // Update existing candle
            currentCandle.open = parseFloat(kline.o);
            currentCandle.high = parseFloat(kline.h);
            currentCandle.low = parseFloat(kline.l);
            currentCandle.close = newPrice;
            currentCandle.volume = newVolume;
            candlesDataRef.current[candlesDataRef.current.length - 1] = currentCandle;
          }

          // Update Chart Series
          candleSeries.update(currentCandle);
          volumeSeries.update({
            time: currentCandle.time,
            value: currentCandle.volume,
            color: currentCandle.close >= currentCandle.open ? '#10B981' : '#EF4444',
          });

          // Update SMAs
          const currentData = candlesDataRef.current;
          if (currentData.length >= 5) {
            const slice5 = currentData.slice(-5);
            const sum5 = slice5.reduce((acc, curr) => acc + curr.close, 0);
            sma5Series.update({ time: currentCandle.time, value: sum5 / 5 });
          }
          if (currentData.length >= 10) {
            const slice10 = currentData.slice(-10);
            const sum10 = slice10.reduce((acc, curr) => acc + curr.close, 0);
            sma10Series.update({ time: currentCandle.time, value: sum10 / 10 });
          }

          // Update Sentiment and Price
          setSentiment(calculateSentiment(currentData));
          
          setCurrentPrice(newPrice);
          if (lastPriceRef.current !== null) {
            if (newPrice > lastPriceRef.current) {
              setPriceColor('text-emerald-500');
              if (colorTimeoutRef.current) clearTimeout(colorTimeoutRef.current);
              colorTimeoutRef.current = setTimeout(() => setPriceColor('text-white'), 1000);
            } else if (newPrice < lastPriceRef.current) {
              setPriceColor('text-rose-500');
              if (colorTimeoutRef.current) clearTimeout(colorTimeoutRef.current);
              colorTimeoutRef.current = setTimeout(() => setPriceColor('text-white'), 1000);
            }
          }
          lastPriceRef.current = newPrice;
        };

        ws.onerror = (err) => {
          console.error('Binance WebSocket Error:', err);
        };
      } catch (error) {
        console.error("Failed to initialize chart:", error);
      }
    };

    initializeChart();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (colorTimeoutRef.current) {
        clearTimeout(colorTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={chartContainerRef} className="w-full h-full [&_a]:hidden" />
      
      {/* Current Price Overlay */}
      {currentPrice !== null && (
        <div id="current-price" className={`absolute top-4 right-16 z-20 text-xl font-bold font-mono ${priceColor} bg-[#1A0B2E]/80 px-2 rounded shadow-sm border border-purple-500/20`}>
          {currentPrice.toFixed(2)}
        </div>
      )}

      {/* Sentiment/Strength Bar Overlay */}
      <div className="absolute left-2 top-10 bottom-10 w-1.5 bg-slate-200 rounded-full overflow-hidden flex flex-col z-20 border border-slate-300">
        {/* Sell (Red) - Top */}
        <div 
          className="w-full bg-rose-500 transition-all duration-500 ease-out"
          style={{ height: `${sentiment.sell}%` }}
        />
        {/* Buy (Green) - Bottom */}
        <div 
          className="w-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ height: `${sentiment.buy}%` }}
        />
      </div>
      
      {/* Sentiment Text Overlay (Optional, near the bar) */}
      <div className="absolute left-4 top-10 z-20 flex flex-col gap-1 pointer-events-none">
         <span className="text-[10px] font-bold text-rose-500">{sentiment.sell}%</span>
      </div>
      <div className="absolute left-4 bottom-10 z-20 flex flex-col gap-1 pointer-events-none justify-end">
         <span className="text-[10px] font-bold text-emerald-500">{sentiment.buy}%</span>
      </div>
    </div>
  );
};
