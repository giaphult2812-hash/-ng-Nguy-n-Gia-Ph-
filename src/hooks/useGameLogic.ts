import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, setDoc, updateDoc, query, where, getDocs, increment } from 'firebase/firestore';
import { getVietnamTime, getCandleColor, CandleColor, SOUNDS } from '../constants';
import { fetchCandles } from '../services/binanceService';

export interface Bet {
  id: string;
  type: 'UP' | 'DOWN';
  amount: number;
  time: Date;
  status: 'PENDING' | 'WIN' | 'LOSS';
  resultAmount?: number;
  accountType: 'DEMO' | 'REAL';
  targetMinute: number;
}

export const useGameLogic = (userProfile?: any) => {
  const [time, setTime] = useState(getVietnamTime());
  const [historyMap, setHistoryMap] = useState<Record<number, CandleColor>>({});
  
  // Account State
  const [accountType, setAccountType] = useState<'DEMO' | 'REAL'>('DEMO');
  const [demoBalance, setDemoBalance] = useState(1000);
  const [realBalance, setRealBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);

  // Load balances when userProfile changes
  useEffect(() => {
    if (userProfile?.uid) {
      let initialReal = 0;
      const savedReal = localStorage.getItem(`futureAlpha_realBalance_${userProfile.uid}`);
      if (savedReal) {
        initialReal = parseFloat(savedReal);
      } else {
        initialReal = userProfile.realBalance || 0;
      }
      
      // Force admin to have 100000 real balance if it's 0 or invalid
      if (userProfile.role === 'admin' || userProfile.email === 'giaphult2812@gmail.com') {
        if (initialReal === 0 || isNaN(initialReal)) {
          initialReal = 100000;
          localStorage.setItem(`futureAlpha_realBalance_${userProfile.uid}`, '100000');
        }
        // Auto switch admin to REAL account on load
        setAccountType('REAL');
      }
      
      setRealBalance(initialReal);
      
      const savedDemo = localStorage.getItem(`futureAlpha_demoBalance_${userProfile.uid}`);
      if (savedDemo) {
        setDemoBalance(parseFloat(savedDemo));
      } else {
        setDemoBalance(userProfile.demoBalance || 1000);
      }

      const savedUsdt = localStorage.getItem(`futureAlpha_usdtBalance_${userProfile.uid}`);
      if (savedUsdt) {
        setUsdtBalance(parseFloat(savedUsdt));
      } else {
        setUsdtBalance(userProfile.usdtBalance || 0);
      }
    } else {
      setDemoBalance(1000);
      setRealBalance(0);
      setUsdtBalance(0);
      setAccountType('DEMO');
    }
  }, [userProfile?.uid, userProfile?.role, userProfile?.email]);

  // Persist realBalance
  useEffect(() => {
    if (userProfile?.uid) {
      localStorage.setItem(`futureAlpha_realBalance_${userProfile.uid}`, realBalance.toString());
    }
  }, [realBalance, userProfile?.uid]);

  // Persist demoBalance
  useEffect(() => {
    if (userProfile?.uid) {
      localStorage.setItem(`futureAlpha_demoBalance_${userProfile.uid}`, demoBalance.toString());
    }
  }, [demoBalance, userProfile?.uid]);

  // Persist usdtBalance
  useEffect(() => {
    if (userProfile?.uid) {
      localStorage.setItem(`futureAlpha_usdtBalance_${userProfile.uid}`, usdtBalance.toString());
    }
  }, [usdtBalance, userProfile?.uid]);
  
  // Derived Balance
  const balance = accountType === 'DEMO' ? demoBalance : realBalance;
  
  const setBalance = (amount: number | ((prev: number) => number)) => {
    if (accountType === 'DEMO') {
      setDemoBalance(amount);
    } else {
      setRealBalance(amount);
    }
  };

  const switchAccount = (type: 'DEMO' | 'REAL') => {
    setAccountType(type);
  };

  const resetDemoBalance = () => {
    setDemoBalance(1000);
    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), { demoBalance: 1000 }).catch(console.error);
    }
    setNotification({ message: "Đã đặt lại số dư Demo", type: 'success' });
  };

  const resetRealBalance = async () => {
    if (userProfile?.role === 'admin' && userProfile?.uid) {
      setRealBalance(100000);
      try {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          realBalance: 100000
        });
      } catch (error) {
        console.error("Error resetting real balance in Firestore:", error);
      }
      setNotification({ message: "Đã đặt lại số dư Thực", type: 'success' });
    }
  };

  const [betAmount, setBetAmount] = useState(10);
  const [demoBets, setDemoBets] = useState<{ UP: number; DOWN: number }>({ UP: 0, DOWN: 0 });
  const [realBets, setRealBets] = useState<{ UP: number; DOWN: number }>({ UP: 0, DOWN: 0 });
  const currentBets = accountType === 'DEMO' ? demoBets : realBets;
  
  // Bet History State
  const [betHistory, setBetHistory] = useState<Bet[]>([]);

  const [lastProcessedPairIndex, setLastProcessedPairIndex] = useState(-1);
  const [notification, setNotification] = useState<{ message: string; type: 'win' | 'loss' | 'info' | 'success' } | null>(null);
  const [streak, setStreak] = useState<{ type: 'WIN' | 'LOSS' | 'NONE'; count: number }>({ type: 'NONE', count: 0 });
  const [jackpotPool, setJackpotPool] = useState(30723.00);

  // Refs for audio to avoid re-creation
  const audioClick = useRef(new Audio(SOUNDS.CLICK));
  
  // Hàm phát âm thanh chiến thắng độc lập có xử lý lỗi
  const playWinSound = () => {
    const winAudio = new Audio(SOUNDS.WIN);
    winAudio.play().catch((error) => {
      console.warn('Trình duyệt chặn tự động phát âm thanh:', error);
    });
  };

  const updateBalanceInFirestore = (type: 'DEMO' | 'REAL', newBalance: number) => {
    if (auth.currentUser) {
      const field = type === 'DEMO' ? 'demoBalance' : 'realBalance';
      updateDoc(doc(db, 'users', auth.currentUser.uid), {
        [field]: newBalance
      }).catch(error => {
        console.error("Error updating balance in Firestore:", error);
      });
    }
  };

  // 1. Time Synchronization (UTC+7)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Adjust to UTC+7 for display purposes
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const vnTime = new Date(utc + (3600000 * 7));
      setTime(vnTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentMinute = time.getMinutes();
  const currentSecond = time.getSeconds();
  
  // Phase Logic: Even minute = WAIT (Result), Odd minute = ORDER
  // Row 1 (Min 0, 4...) & Row 3 (Min 2, 6...) -> Result Phase (WAIT)
  // Row 2 (Min 1, 5...) & Row 4 (Min 3, 7...) -> Order Phase (ORDER)
  const isOrderPhase = currentMinute % 2 !== 0;
  const phase = isOrderPhase ? 'ORDER' : 'WAIT';

  // 2. Initial Data Fetch (Load closed candles based on current time to sync across all users)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch enough candles to ensure we have enough closed ones (e.g., 100)
        const data = await fetchCandles(100);
        
        const now = Date.now();
        const newMap: Record<number, CandleColor> = {};
        
        data.forEach((candle: any[]) => {
           // Only process closed candles
           if (candle[6] < now) {
               const candleAbsM = Math.floor(candle[0] / 60000);
               const color = getCandleColor(candle[1], candle[4]);
               newMap[candleAbsM] = color;
           }
        });
        
        setHistoryMap(newMap);
      } catch (e) {
        console.error("Failed to fetch history", e);
      }
    };
    
    fetchHistory();
  }, []); // Run once on mount

  // 3. Real-time Result Checking (Every minute at second 01)
  useEffect(() => {
    if (currentSecond === 1) {
       const targetMinute = currentMinute === 0 ? 59 : currentMinute - 1;
       checkResult(targetMinute);
    }
  }, [currentMinute, currentSecond]);

  const processReferralCommission = async (profit: number) => {
    if (!userProfile?.referral || profit <= 0 || userProfile.referral === userProfile.referralCode) return;
    
    try {
      const commission = profit * 0.0001; // 0.01%
      
      // Find the referrer
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referralCode', '==', userProfile.referral));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const referrerDoc = querySnapshot.docs[0];
        const referrerData = referrerDoc.data();
        
        if (referrerData.isVIP) {
          const referrerId = referrerDoc.id;
          
          // Update referrer's realBalance
          await updateDoc(doc(db, 'users', referrerId), {
            realBalance: increment(commission)
          });
          
          // Add a notification for the referrer
          await addDoc(collection(db, 'notifications'), {
            userId: referrerId,
            type: 'Hoa hồng VIP',
            from: userProfile.nickname || 'Cấp dưới',
            to: 'Ví Thực',
            amount: commission,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("Error processing referral commission:", error);
    }
  };

  const checkResult = async (minuteIndex: number) => {
    // Prevent double processing
    if (minuteIndex === lastProcessedPairIndex) return; 

    try {
      // Fetch recent candles to find the correct one
      const data = await fetchCandles(5);
      
      const targetCandle = data.find((c: any) => {
        const m = new Date(c[0] + (3600000 * 7)).getMinutes();
        return m === minuteIndex;
      });

      if (targetCandle) {
        const color = getCandleColor(targetCandle[1], targetCandle[4]);
        
        // Handle Betting Result
        // Payout on EVEN minutes (Row 1, 3...) which are the RESULT phases
        // We bet on ODD minutes (Order), and the result is the NEXT minute (Even)
        if (minuteIndex % 2 === 0) {
           const winningType = color === 'green' ? 'UP' : color === 'red' ? 'DOWN' : null;
           
           if (winningType) {
             // Process Bets History
             setBetHistory(prevHistory => {
               return prevHistory.map(bet => {
                 if (bet.status === 'PENDING' && bet.targetMinute === minuteIndex) {
                   const isWin = bet.type === winningType;
                   const winAmount = isWin ? bet.amount * 1.95 : 0;
                   const newStatus = isWin ? 'WIN' : 'LOSS';

                   // Update Firestore if real account
                   if (bet.accountType === 'REAL' && auth.currentUser) {
                     try {
                       updateDoc(doc(db, 'bets', bet.id), {
                         status: newStatus,
                         payout: isWin ? winAmount : 0,
                         exitPrice: 95000 + Math.random() * 1000 // Mock exit price
                       });
                     } catch (error) {
                       console.error("Error updating bet in Firestore:", error);
                     }
                   }

                   return {
                     ...bet,
                     status: newStatus,
                     resultAmount: isWin ? winAmount : -bet.amount
                   };
                 }
                 return bet;
               });
             });

             // Process Demo Bets (Aggregate)
             const demoWinAmount = demoBets[winningType] * 1.95;
             const demoTotalBet = demoBets.UP + demoBets.DOWN;
             
             if (demoTotalBet > 0) {
                if (demoWinAmount > 0) {
                    setDemoBalance(prev => {
                        const newBal = prev + demoWinAmount;
                        updateBalanceInFirestore('DEMO', newBal);
                        return newBal;
                    });
                    if (accountType === 'DEMO') {
                        playWinSound();
                        setNotification({ message: `WIN +$${demoWinAmount.toFixed(2)}`, type: 'win' });
                    }
                } else {
                    if (accountType === 'DEMO') {
                        setNotification({ message: `LOSS -$${demoTotalBet.toFixed(2)}`, type: 'loss' });
                    }
                }
             }

             // Process Real Bets (Aggregate)
             const realWinAmount = realBets[winningType] * 1.95;
             const realTotalBet = realBets.UP + realBets.DOWN;
             
             if (realTotalBet > 0) {
                if (realWinAmount > 0) {
                    const profit = realBets[winningType] * 0.95;
                    processReferralCommission(profit);
                    
                    setRealBalance(prev => {
                        const newBal = prev + realWinAmount;
                        updateBalanceInFirestore('REAL', newBal);
                        return newBal;
                    });
                    if (accountType === 'REAL') {
                        playWinSound();
                        setNotification({ message: `WIN +$${realWinAmount.toFixed(2)}`, type: 'win' });
                    }
                } else {
                    if (accountType === 'REAL') {
                        setNotification({ message: `LOSS -$${realTotalBet.toFixed(2)}`, type: 'loss' });
                    }
                }
             }

             // Streak Logic
             const totalBet = accountType === 'DEMO' ? demoTotalBet : realTotalBet;
             const winAmount = accountType === 'DEMO' ? demoWinAmount : realWinAmount;
             
             if (totalBet > 0) {
               const isWin = winAmount > 0;
               setStreak(prev => {
                 const newType = isWin ? 'WIN' : 'LOSS';
                 const newCount = prev.type === newType ? prev.count + 1 : 1;
                 
                 // Jackpot trigger logic (9+ streak)
                 if (newCount >= 9) {
                   // 10% chance to win the jackpot
                   if (Math.random() < 0.1) {
                     // 0.1% of jackpot pool
                     const jackpotWin = jackpotPool * 0.001;
                     if (accountType === 'REAL') {
                       setRealBalance(b => {
                           const newBal = b + jackpotWin;
                           updateBalanceInFirestore('REAL', newBal);
                           return newBal;
                       });
                     } else {
                       setDemoBalance(b => {
                           const newBal = b + jackpotWin;
                           updateBalanceInFirestore('DEMO', newBal);
                           return newBal;
                       });
                     }
                     setNotification({ message: `STREAK JACKPOT! +$${jackpotWin.toFixed(2)}`, type: 'success' });
                   }
                 }
                 
                 return { type: newType, count: newCount };
               });
             }
           }
           
           // Reset bets after processing result
           setDemoBets({ UP: 0, DOWN: 0 });
           setRealBets({ UP: 0, DOWN: 0 });
        }
        
        // Update Grid with Sliding Window Logic
        // We use the current state values directly since this runs once per minute
        const candleAbsM = Math.floor(targetCandle[0] / 60000);
        setHistoryMap(prev => ({
            ...prev,
            [candleAbsM]: color
        }));
        
        setLastProcessedPairIndex(minuteIndex);
      }
    } catch (e) {
      console.error("Error checking result", e);
    }
  };

  const handleBet = (type: 'UP' | 'DOWN') => {
    if (phase === 'WAIT') return;
    if (balance < betAmount) {
      setNotification({ message: "Số dư không đủ", type: 'info' });
      return;
    }
    
    // Deduct immediately and accumulate bet based on account type
    if (accountType === 'DEMO') {
        setDemoBalance(prev => {
            const newBal = prev - betAmount;
            updateBalanceInFirestore('DEMO', newBal);
            return newBal;
        });
        setDemoBets(prev => ({
            ...prev,
            [type]: prev[type] + betAmount
        }));
    } else {
        setRealBalance(prev => {
            const newBal = prev - betAmount;
            updateBalanceInFirestore('REAL', newBal);
            return newBal;
        });
        setRealBets(prev => ({
            ...prev,
            [type]: prev[type] + betAmount
        }));
        // 0.05% of real trading volume goes to jackpot
        setJackpotPool(prev => prev + (betAmount * 0.0005));
    }

    // Add to History
    const newBet: Bet = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      amount: betAmount,
      time: new Date(time), // Current VN time
      status: 'PENDING',
      accountType,
      targetMinute: (currentMinute + 1) % 60 // Target the next minute (Result Phase)
    };
    setBetHistory(prev => [newBet, ...prev]);

    // Save to Firestore if real account
    if (accountType === 'REAL' && auth.currentUser) {
      try {
        setDoc(doc(db, 'bets', newBet.id), {
          id: newBet.id,
          userId: auth.currentUser.uid,
          amount: betAmount,
          asset: 'BTC/USD',
          prediction: type,
          entryPrice: 95000 + Math.random() * 1000, // Mock entry price
          status: 'PENDING',
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error saving bet to Firestore:", error);
      }
    }
    
    audioClick.current.play();
    setNotification({ message: "Đặt lệnh thành công", type: 'success' });
  };

  // Derive grid and currentIndex from historyMap
  const realNow = Date.now();
  const currentAbsM = Math.floor(realNow / 60000);
  const currentIndex = 40 + (currentAbsM % 20);
  
  const grid = Array(60).fill('none') as CandleColor[];
  for (let i = 0; i < 60; i++) {
      const diff = currentIndex - i;
      const candleAbsM = currentAbsM - diff;
      grid[i] = historyMap[candleAbsM] || 'none';
  }

  return {
    time,
    grid,
    currentIndex,
    balance,
    demoBalance,
    realBalance,
    setRealBalance,
    usdtBalance,
    setUsdtBalance,
    accountType,
    switchAccount,
    resetDemoBalance,
    resetRealBalance,
    betAmount,
    setBetAmount,
    currentBets,
    phase,
    handleBet,
    notification,
    setNotification,
    betHistory,
    streak,
    jackpotPool
  };
};
