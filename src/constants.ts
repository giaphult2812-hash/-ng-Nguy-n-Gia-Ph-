import { useEffect, useState, useRef } from 'react';

// Constants
export const REFRESH_RATE = 1000;

// Types
export type CandleColor = 'green' | 'red' | 'none';

export interface GameState {
  grid: CandleColor[]; // Array of 60 items (0-59)
  currentMinute: number;
  currentSecond: number;
  currentHour: number;
  phase: 'ORDER' | 'WAIT';
  balance: number;
  betAmount: number;
  lastResultProcessedMinute: number;
}

// Sound Assets (Public URLs)
export const SOUNDS = {
  CLICK: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  WIN: 'https://tiengdong.com/wp-content/uploads/Am-thanh-tinh-tien-edit-video-www_tiengdong_com.mp3', // Cha-ching / Coin drop from tiengdong.com
};

// Helper to get Vietnam Time
export const getVietnamTime = () => {
  const now = new Date();
  // Convert to UTC+7
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const vnTime = new Date(utc + (3600000 * 7));
  return vnTime;
};

// Helper to determine candle color
export const getCandleColor = (open: string, close: string): CandleColor => {
  const o = parseFloat(open);
  const c = parseFloat(close);
  if (c >= o) return 'green';
  return 'red';
};
