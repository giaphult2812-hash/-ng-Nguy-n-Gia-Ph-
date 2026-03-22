import React, { useState, useEffect } from 'react';
import { Gift, ChevronLeft, ChevronRight, Inbox, Rocket, Users, TrendingUp, Trophy } from 'lucide-react';

interface StreakChallengeProps {
  onBackToTrade: () => void;
  jackpotPool: number;
}

// Generate random names like Tra***, Bos***
const generateRandomName = () => {
  const prefixes = ['Tra', 'Bos', 'Ngo', 'Beo', 'Huy', 'Lan', 'Min', 'Dat', 'Son', 'Tua', 'Kha', 'Linh'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}***`;
};

// Generate random streak type
const generateStreakType = () => {
  const isWin = Math.random() > 0.5;
  const streakCount = Math.floor(Math.random() * 5) + 5; // 5x to 9x
  return {
    type: `${isWin ? 'Win' : 'Lose'} Streak ${streakCount}x`,
    isWin
  };
};

export function StreakChallenge({ onBackToTrade, jackpotPool }: StreakChallengeProps) {
  const [activeTab, setActiveTab] = useState<'GLOBAL' | 'PERSONAL'>('GLOBAL');
  const [globalWinners, setGlobalWinners] = useState<any[]>([]);
  const [megaWinner, setMegaWinner] = useState({ 
    name: generateRandomName().replace('***', 'WINNER').toUpperCase(), 
    amount: Number((Math.random() * 2000 + 2000).toFixed(2)), 
    date: new Date().toLocaleDateString('vi-VN') 
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initialize and periodically update winners
  useEffect(() => {
    const generateInitialWinners = () => {
      const winners = [];
      const today = new Date();
      for (let i = 0; i < 4; i++) {
        const streak = generateStreakType();
        winners.push({
          type: streak.type,
          amount: Number((Math.random() * 50 + 10).toFixed(2)),
          user: generateRandomName(),
          date: today.toLocaleDateString('vi-VN'),
          isWin: streak.isWin
        });
      }
      return winners;
    };

    setGlobalWinners(generateInitialWinners());

    // Add a new winner every 5 seconds to simulate live activity
    const interval = setInterval(() => {
      setGlobalWinners(prev => {
        const streak = generateStreakType();
        const newWinner = {
          type: streak.type,
          amount: Number((Math.random() * 50 + 10).toFixed(2)),
          user: generateRandomName(),
          date: new Date().toLocaleDateString('vi-VN'),
          isWin: streak.isWin
        };
        // Keep only top 4
        return [newWinner, ...prev.slice(0, 3)];
      });
      
      // Occasionally update Mega Winner (20% chance per interval)
      if (Math.random() < 0.2) {
        setMegaWinner({
          name: generateRandomName().replace('***', 'WINNER').toUpperCase(),
          amount: Number((Math.random() * 2000 + 2000).toFixed(2)),
          date: new Date().toLocaleDateString('vi-VN')
        });
      }
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 text-slate-900 relative">
      {/* Background Globe/Space effect */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-slate-50 to-slate-50 pointer-events-none"></div>
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-300/30 rounded-[100%] blur-[80px] pointer-events-none"></div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 pb-24">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-8 text-slate-800 drop-shadow-sm">
            STREAK<br />CHALLENGE
          </h1>

          <div className="relative inline-block mb-8">
            {/* Flame graphic approximation */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-16 bg-gradient-to-t from-orange-400 via-purple-400 to-transparent blur-md rounded-t-full opacity-60"></div>
            
            <div className="relative bg-white border-2 border-purple-200 rounded-full px-8 py-2 mb-4 shadow-sm">
              <span className="text-purple-600 font-black tracking-widest">PRIZE POOL</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl border-2 border-emerald-100 flex items-center justify-center shadow-sm shrink-0">
                <Gift className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-500" />
              </div>
              <div className="text-3xl sm:text-5xl md:text-6xl font-black text-amber-500 drop-shadow-sm break-all px-2">
                ${jackpotPool.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl border-2 border-amber-100 flex items-center justify-center shadow-sm shrink-0">
                <Gift className="w-5 h-5 sm:w-8 sm:h-8 text-amber-500" />
              </div>
            </div>

            <div className="inline-block bg-purple-100 border border-purple-200 rounded-full px-6 py-1.5 shadow-sm">
              <span className="text-purple-700 font-bold text-sm">${megaWinner.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-purple-500 uppercase ml-1 font-black">Mega Prizes</span></span>
            </div>
          </div>

          <button 
            onClick={onBackToTrade}
            className="block w-full max-w-md mx-auto bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl shadow-md transition-all text-lg mb-4 border-2 border-purple-600"
          >
            Giao dịch & Chiến thắng
          </button>
          
          <button 
            onClick={() => showToast("Tính năng đang phát triển")}
            className="text-purple-600 hover:text-purple-500 text-sm font-bold transition-colors"
          >
            Xem thêm thông tin
          </button>
        </div>

        {/* Winners Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-wider">Vinh danh người chiến thắng</h3>
            <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter text-slate-800 drop-shadow-sm">
              NGƯỜI CHIẾN THẮNG<br />MỚI NHẤT
            </h2>
          </div>

          {/* Mega Jackpot Winner Card */}
          <div className="bg-gradient-to-b from-amber-50 to-white border border-amber-200 rounded-3xl p-6 text-center mb-8 relative overflow-hidden shadow-sm transition-all duration-500">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-200 rounded-b-xl px-4 py-1 whitespace-nowrap">
              <span className="text-amber-600 text-xs font-black tracking-wider">MEGA JACKPOT WINNER</span>
            </div>
            
            <div className="mt-10 mb-2">
              <h3 className="text-2xl font-black text-amber-600 tracking-wide">{megaWinner.name}</h3>
              <p className="text-slate-500 text-sm font-medium">Won Mega Prizes {megaWinner.date}</p>
            </div>
            
            <div className="inline-block bg-purple-100 border border-purple-200 rounded-full px-6 py-1.5 shadow-sm mt-2">
              <span className="text-purple-700 font-black text-lg">${megaWinner.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button 
              className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'GLOBAL' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('GLOBAL')}
            >
              Lịch sử nhận giải
              {activeTab === 'GLOBAL' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600"></div>}
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'PERSONAL' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('PERSONAL')}
            >
              Lịch sử của bạn
              {activeTab === 'PERSONAL' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600"></div>}
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[300px] shadow-sm">
            {activeTab === 'GLOBAL' ? (
              <div className="divide-y divide-slate-100">
                {globalWinners.map((winner, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className={`font-bold text-sm ${winner.isWin ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {winner.type}
                      </div>
                      <div className="text-slate-900 font-black mt-1">
                        $ {winner.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-700 font-bold text-sm">{winner.user}</div>
                      <div className="text-slate-400 text-xs mt-1 font-medium">{winner.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                <Inbox className="w-12 h-12 mb-3 opacity-50" strokeWidth={1.5} />
                <p className="text-sm font-medium">No data</p>
              </div>
            )}
          </div>
          
          {/* Pagination (Visual only) */}
          {activeTab === 'GLOBAL' && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button 
                onClick={() => showToast("Bạn đang ở trang đầu tiên")}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                1
              </button>
              <button 
                onClick={() => showToast("Tính năng đang phát triển")}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Guide Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Rocket className="w-8 h-8 text-purple-500" />
            <div>
              <h3 className="text-purple-600 text-sm font-black uppercase tracking-wider">Hướng dẫn</h3>
              <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-800">
                CÁCH THAM GIA THỬ THÁCH
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-sm">
              <div className="w-16 h-16 mx-auto bg-purple-50 rounded-full flex items-center justify-center mb-4 relative border border-purple-100">
                <span className="absolute -top-2 -left-2 text-2xl font-black italic text-purple-300">1</span>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2">ĐĂNG KÝ</h4>
              <p className="text-slate-500 text-sm font-medium">Đăng ký<br />bằng email của bạn</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-sm">
              <div className="w-16 h-16 mx-auto bg-purple-50 rounded-full flex items-center justify-center mb-4 relative border border-purple-100">
                <span className="absolute -top-2 -left-2 text-2xl font-black italic text-purple-300">2</span>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2">GIAO DỊCH</h4>
              <p className="text-slate-500 text-sm font-medium">Giao dịch<br />và kiếm lợi nhuận</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-sm">
              <div className="w-16 h-16 mx-auto bg-purple-50 rounded-full flex items-center justify-center mb-4 relative border border-purple-100">
                <span className="absolute -top-2 -left-2 text-2xl font-black italic text-purple-300">3</span>
                <Trophy className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2">CHIẾN THẮNG</h4>
              <p className="text-slate-500 text-sm font-medium">Bạn càng giao dịch nhiều<br />cơ hội thắng càng lớn</p>
            </div>
          </div>
        </div>

        {/* Rules & Terms Section */}
        <div className="space-y-8 text-slate-600 text-sm leading-relaxed font-medium">
          <div>
            <h3 className="text-xl font-black text-slate-800 mb-4">Về thử thách này</h3>
            <p>
              Thử thách Streak (Thử thách) là một chương trình khuyến khích cho phép các nhà giao dịch gặt hái phần thưởng cho cả những lần thua và thắng của họ. 0,05% tổng khối lượng giao dịch trên nền tảng của chúng tôi được gửi tới giải độc đắc lũy tiến Thử thách Streak mỗi phút. Mỗi khi ai đó chiến thắng Thử thách, 0,1% từ giải độc đắc hấp dẫn này sẽ được trả cho họ. Tìm hiểu cách đánh bại Thử thách.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-800 mb-4">Điều khoản và chính sách</h3>
            <p className="mb-4">
              Người dùng chỉ có thể giao dịch Lên hoặc xuống trong một phiên và phải giao dịch trong các phiên đặt cược liên tục. Mỗi giao dịch trong một phiên phải có ít nhất $10. Số chuỗi thắng hoặc chuỗi thua phải là 9. Trong trường hợp có nhiều người trúng giải độc đắc trong cùng một phiên, giải thưởng sẽ được chia đều cho những người trúng giải này. Người dùng phải hoàn thành KYC trên hệ thống của chúng tôi để đủ điều kiện tham gia thử thách này. Ngoài ra, sẽ có một giải thưởng Mega đặc biệt hàng ngày gấp 5 lần số tiền nhận được được chọn ngẫu nhiên từ những người dùng trúng giải độc đắc vào ngày hiện tại. Nếu trong ngày hôm nay không có người dùng trúng jackpot thì sẽ không có giải Mega. Xin lưu ý rằng phần thưởng sẽ được phân phối vào Ví của tài khoản sau khoảng 48 giờ.
            </p>
            <p className="mb-4">
              Chúng tôi bảo lưu quyền thay đổi hoặc sửa đổi bất kỳ điều khoản và điều kiện nào có trong Điều khoản và Điều kiện hoặc bất kỳ chính sách hoặc hướng dẫn nào trên nền tảng của chúng tôi, bất cứ lúc nào và theo quyết định riêng của chúng tôi. Mọi thay đổi hoặc sửa đổi sẽ có hiệu lực ngay khi đăng các sửa đổi trên nền tảng của chúng tôi hoặc thông báo cho bạn về những thay đổi hoặc sửa đổi đó qua email.
            </p>
            <p className="mb-4">
              Chương trình Jackpot cộng đồng và các lợi ích của nó được cung cấp theo quyết định riêng của chúng tôi. Chúng tôi bảo lưu quyền sửa đổi hoặc chấm dứt giải thưởng Jackpot cũng như cách chúng tôi đánh giá và thưởng cho các giao dịch đủ điều kiện của bạn.
            </p>
            <p>
              Chúng tôi có toàn quyền quyết định sửa đổi hoặc chấm dứt quyền nhận giải Jackpot của bạn khi phát hiện ra bất kỳ hành vi gian lận và không trung thực nào do bạn thực hiện để kiếm thêm giải Jackpot theo khuyến mại này. Bạn sẽ không đủ điều kiện tham gia thêm vào chương trình Jackpot cộng đồng hoặc bị cấm sử dụng dịch vụ của chúng tôi vĩnh viễn mà không có thông báo trước từ phía chúng tôi về những sự cố như vậy. Quyết định của chúng tôi sẽ là quyết định cuối cùng và chúng tôi sẽ không tham gia vào bất kỳ cuộc thảo luận nào về vấn đề này.
            </p>
          </div>
        </div>

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl z-[100] font-medium text-sm border border-slate-700 transition-all">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
