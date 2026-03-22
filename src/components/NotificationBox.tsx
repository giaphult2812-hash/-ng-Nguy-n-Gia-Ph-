import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';

interface Notification {
  id: string;
  type: string;
  from: string;
  to: string;
  amount: number;
  read: boolean;
  createdAt: string;
}

interface Props {
  userId?: string;
}

export const NotificationBox: React.FC<Props> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notifs);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    setIsOpen(!isOpen);
    
    // Mark all as read when opening
    if (!isOpen && unreadCount > 0) {
      const unreadNotifs = notifications.filter(n => !n.read);
      for (const notif of unreadNotifs) {
        try {
          await updateDoc(doc(db, 'notifications', notif.id), { read: true });
        } catch (error) {
          console.error("Error updating notification:", error);
        }
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={handleToggle}
        className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#1E2329] hover:bg-[#2A2F36] transition-colors rounded-lg border border-slate-700 text-slate-400 hover:text-white group shrink-0"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5 group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] transition-all" />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-[#1E2329]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#12161C] border border-purple-500/30 rounded-xl shadow-[0_10px_40px_rgba(139,92,246,0.15)] overflow-hidden z-50"
          >
            <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-[#1A1F26]">
              <h3 className="text-white font-semibold">Thông báo</h3>
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-md">Mới nhất</span>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Không có thông báo nào.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 border-b border-slate-800/30 hover:bg-[#1A1F26] transition-colors cursor-pointer group ${!notif.read ? 'bg-purple-500/5' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-slate-200 group-hover:text-purple-400 transition-colors">
                        {notif.type}
                      </span>
                      <span className={`text-sm font-bold ${notif.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {Math.abs(notif.amount)}$
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      Từ <span className="text-purple-300 font-semibold">{notif.from}</span> đến <span className="text-purple-300 font-semibold">{notif.to}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center">
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 text-center border-t border-slate-800/50 bg-[#1A1F26] hover:bg-[#2A2F36] transition-colors cursor-pointer">
              <span className="text-sm text-purple-400 font-medium">Xem tất cả</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
