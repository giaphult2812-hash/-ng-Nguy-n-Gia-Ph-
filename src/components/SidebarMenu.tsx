import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Wallet, 
  Layers, 
  Bot, 
  Share2, 
  Rocket, 
  User, 
  LayoutDashboard, 
  ArrowLeftRight, 
  Settings, 
  CreditCard,
  ChevronLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Eye,
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ArrowRightLeft,
  UserPlus,
  ShieldCheck
} from 'lucide-react';
import { Bet } from '../hooks/useGameLogic';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, increment, addDoc, runTransaction } from 'firebase/firestore';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  betHistory: Bet[];
  realBalance: number;
  setRealBalance: (amount: number | ((prev: number) => number)) => void;
  usdtBalance: number;
  setUsdtBalance: (amount: number | ((prev: number) => number)) => void;
  setActivePage: (page: 'TRADE' | 'STREAK_CHALLENGE' | 'VIP_AFFILIATE' | 'PROFILE' | 'DASHBOARD' | 'BOT' | 'SETTINGS' | 'ADMIN') => void;
  activePage: 'TRADE' | 'STREAK_CHALLENGE' | 'VIP_AFFILIATE' | 'PROFILE' | 'DASHBOARD' | 'BOT' | 'SETTINGS' | 'ADMIN';
  userProfile: any;
}

type View = 'MENU' | 'ORDERS' | 'WALLET';
type OrderTab = 'OPEN' | 'MATCHED';
type WalletTab = 'MAIN' | 'TRADING';
type TransferDirection = 'USDT_TO_REAL' | 'REAL_TO_USDT';

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ 
  isOpen, 
  onClose, 
  betHistory, 
  realBalance,
  setRealBalance,
  usdtBalance,
  setUsdtBalance,
  setActivePage,
  activePage,
  userProfile
}) => {
  const [activeView, setActiveView] = useState<View>('MENU');
  const [activeTab, setActiveTab] = useState<OrderTab>('OPEN');
  const [walletTab, setWalletTab] = useState<WalletTab>('MAIN');
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  
  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [activeDepositTab, setActiveDepositTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [transferDirection, setTransferDirection] = useState<TransferDirection>('USDT_TO_REAL');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [selectedMenu, setSelectedMenu] = useState<string>(activePage);

  // Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawNickname, setWithdrawNickname] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyDepositAddress = () => {
    navigator.clipboard.writeText("0x1234567890abcdef1234567890abcdef12345678");
    showToast("Đã sao chép địa chỉ ví!");
  };

  const handleMaxWithdraw = () => {
    setWithdrawAmount(usdtBalance.toString());
  };

  const handlePasteNickname = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setWithdrawNickname(text);
    } catch (err) {
      showToast("Không thể dán từ clipboard");
    }
  };

  const handleWithdrawSubmit = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 5) {
      showToast("Số tiền tối thiểu là 5 USDT");
      return;
    }
    if (amount > usdtBalance) {
      showToast("Số dư không đủ");
      return;
    }
    if (!withdrawNickname.trim()) {
      showToast("Vui lòng nhập biệt danh người nhận");
      return;
    }
    if (withdrawNickname.toLowerCase() === userProfile?.nickname?.toLowerCase()) {
      showToast("Không thể chuyển tiền cho chính mình");
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('nickname', '==', withdrawNickname));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showToast(`Không tìm thấy biệt danh "${withdrawNickname}"`);
        return;
      }

      const recipientDoc = querySnapshot.docs[0];
      
      if (userProfile?.uid) {
        if (userProfile.uid === recipientDoc.id) {
          showToast("Không thể chuyển tiền cho chính mình");
          return;
        }

        try {
          await runTransaction(db, async (transaction) => {
            const senderRef = doc(db, 'users', userProfile.uid);
            const recipientRef = doc(db, 'users', recipientDoc.id);

            const senderDocSnap = await transaction.get(senderRef);
            if (!senderDocSnap.exists()) {
              throw new Error("Không tìm thấy thông tin người gửi");
            }

            const currentBalance = senderDocSnap.data().usdtBalance || 0;
            if (currentBalance < amount) {
              throw new Error("Số dư không đủ");
            }

            transaction.update(senderRef, {
              usdtBalance: increment(-amount)
            });

            transaction.update(recipientRef, {
              usdtBalance: increment(amount)
            });
          });

          // Create notification for recipient
          await addDoc(collection(db, 'notifications'), {
            userId: recipientDoc.id,
            type: 'Nhận tiền nội bộ',
            from: userProfile.nickname || 'Người dùng',
            to: withdrawNickname,
            amount: amount,
            read: false,
            createdAt: new Date().toISOString()
          });

          // Create notification for sender
          await addDoc(collection(db, 'notifications'), {
            userId: userProfile.uid,
            type: 'Chuyển tiền nội bộ',
            from: userProfile.nickname || 'Người dùng',
            to: withdrawNickname,
            amount: -amount,
            read: false,
            createdAt: new Date().toISOString()
          });

          // Update sender's balance locally
          setUsdtBalance(prev => prev - amount);
          showToast(`Chuyển thành công ${amount} USDT đến ${withdrawNickname}`);
          setWithdrawAmount('');
          setWithdrawNickname('');
          setWithdrawNote('');
          setTimeout(() => {
            setIsDepositModalOpen(false);
          }, 1500);
        } catch (error: any) {
          console.error("Transaction error:", error);
          showToast(error.message || "Có lỗi xảy ra khi chuyển tiền");
        }
      }
    } catch (error) {
      console.error("Error transferring funds:", error);
      showToast("Có lỗi xảy ra khi chuyển tiền");
    }
  };

  // Sync selectedMenu with activePage
  React.useEffect(() => {
    setSelectedMenu(activePage);
  }, [activePage]);

  // Reset view when closed
  React.useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setActiveView('MENU');
        setActiveTab('OPEN');
        setWalletTab('MAIN');
        setSelectedMenu(activePage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activePage]);

  const openOrders = betHistory.filter(bet => bet.status === 'PENDING');
  const matchedOrders = betHistory.filter(bet => bet.status !== 'PENDING');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatFullDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      if (userProfile?.uid) {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', userProfile.uid);
          const userDocSnap = await transaction.get(userRef);
          
          if (!userDocSnap.exists()) {
            throw new Error("Không tìm thấy thông tin người dùng");
          }

          const currentUsdt = userDocSnap.data().usdtBalance || 0;
          const currentReal = userDocSnap.data().realBalance || 0;

          if (transferDirection === 'USDT_TO_REAL') {
            if (currentUsdt < amount) {
              throw new Error("Số dư USDT không đủ");
            }
            transaction.update(userRef, {
              usdtBalance: increment(-amount),
              realBalance: increment(amount)
            });
          } else {
            if (currentReal < amount) {
              throw new Error("Số dư Thực không đủ");
            }
            transaction.update(userRef, {
              realBalance: increment(-amount),
              usdtBalance: increment(amount)
            });
          }
        });

        if (transferDirection === 'USDT_TO_REAL') {
          await addDoc(collection(db, 'notifications'), {
            userId: userProfile.uid,
            type: 'Nạp tiền',
            from: 'Ví USDT',
            to: 'Ví Thực',
            amount: amount,
            read: false,
            createdAt: new Date().toISOString()
          });
          setUsdtBalance(prev => prev - amount);
          setRealBalance(prev => prev + amount);
        } else {
          await addDoc(collection(db, 'notifications'), {
            userId: userProfile.uid,
            type: 'Rút tiền',
            from: 'Ví Thực',
            to: 'Ví USDT',
            amount: amount,
            read: false,
            createdAt: new Date().toISOString()
          });
          setRealBalance(prev => prev - amount);
          setUsdtBalance(prev => prev + amount);
        }
        
        setTransferAmount('');
        setIsTransferModalOpen(false);
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      showToast(error.message || "Có lỗi xảy ra khi chuyển tiền");
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className={`absolute top-0 left-0 h-full bg-[#131722] border-r border-[#2A2E39] z-[70] flex flex-col shadow-2xl transition-all duration-300 ${activeView === 'MENU' ? 'w-[85%] sm:w-[300px]' : 'w-full'}`}
          >
            {/* Header */}
            <div className="h-[60px] flex items-center justify-between px-4 border-b border-[#2A2E39] shrink-0">
              {activeView === 'ORDERS' ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveView('MENU')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2A2E39] text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-bold text-white">Lịch sử giao dịch</span>
                </div>
              ) : activeView === 'WALLET' ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveView('MENU')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2A2E39] text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-bold text-white">Ví</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 relative shrink-0 filter drop-shadow-[0_0_5px_rgba(168,85,247,0.6)]">
                      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="sidebarLogoBody" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#D8B4FE" />
                            <stop offset="50%" stopColor="#9333EA" />
                            <stop offset="100%" stopColor="#581C87" />
                          </linearGradient>
                        </defs>
                        <path d="M10 55 C 10 25, 90 25, 90 55" stroke="url(#sidebarLogoBody)" strokeWidth="4" fill="none" strokeLinecap="round" transform="rotate(-20 50 50)" opacity="0.8" />
                        <path d="M28 20 H 72 L 62 35 H 42 V 45 H 58 L 50 58 H 42 V 80 L 28 80 V 20 Z" fill="url(#sidebarLogoBody)" />
                        <path d="M 52 80 L 65 45 L 82 80 H 68 L 66 72 H 58 L 55 80 H 52 Z M 62 62 L 65 52 L 68 62 H 62 Z" fill="url(#sidebarLogoBody)" />
                        <path d="M90 55 C 90 85, 10 85, 10 55" stroke="url(#sidebarLogoBody)" strokeWidth="4" fill="none" strokeLinecap="round" transform="rotate(-20 50 50)" opacity="0.9" strokeDasharray="100" strokeDashoffset="0" />
                      </svg>
                   </div>
                   <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 font-orbitron tracking-wider">
                      FUTUREALPHA
                   </span>
                </div>
              )}
              
              {/* Close Button */}
              {activeView === 'MENU' && (
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2A2E39] text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-[#131722]">
              {activeView === 'MENU' ? (
                <div className="p-4 space-y-6">
                  {/* Deposit Button */}
                  <button 
                    onClick={() => {
                      setIsDepositModalOpen(true);
                      setActiveDepositTab('DEPOSIT');
                    }}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out z-0" />
                    <CreditCard className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">Nạp Tiền</span>
                  </button>

                  {/* Earn Money Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Kiếm tiền</h3>
                    
                    <MenuItem 
                      icon={Layers} 
                      label="Giao Dịch" 
                      active={selectedMenu === 'TRADE'} 
                      onClick={() => {
                        setSelectedMenu('TRADE');
                        setActivePage('TRADE');
                        onClose();
                      }}
                    />
                    <MenuItem 
                      icon={Bot} 
                      label="Bot giao dịch" 
                      active={selectedMenu === 'BOT'}
                      onClick={() => {
                        setSelectedMenu('BOT');
                        setActivePage('BOT');
                        onClose();
                      }}
                    />
                    <MenuItem 
                      icon={Share2} 
                      label="Thành Viên VIP" 
                      active={selectedMenu === 'VIP_AFFILIATE'}
                      onClick={() => {
                        setSelectedMenu('VIP_AFFILIATE');
                        setActivePage('VIP_AFFILIATE');
                        onClose();
                      }}
                    />
                    <MenuItem 
                      icon={Rocket} 
                      label="Streak Challenge" 
                      badge="NEW" 
                      active={selectedMenu === 'STREAK_CHALLENGE'}
                      onClick={() => {
                        setSelectedMenu('STREAK_CHALLENGE');
                        setActivePage('STREAK_CHALLENGE');
                        onClose();
                      }}
                    />
                  </div>

                  {/* Profile Management Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quản lý hồ sơ</h3>
                    
                    <div 
                      className={`bg-[#1E2329] hover:bg-[#2A2E39] border border-[#2A2E39] rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors group ${selectedMenu === 'PROFILE' ? 'bg-[#2A2E39] border-purple-500/50' : ''}`}
                      onClick={() => {
                        setSelectedMenu('PROFILE');
                        setActivePage('PROFILE');
                        onClose();
                      }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors overflow-hidden ${selectedMenu === 'PROFILE' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 group-hover:bg-purple-600 group-hover:text-white'}`}>
                        {userProfile?.avatarUrl ? (
                          <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`font-medium transition-colors ${selectedMenu === 'PROFILE' ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                        {userProfile?.nickname || 'User'}
                      </span>
                    </div>

                    <MenuItem 
                      icon={LayoutDashboard} 
                      label="Bảng Điều Khiển" 
                      active={selectedMenu === 'DASHBOARD'}
                      onClick={() => {
                        setSelectedMenu('DASHBOARD');
                        setActivePage('DASHBOARD');
                        onClose();
                      }}
                    />
                    <MenuItem 
                      icon={ArrowLeftRight} 
                      label="Lệnh" 
                      active={selectedMenu === 'ORDERS'}
                      onClick={() => {
                        setSelectedMenu('ORDERS');
                        setActiveView('ORDERS');
                      }} 
                    />
                    <MenuItem 
                      icon={Wallet} 
                      label="Ví" 
                      active={selectedMenu === 'WALLET'}
                      onClick={() => {
                        setSelectedMenu('WALLET');
                        setActiveView('WALLET');
                      }} 
                    />
                  </div>

                  {/* Settings Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cài đặt & Trợ giúp</h3>
                    
                    {userProfile?.role === 'admin' && (
                      <MenuItem 
                        icon={ShieldCheck} 
                        label="Admin Dashboard" 
                        active={selectedMenu === 'ADMIN'}
                        onClick={() => {
                          setSelectedMenu('ADMIN');
                          setActivePage('ADMIN');
                          onClose();
                        }}
                      />
                    )}

                    <MenuItem 
                      icon={Settings} 
                      label="Cài đặt" 
                      active={selectedMenu === 'SETTINGS'}
                      onClick={() => {
                        setSelectedMenu('SETTINGS');
                        setActivePage('SETTINGS');
                        onClose();
                      }}
                    />
                  </div>
                </div>
              ) : activeView === 'ORDERS' ? (
                <div className="flex flex-col h-full">
                  {/* Tabs */}
                  <div className="flex p-4 gap-3 border-b border-[#2A2E39]">
                    <button 
                      onClick={() => setActiveTab('OPEN')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'OPEN' 
                          ? 'bg-[#22C55E] text-white shadow-lg shadow-green-500/20' 
                          : 'bg-[#1E2329] text-slate-400 hover:bg-[#2A2E39] hover:text-slate-200'
                      }`}
                    >
                      Lệnh Đang Mở
                    </button>
                    <button 
                      onClick={() => setActiveTab('MATCHED')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'MATCHED' 
                          ? 'bg-[#22C55E] text-white shadow-lg shadow-green-500/20' 
                          : 'bg-[#1E2329] text-slate-400 hover:bg-[#2A2E39] hover:text-slate-200'
                      }`}
                    >
                      Lệnh Đã Khớp
                    </button>
                  </div>

                  {/* Orders List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeTab === 'OPEN' ? (
                      openOrders.length > 0 ? (
                        openOrders.map(bet => (
                          <OrderCard key={bet.id} bet={bet} formatDate={formatDate} />
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                          <Clock className="w-10 h-10 mb-2 opacity-20" />
                          <span className="text-sm">Không có lệnh đang mở</span>
                        </div>
                      )
                    ) : (
                      matchedOrders.length > 0 ? (
                        <>
                          <div className="text-xs font-bold text-slate-400 mb-2">
                            {formatFullDate(new Date())}
                          </div>
                          {matchedOrders.map(bet => (
                            <OrderCard key={bet.id} bet={bet} formatDate={formatDate} />
                          ))}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                          <Layers className="w-10 h-10 mb-2 opacity-20" />
                          <span className="text-sm">Chưa có lịch sử giao dịch</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full bg-[#0B0E14]">
                  {/* Top Green Section */}
                  <div className="bg-[#32B11D] p-5 text-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm opacity-90">Tổng tài sản (USDT)</span>
                      <button 
                        onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                        className="flex items-center gap-1.5 text-sm opacity-90 hover:opacity-100 transition-opacity"
                      >
                        {isBalanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{isBalanceHidden ? 'Hiện số dư' : 'Ẩn số dư'}</span>
                      </button>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight break-all">
                      {isBalanceHidden ? '******' : realBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Wallet Tabs */}
                  <div className="flex border-b border-[#2A2E39] bg-[#1E2329]">
                    <button 
                      onClick={() => setWalletTab('MAIN')}
                      className={`flex-1 py-3 text-sm font-bold transition-all relative ${
                        walletTab === 'MAIN' ? 'text-[#32B11D]' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Ví Chính
                      {walletTab === 'MAIN' && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[#32B11D] rounded-t-full" />
                      )}
                    </button>
                    <button 
                      onClick={() => setWalletTab('TRADING')}
                      className={`flex-1 py-3 text-sm font-bold transition-all relative ${
                        walletTab === 'TRADING' ? 'text-[#32B11D]' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Ví Giao dịch
                      {walletTab === 'TRADING' && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[#32B11D] rounded-t-full" />
                      )}
                    </button>
                  </div>

                  {/* Wallet Content */}
                  <div className="p-4 flex-1 overflow-y-auto">
                    {walletTab === 'MAIN' ? (
                      <>
                        {/* Asset Card */}
                        <div className="bg-[#1E2329] rounded-xl border border-[#2A2E39] overflow-hidden mb-6">
                          <div className="p-4 flex items-center justify-between border-b border-[#2A2E39]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#26A17B] rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">₮</span>
                              </div>
                              <div>
                                <div className="font-bold text-white">USDT</div>
                                <div className="text-xs text-slate-400">Tether</div>
                              </div>
                            </div>
                            <div className="text-right max-w-[50%]">
                              <div className="font-bold text-white break-all">
                                {isBalanceHidden ? '******' : realBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-slate-400">
                                ~${isBalanceHidden ? '0' : realBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                          <div className="flex divide-x divide-[#2A2E39]">
                            <button 
                              onClick={() => {
                                setIsDepositModalOpen(true);
                                setActiveDepositTab('DEPOSIT');
                              }}
                              className="flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-[#2A2E39] transition-colors"
                            >
                              <ArrowDownToLine className="w-4 h-4 text-[#22C55E]" />
                              Nạp Tiền
                            </button>
                            <button 
                              onClick={() => {
                                setIsDepositModalOpen(true);
                                setActiveDepositTab('WITHDRAW');
                              }}
                              className="flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-[#2A2E39] transition-colors"
                            >
                              <ArrowUpFromLine className="w-4 h-4 text-[#EF4444]" />
                              Rút Tiền
                            </button>
                          </div>
                        </div>

                        {/* Transaction History */}
                        <div>
                          <h3 className="text-lg font-bold text-white mb-4">Lịch sử giao dịch</h3>
                          
                          {/* Filter Dropdown */}
                          <button className="flex items-center gap-2 bg-[#1E2329] border border-[#2A2E39] rounded-lg px-3 py-2 text-sm font-medium text-slate-200 mb-4 hover:border-slate-500 transition-colors">
                            <div className="w-4 h-4 bg-[#26A17B] rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-[8px]">₮</span>
                            </div>
                            USDT
                            <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                          </button>

                          {/* Empty State */}
                          <div className="bg-[#1E2329] border border-[#2A2E39] rounded-lg p-8 flex items-center justify-center text-slate-400 text-sm">
                            Không có dữ liệu
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Trading Wallet Card */}
                        <div className="relative bg-gradient-to-br from-[#1E2D4A] to-[#111A2E] rounded-xl overflow-hidden mb-8 p-6 flex flex-col items-center justify-center shadow-lg border border-white/5">
                          {/* Decorative circles */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl"></div>
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 blur-lg"></div>
                          
                          <div className="text-slate-400 text-sm mb-2 relative z-10">Tài khoản Thực</div>
                          <div className="text-white text-3xl sm:text-4xl font-bold mb-6 relative z-10 break-all px-4 text-center">
                            ${isBalanceHidden ? '******' : realBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </div>
                          
                          <button 
                            onClick={() => setIsTransferModalOpen(true)}
                            className="relative z-10 w-full max-w-[200px] bg-[#32B11D] hover:bg-[#2C9A1A] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                          >
                            <ArrowRightLeft className="w-5 h-5" />
                            Chuyển Tiền
                          </button>
                        </div>

                        {/* Transaction History */}
                        <div>
                          <h3 className="text-xl font-bold text-white mb-4">Lịch sử giao dịch</h3>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-[70] bg-[#0B101B] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-6">
              <h2 className="text-2xl font-bold text-white">Chuyển Tiền</h2>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Accounts Panel */}
            <div className="flex items-center bg-[#1C2127] relative mt-4 border-y border-white/5">
              {/* Left Account */}
              <div className="flex-1 py-6 sm:py-8 flex flex-col items-center justify-center border-r border-white/5 px-2 text-center">
                <div className="text-xs sm:text-sm mb-2 sm:mb-3">
                  {transferDirection === 'USDT_TO_REAL' ? (
                    <span className="text-white">Ví <span className="text-[#22C55E]">USDT</span></span>
                  ) : (
                    <span className="text-white">Tài khoản Thực</span>
                  )}
                </div>
                <div className="text-xl sm:text-3xl text-white break-all">
                  {transferDirection === 'USDT_TO_REAL' 
                    ? usdtBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                    : realBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                  }
                </div>
              </div>

              {/* Swap Button */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <button 
                  onClick={() => setTransferDirection(prev => prev === 'USDT_TO_REAL' ? 'REAL_TO_USDT' : 'USDT_TO_REAL')}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-200 transition-colors"
                >
                  <ArrowRightLeft className="w-5 h-5 text-black" />
                </button>
              </div>

              {/* Right Account */}
              <div className="flex-1 py-6 sm:py-8 flex flex-col items-center justify-center px-2 text-center">
                <div className="text-xs sm:text-sm mb-2 sm:mb-3">
                  {transferDirection === 'USDT_TO_REAL' ? (
                    <span className="text-white">Tài khoản Thực</span>
                  ) : (
                    <span className="text-white">Ví <span className="text-[#22C55E]">USDT</span></span>
                  )}
                </div>
                <div className="text-xl sm:text-3xl text-white break-all">
                  {transferDirection === 'USDT_TO_REAL' 
                    ? realBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                    : usdtBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                  }
                </div>
              </div>
            </div>

            <div className="p-4 mt-4 flex-1">
              {/* Amount Input */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-white mb-4">Số tiền chuyển</label>
                <div className="relative border-b border-white/20 pb-2">
                  <input 
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent outline-none text-white text-xl placeholder:text-slate-400 pr-24"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#26A17B] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">₮</span>
                    </div>
                    <button 
                      onClick={() => setTransferAmount(
                        transferDirection === 'USDT_TO_REAL' ? usdtBalance.toString() : realBalance.toString()
                      )}
                      className="text-[#22C55E] text-sm font-medium"
                    >
                      TẤT CẢ
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-[#1C2127] rounded-lg p-5 text-sm text-slate-300 leading-relaxed">
                Bạn chỉ có thể giao dịch khi tài sản được chuyển đến tài khoản tương ứng. Chuyển tài sản không tốn phí.
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-4 pb-8">
              <button 
                onClick={handleTransfer}
                disabled={!transferAmount || parseFloat(transferAmount) <= 0 || (transferDirection === 'USDT_TO_REAL' ? parseFloat(transferAmount) > usdtBalance : parseFloat(transferAmount) > realBalance)}
                className="w-full bg-[#32B11D] hover:bg-[#2C9A1A] disabled:bg-[#32B11D]/50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-colors text-lg"
              >
                Chuyển Tiền
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-[70] bg-[#0B101B] flex flex-col"
          >
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pt-4 px-4">
              <div className="flex flex-1">
                <button 
                  onClick={() => setActiveDepositTab('DEPOSIT')}
                  className={`flex-1 py-4 font-bold border-b-2 transition-colors ${activeDepositTab === 'DEPOSIT' ? 'text-white border-[#32B11D]' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  Nạp Tiền
                </button>
                <button 
                  onClick={() => setActiveDepositTab('WITHDRAW')}
                  className={`flex-1 py-4 font-bold border-b-2 transition-colors ${activeDepositTab === 'WITHDRAW' ? 'text-white border-[#32B11D]' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
                >
                  Rút Tiền
                </button>
              </div>
              <button 
                onClick={() => setIsDepositModalOpen(false)}
                className="p-2 ml-4 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* USDT Balance Box */}
              <div className="bg-[#1C2127] border border-white/5 rounded-lg p-3 flex items-center gap-3">
                <div className="w-6 h-6 bg-[#26A17B] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">₮</span>
                </div>
                <span className="text-white font-medium">{usdtBalance.toFixed(2)}</span>
              </div>

              {activeDepositTab === 'DEPOSIT' ? (
                <>
                  {/* Network Selection */}
                  <div>
                    <div className="text-sm text-slate-400 mb-1.5">Mạng lưới</div>
                    <button 
                      onClick={() => showToast("Chỉ hỗ trợ mạng BEP20 (BSC) hiện tại")}
                      className="bg-[#32B11D] text-white font-bold py-2.5 px-6 rounded-lg"
                    >
                      BEP20 (BSC)
                    </button>
                  </div>

                  {/* Warning Box */}
                  <div className="border border-[#32B11D]/30 bg-[#32B11D]/5 rounded-lg p-3">
                    <p className="text-[#32B11D] text-sm leading-relaxed">
                      <span className="font-bold">Chú ý:</span> Để đảm bảo an toàn cho tài sản của bạn, xin hãy xác nhận lần nữa blockchain bạn cần dùng là BSC.
                    </p>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex flex-col items-center pt-2">
                    <h3 className="text-lg text-white mb-4">
                      Địa chỉ <span className="text-[#32B11D] font-bold">USDT</span> nạp tiền của bạn
                    </h3>
                    
                    <div className="bg-white p-3 rounded-xl mb-4">
                      <img 
                        src="https://img.vietqr.io/image/MB-0909867182-qr_only.png" 
                        alt="QR Code" 
                        className="w-40 h-40 object-contain"
                      />
                    </div>

                    <div className="text-slate-300 italic text-sm mb-4">
                      Số tiền tối thiểu: 5 USDT
                    </div>

                    <button 
                      onClick={handleCopyDepositAddress}
                      className="w-full max-w-xs bg-[#00C896] hover:bg-[#00B386] text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      Sao chép
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Withdraw Form */}
                  {/* Network Selection */}
                  <div>
                    <div className="text-sm text-slate-400 mb-1.5">Mạng lưới</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => showToast("Chỉ hỗ trợ chuyển nội bộ hiện tại")}
                        className="flex-1 bg-[#32B11D] text-white py-2.5 px-4 rounded-lg flex flex-col items-center justify-center relative border border-[#32B11D]"
                      >
                        <span className="font-bold">Nội bộ</span>
                        <span className="text-xs text-white/80">Phí: 0 USDT</span>
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#0B101B]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      </button>
                      <div className="flex-1"></div>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <div className="text-sm text-slate-400">Số lượng USDT</div>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Số tiền tối thiểu: 5 USDT"
                        className="w-full bg-[#1C2127] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#32B11D] transition-colors"
                      />
                      <button 
                        onClick={handleMaxWithdraw}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#32B11D] text-white text-sm font-bold px-3 py-1.5 rounded"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  {/* Recipient Input */}
                  <div className="space-y-1.5">
                    <div className="text-sm text-slate-400">Biệt danh người nhận</div>
                    <input 
                      type="text" 
                      value={withdrawNickname}
                      onChange={(e) => setWithdrawNickname(e.target.value)}
                      placeholder="Nhập biệt danh người nhận"
                      className="w-full bg-[#1C2127] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#32B11D] transition-colors"
                    />
                  </div>

                  {/* Note Input */}
                  <div className="space-y-1.5">
                    <div className="text-sm text-slate-400">Ghi chú (tuỳ chọn)</div>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={withdrawNote}
                        onChange={(e) => setWithdrawNote(e.target.value)}
                        placeholder="Nhập ghi chú của bạn (tối đa 50 ký tự)"
                        className="w-full bg-[#1C2127] border border-white/10 rounded-lg py-3 px-4 pr-16 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#32B11D] transition-colors"
                      />
                      <button 
                        onClick={handlePasteNickname}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#32B11D] text-sm font-medium"
                      >
                        Paste
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button 
                      onClick={handleWithdrawSubmit}
                      className="w-full bg-[#FF334B] hover:bg-[#E62E43] text-white font-bold py-3.5 rounded-lg transition-colors"
                    >
                      Gửi
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl z-[100] font-medium text-sm border border-slate-700"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface OrderCardProps {
  bet: Bet;
  formatDate: (date: Date) => string;
}

const OrderCard: React.FC<OrderCardProps> = ({ bet, formatDate }) => {
  const isWin = bet.status === 'WIN';
  const isLoss = bet.status === 'LOSS';
  const isPending = bet.status === 'PENDING';
  
  return (
    <div className="bg-[#1E2329] rounded-lg p-4 border border-[#2A2E39] hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">BTC/USD</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            bet.accountType === 'DEMO' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
          }`}>
            {bet.accountType}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-[#F7931A] flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">₿</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-2">
        <div className={`flex items-center gap-1.5 font-bold ${
          bet.type === 'UP' ? 'text-emerald-500' : 'text-rose-500'
        }`}>
          {bet.type === 'UP' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
          {/* Use invisible character to maintain height if needed, or just icon */}
        </div>
        <span className="text-white font-bold">${bet.amount}</span>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500">{formatDate(bet.time)}</span>
        <span className={`font-bold ${
          isWin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-slate-400'
        }`}>
          {isPending ? 'Đang chờ...' : (
            isWin ? `+$${bet.resultAmount?.toFixed(1)}` : `-$${bet.amount}`
          )}
        </span>
      </div>
    </div>
  );
};

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, active, badge, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all border ${
        active 
          ? 'bg-[#22C55E] border-[#22C55E] text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
          : 'bg-[#1E2329] border-[#2A2E39] text-slate-300 hover:bg-[#2A2E39] hover:border-slate-600 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
        <span className="font-medium">{label}</span>
      </div>
      {badge && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
          {badge} <span className="text-xs">🔥</span>
        </span>
      )}
    </button>
  );
};
