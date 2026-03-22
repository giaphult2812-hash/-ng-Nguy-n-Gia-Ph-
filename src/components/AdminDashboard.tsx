import React, { useState, useEffect } from 'react';
import { Users, Activity, DollarSign, ChevronLeft } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);

        const betsQuery = query(collection(db, 'bets'), orderBy('createdAt', 'desc'), limit(100));
        const betsSnapshot = await getDocs(betsQuery);
        const betsData = betsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBets(betsData);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalRealBalance = users.reduce((sum, user) => sum + (user.realBalance || 0), 0);
  const totalUsdtBalance = users.reduce((sum, user) => sum + (user.usdtBalance || 0), 0);

  const filteredBets = bets.filter(bet => {
    let matchDate = true;
    if (filterDate) {
      // bet.createdAt is an ISO string or timestamp, convert to YYYY-MM-DD local time
      const betDate = new Date(bet.createdAt);
      // Format to YYYY-MM-DD in local timezone
      const year = betDate.getFullYear();
      const month = String(betDate.getMonth() + 1).padStart(2, '0');
      const day = String(betDate.getDate()).padStart(2, '0');
      const formattedBetDate = `${year}-${month}-${day}`;
      matchDate = formattedBetDate === filterDate;
    }
    
    let matchType = true;
    if (filterType !== 'ALL') {
      matchType = bet.prediction === filterType;
    }
    
    return matchDate && matchType;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0F0518] overflow-y-auto text-slate-200 p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1E2329] hover:bg-[#2A2E39] transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#1E2329] p-6 rounded-xl border border-[#2A2E39]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-slate-400 font-medium">Tổng người dùng</h3>
              </div>
              <div className="text-3xl font-bold text-white">{users.length}</div>
            </div>
            
            <div className="bg-[#1E2329] p-6 rounded-xl border border-[#2A2E39]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-slate-400 font-medium">Tổng số dư Thực</h3>
              </div>
              <div className="text-3xl font-bold text-white">${totalRealBalance.toFixed(2)}</div>
            </div>

            <div className="bg-[#1E2329] p-6 rounded-xl border border-[#2A2E39]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-slate-400 font-medium">Tổng số dư USDT</h3>
              </div>
              <div className="text-3xl font-bold text-white">${totalUsdtBalance.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Users List */}
            <div className="bg-[#1E2329] rounded-xl border border-[#2A2E39] flex flex-col overflow-hidden h-[600px]">
              <div className="p-4 border-b border-[#2A2E39] shrink-0">
                <h2 className="text-lg font-bold text-white">Danh sách người dùng</h2>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#131722] text-slate-400 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Nickname</th>
                      <th className="px-4 py-3 font-medium">Vai trò</th>
                      <th className="px-4 py-3 font-medium text-right">Số dư Thực</th>
                      <th className="px-4 py-3 font-medium text-right">USDT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2E39]">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-[#2A2E39]/50 transition-colors">
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">{user.nickname}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-medium">${(user.realBalance || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">${(user.usdtBalance || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Bets */}
            <div className="bg-[#1E2329] rounded-xl border border-[#2A2E39] flex flex-col overflow-hidden h-[600px]">
              <div className="p-4 border-b border-[#2A2E39] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <h2 className="text-lg font-bold text-white">Lịch sử giao dịch gần đây</h2>
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-[#131722] border border-[#2A2E39] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ALL">Tất cả loại cược</option>
                    <option value="UP">UP (Tăng)</option>
                    <option value="DOWN">DOWN (Giảm)</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#131722] text-slate-400 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Thời gian</th>
                      <th className="px-4 py-3 font-medium">Nickname</th>
                      <th className="px-4 py-3 font-medium">Dự đoán</th>
                      <th className="px-4 py-3 font-medium text-right">Số tiền</th>
                      <th className="px-4 py-3 font-medium text-center">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2E39]">
                    {filteredBets.map(bet => {
                      const user = users.find(u => u.id === bet.userId);
                      const nickname = user?.nickname || `${bet.userId.substring(0, 8)}...`;
                      return (
                      <tr key={bet.id} className="hover:bg-[#2A2E39]/50 transition-colors">
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(bet.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{nickname}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${bet.prediction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {bet.prediction}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">${bet.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            bet.status === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' :
                            bet.status === 'LOSS' ? 'bg-rose-500/20 text-rose-400' :
                            bet.status === 'TIE' ? 'bg-slate-500/20 text-slate-300' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {bet.status}
                          </span>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
