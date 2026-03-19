import React from 'react';
import { User, GraduationCap, Trophy, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  studentId: string;
  studentClass: string;
  level: number;
  xp: number;
  weeklyXp: number;
  handleClearHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  studentId, 
  studentClass, 
  level, 
  xp, 
  weeklyXp, 
  handleClearHistory 
}) => {
  return (
    <div className="flex flex-col w-full bg-white border border-stone-100 rounded-[40px] p-10 shadow-sm">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-52 h-52 rounded-full border-[10px] border-yellow-400 p-1 bg-white overflow-hidden flex items-center justify-center shadow-inner">
          <img 
            src="https://storage.googleapis.com/aistudio-build-assets/octopus-math-assistant.png" 
            alt="Bạch Tuộc AD" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-1">
          <h2 className="text-[26px] font-bold text-stone-900 tracking-tight">Bạch Tuộc Toán vui nhộn</h2>
          <p className="text-[#4CAF50] font-medium text-lg">đến từ đại dương xanh</p>
        </div>
      </div>

      <div className="mt-12 space-y-8">
        {studentId && (
          <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-wider">Mã học sinh</p>
                <p className="text-emerald-800 font-bold">{studentId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-wider">Lớp học</p>
                <p className="text-blue-800 font-bold">{studentClass}</p>
              </div>
            </div>
            
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Tích điểm</span>
                </div>
                <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Level {level}</span>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tiến trình</p>
                <p className="text-[11px] font-bold text-amber-700">{xp % 100}/100 XP</p>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden border border-amber-100">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xp % 100}%` }}
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
                />
              </div>

              <div className="mt-3 p-3 bg-white/40 rounded-2xl border border-amber-100/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-amber-800/60 uppercase tracking-wider">Điểm thưởng tuần</span>
                  <span className="text-sm font-black text-amber-600">{(weeklyXp * 0.01).toFixed(2)}</span>
                </div>
                <p className="text-[9px] text-amber-600/50 mt-1 italic text-right">* Tối đa 1.00 điểm/tuần</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-start gap-4">
          <span className="text-2xl mt-1">😆</span>
          <p className="text-[17px] leading-snug text-stone-800">
            <span className="font-bold">Vai trò:</span> Phù thủy toán học hài hước
          </p>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-2xl mt-1">🐙</span>
          <p className="text-[17px] leading-snug text-stone-800">
            <span className="font-bold">Phong cách:</span> Vui vẻ, sáng tạo, giải đố thông minh
          </p>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-2xl mt-1">♾️</span>
          <p className="text-[17px] leading-snug text-stone-800">
            <span className="font-bold">Hỗ trợ:</span> 24/7 tìm kiếm cách giải thú vị
          </p>
        </div>

        <button 
          onClick={handleClearHistory}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 bg-stone-50 hover:bg-emerald-50 text-stone-500 hover:text-emerald-600 rounded-2xl border border-stone-100 hover:border-emerald-100 text-sm font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Đoạn chat mới
        </button>
      </div>
    </div>
  );
};
