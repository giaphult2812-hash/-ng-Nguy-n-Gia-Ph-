import React from 'react';
import { TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';

interface BettingControlsProps {
  phase: 'ORDER' | 'WAIT';
  balance: number;
  betAmount: number;
  setBetAmount: (amount: number | ((prev: number) => number)) => void;
  onBet: (type: 'UP' | 'DOWN') => void;
  currentBets: { UP: number; DOWN: number };
  timeLeft: number;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  phase,
  balance,
  betAmount,
  setBetAmount,
  onBet,
  currentBets,
  timeLeft
}) => {
  const isLocked = phase === 'WAIT';

  const handleIncrement = () => setBetAmount(prev => prev + 5);
  const handleDecrement = () => setBetAmount(prev => Math.max(1, prev - 5));

  return (
    <div className="w-full h-full bg-[#130720] border-t lg:border-t-0 border-purple-500/20 p-4 pb-6 lg:p-6 shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.3)] lg:shadow-none relative z-20 flex flex-col justify-center">
      {/* Profit Info */}
      <div className="flex justify-center items-center gap-2 mb-3 text-xs px-2">
        <span className="text-slate-400 font-bold tracking-wide uppercase text-[10px] shrink-0">Lợi nhuận</span>
        <span className="text-purple-500 font-black shrink-0">95%</span>
        <span className="text-emerald-500 font-bold truncate">+${(betAmount * 1.95).toFixed(2)}</span>
      </div>

      {/* Input Row */}
      <div className="flex items-center gap-3 mb-4">
        <button 
          onClick={handleDecrement}
          className="w-12 h-12 flex items-center justify-center bg-[#1A0B2E] rounded-xl text-slate-400 hover:text-purple-400 hover:bg-[#2D1B4E] transition-colors border border-purple-500/20 shadow-sm"
        >
          <Minus className="w-5 h-5" />
        </button>
        
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</div>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
            className="w-full h-12 bg-[#1A0B2E] text-white font-black text-xl pl-8 pr-3 rounded-xl text-center focus:outline-none border-2 border-purple-500/20 focus:border-purple-500 transition-colors shadow-sm"
          />
        </div>

        <button 
          onClick={handleIncrement}
          className="w-12 h-12 flex items-center justify-center bg-[#1A0B2E] rounded-xl text-slate-400 hover:text-purple-400 hover:bg-[#2D1B4E] transition-colors border border-purple-500/20 shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Buttons Row */}
      <div className="flex gap-4 h-16 px-1">
        <button
          onClick={() => onBet('DOWN')}
          disabled={isLocked}
          className={`flex-1 rounded-2xl flex items-center justify-center gap-2 font-black text-white transition-all duration-300 text-xl relative overflow-hidden shadow-lg group border-2
            ${isLocked 
              ? 'bg-[#1A0B2E] border-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-b from-rose-500 to-rose-600 border-rose-500/50 hover:from-rose-400 hover:to-rose-500 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(225,29,72,0.5)] active:scale-[0.98] hover:-translate-y-0.5'
            }`}
        >
          {!isLocked && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out z-0" />
          )}
          <span className="z-10 relative">BÁN</span>
          <TrendingDown className={`w-6 h-6 z-10 relative ${isLocked ? 'text-slate-500' : 'text-white'}`} strokeWidth={3} />
          
          {currentBets.DOWN > 0 && (
            <div className="absolute top-1.5 right-2.5 text-[10px] bg-white/20 px-2 py-0.5 rounded-md text-white font-bold backdrop-blur-sm border border-white/30 z-20">
              ${currentBets.DOWN}
            </div>
          )}
        </button>

        {/* Timer - Compact */}
        <div className="w-24 flex flex-col items-center justify-center bg-[#1A0B2E] rounded-2xl border border-purple-500/20 shadow-sm shrink-0">
          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">
            {phase === 'ORDER' ? 'Đặt lệnh' : 'Chờ KQ'}
          </span>
          <span className={`text-2xl font-black font-mono leading-none ${phase === 'ORDER' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {timeLeft}s
          </span>
        </div>

        <button
          onClick={() => onBet('UP')}
          disabled={isLocked}
          className={`flex-1 rounded-2xl flex items-center justify-center gap-2 font-black text-white transition-all duration-300 text-xl relative overflow-hidden shadow-lg group border-2
            ${isLocked 
              ? 'bg-[#1A0B2E] border-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-500/50 hover:from-emerald-400 hover:to-emerald-500 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-[0.98] hover:-translate-y-0.5'
            }`}
        >
          {!isLocked && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out z-0" />
          )}
          <span className="z-10 relative">MUA</span>
          <TrendingUp className={`w-6 h-6 z-10 relative ${isLocked ? 'text-slate-500' : 'text-white'}`} strokeWidth={3} />
          
          {currentBets.UP > 0 && (
            <div className="absolute top-1.5 right-2.5 text-[10px] bg-white/20 px-2 py-0.5 rounded-md text-white font-bold backdrop-blur-sm border border-white/30 z-20">
              ${currentBets.UP}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
