import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCheck } from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  return (
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

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="absolute top-0 right-0 h-full w-[85%] sm:w-[350px] bg-[#0F0518] border-l border-[#2A2E39] z-[70] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="h-[60px] flex items-center justify-between px-4 border-b border-[#2A2E39] shrink-0 bg-[#1E2329]">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white">Thông báo</span>
                <button 
                  className="w-8 h-6 flex items-center justify-center rounded bg-slate-500/30 hover:bg-slate-500/50 text-slate-300 transition-colors"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2A2E39] text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4">
              <p className="text-slate-300 text-sm">Không có thông báo nào</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
