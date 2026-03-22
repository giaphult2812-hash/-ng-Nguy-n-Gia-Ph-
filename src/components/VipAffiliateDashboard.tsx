import React, { useState, useEffect } from 'react';
import { Copy, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, addDoc, runTransaction, doc, increment, query, where, getDocs } from 'firebase/firestore';

interface VipAffiliateDashboardProps {
  realBalance: number;
  setRealBalance: (amount: number | ((prev: number) => number)) => void;
  userProfile?: any;
}

interface VipData {
  isVIP: boolean;
  referralCode: string;
}

export const VipAffiliateDashboard: React.FC<VipAffiliateDashboardProps> = ({ realBalance, setRealBalance, userProfile }) => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [referredCount, setReferredCount] = useState(0);
  const [commissionEarned, setCommissionEarned] = useState(0);

  const isVIP = userProfile?.isVIP || false;
  const referralCode = userProfile?.referralCode || '';

  useEffect(() => {
    const fetchAffiliateData = async () => {
      if (isVIP && referralCode && userProfile?.uid) {
        try {
          // Fetch referred users count
          const usersRef = collection(db, 'users');
          const qUsers = query(usersRef, where('referral', '==', referralCode));
          const usersSnap = await getDocs(qUsers);
          setReferredCount(usersSnap.size);

          // Fetch total commission earned
          const notifRef = collection(db, 'notifications');
          const qNotif = query(notifRef, where('userId', '==', userProfile.uid), where('type', '==', 'Hoa hồng VIP'));
          const notifSnap = await getDocs(qNotif);
          let total = 0;
          notifSnap.forEach(doc => {
            total += doc.data().amount || 0;
          });
          setCommissionEarned(total);
        } catch (error) {
          console.error("Error fetching affiliate data:", error);
        }
      }
    };
    fetchAffiliateData();
  }, [isVIP, referralCode, userProfile?.uid]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleBuyVIP = async () => {
    if (realBalance >= 100) {
      if (userProfile?.uid) {
        try {
          const newCode = generateCode();
          
          await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userProfile.uid);
            const userDocSnap = await transaction.get(userRef);
            
            if (!userDocSnap.exists()) {
              throw new Error("Không tìm thấy thông tin người dùng");
            }

            const currentReal = userDocSnap.data().realBalance || 0;
            if (currentReal < 100) {
              throw new Error("Số dư Thực không đủ");
            }

            transaction.update(userRef, {
              realBalance: increment(-100),
              isVIP: true,
              referralCode: newCode
            });
          });

          setRealBalance((prev) => prev - 100);
          showToast('Nâng cấp VIP thành công!');
          
          await addDoc(collection(db, 'notifications'), {
            userId: userProfile.uid,
            type: 'Mua VIP',
            from: 'Ví Thực',
            to: 'Hệ Thống',
            amount: -100,
            read: false,
            createdAt: new Date().toISOString()
          });
        } catch (error: any) {
          console.error("Error buying VIP:", error);
          showToast(error.message || "Có lỗi xảy ra khi mua VIP", 'error');
        }
      }
    } else {
      showToast('Số dư không đủ!', 'error');
    }
  };

  const handleCopy = async (text: string) => {
    if (!isVIP) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Đã sao chép');
    } catch (err) {
      showToast('Lỗi sao chép', 'error');
    }
  };

  const affiliateLink = `${window.location.origin}?ref=${referralCode || 'XXXXXX'}`;
  const displayCode = referralCode || 'XXXXXX';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0F0518] overflow-y-auto">
      <div className="p-5 pt-8 pb-20 max-w-md mx-auto w-full">
        {/* Header Text */}
        <h1 className="text-[22px] leading-[1.3] font-semibold text-white mb-6">
          Bạn cần trở thành Thành viên VIP để nhận hoa hồng VIP và hoa hồng giao dịch
        </h1>

        {/* Action Button (Conditional) */}
        {!isVIP && (
          <button
            onClick={handleBuyVIP}
            className="w-full sm:w-auto mb-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-8 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out z-0" />
            <span className="relative z-10">Mua ngay $100</span>
          </button>
        )}

        {/* Affiliate Box */}
        <div className="relative mb-8">
          {/* Blur Overlay if not VIP */}
          {!isVIP && (
            <div className="absolute inset-0 z-10 backdrop-blur-[3px] bg-[#0F0518]/40 rounded-2xl flex items-center justify-center border border-purple-500/20">
              <div className="bg-[#131722]/90 px-4 py-2 rounded-lg border border-purple-500/30 text-purple-300 text-sm font-medium shadow-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Yêu cầu VIP để mở khóa
              </div>
            </div>
          )}

          <div className={`bg-[#131722] border border-purple-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-500 ${!isVIP ? 'opacity-60 grayscale-[0.3]' : 'shadow-[0_0_30px_rgba(139,92,246,0.15)]'}`}>
            
            {/* Input Group 1: Link */}
            <div className="mb-5">
              <label className="block text-sm text-slate-400 mb-2 font-medium">Link đăng ký</label>
              <div className="flex bg-[#0F0518] rounded-xl border border-slate-700/50 overflow-hidden focus-within:border-purple-500/50 transition-colors">
                <input
                  type="text"
                  readOnly
                  value={affiliateLink}
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-200 outline-none w-full"
                />
                <button
                  onClick={() => handleCopy(affiliateLink)}
                  disabled={!isVIP}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  Sao chép
                </button>
              </div>
            </div>

            {/* Input Group 2: Code */}
            <div>
              <label className="block text-sm text-slate-400 mb-2 font-medium">Mã giới thiệu</label>
              <div className="flex bg-[#0F0518] rounded-xl border border-slate-700/50 overflow-hidden focus-within:border-purple-500/50 transition-colors">
                <input
                  type="text"
                  readOnly
                  value={displayCode}
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-200 outline-none font-mono tracking-wider"
                />
                <button
                  onClick={() => handleCopy(displayCode)}
                  disabled={!isVIP}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  Sao chép
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#131722] rounded-2xl p-5 border border-slate-800 flex gap-4 items-start">
            <div className="relative shrink-0 mt-1">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              {/* Badge */}
              <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#131722]">
                {referredCount}
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium text-base mb-1">Bạn bè đăng kí</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Bạn bè của bạn chấp nhận lời mời, hoàn thành đăng kí và sử dụng
              </p>
            </div>
          </div>

          <div className="bg-[#131722] rounded-2xl p-5 border border-slate-800 flex gap-4 items-start">
            <div className="relative shrink-0 mt-1">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                <span className="text-emerald-500 font-bold text-lg">$</span>
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium text-base mb-1">Hoa hồng nhận được</h3>
              <p className="text-emerald-400 text-xl font-bold mt-2">
                ${commissionEarned.toFixed(4)}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Từ 0.01% lợi nhuận của cấp dưới
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium z-50 border backdrop-blur-md whitespace-nowrap
              ${toast.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
