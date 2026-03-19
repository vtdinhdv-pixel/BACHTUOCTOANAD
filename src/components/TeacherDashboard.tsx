import React from 'react';
import { Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User as FirebaseUser } from 'firebase/auth';

interface TeacherDashboardProps {
  isAdmin: boolean;
  user: FirebaseUser | null;
  totalStudents: number;
  handleLogin: () => Promise<void>;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ isAdmin, user, totalStudents, handleLogin }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!isAdmin ? (
        <div className="bg-rose-50 p-10 rounded-[40px] border border-rose-100 text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Settings className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-rose-800">Quyền truy cập bị từ chối</h2>
          <p className="text-rose-600 max-w-md mx-auto">Chỉ giáo viên mới có quyền truy cập vào bảng điều khiển này. Vui lòng đăng nhập bằng tài khoản giáo viên.</p>
          {!user && (
            <button 
              onClick={handleLogin}
              className="px-8 py-3 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
            >
              Đăng nhập ngay
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
              <div className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Tổng số học sinh thực tế</div>
              <div className="text-3xl font-bold text-emerald-600">{totalStudents}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
              <div className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Bài toán đã giải</div>
              <div className="text-3xl font-bold text-blue-600">1,240</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
              <div className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Tỉ lệ hoàn thành</div>
              <div className="text-3xl font-bold text-amber-600">82%</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
              <h2 className="font-bold text-stone-800">Lỗ hổng kiến thức phổ biến</h2>
              <span className="text-xs text-stone-500">Dựa trên 500+ câu hỏi gần đây</span>
            </div>
            <div className="p-6 space-y-4">
              {[
                { topic: 'Phép chia phân số', count: 45, color: 'bg-rose-500' },
                { topic: 'Thứ tự thực hiện phép tính', count: 32, color: 'bg-amber-500' },
                { topic: 'Ước chung lớn nhất', count: 28, color: 'bg-blue-500' },
                { topic: 'Số nguyên âm', count: 15, color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-stone-700">{item.topic}</span>
                    <span className="text-stone-500">{item.count}% học sinh gặp khó</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.count}%` }}
                      className={cn("h-full rounded-full", item.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
              <h2 className="font-bold text-stone-800">Hoạt động gần đây</h2>
            </div>
            <div className="divide-y divide-stone-50">
              {[
                { student: 'Nguyễn Văn A', action: 'vừa hoàn thành bài toán về Phân số', time: '2 phút trước' },
                { student: 'Trần Thị B', action: 'đang gặp khó khăn ở bước "Quy đồng mẫu số"', time: '5 phút trước' },
                { student: 'Lê Văn C', action: 'vừa thăng cấp lên Level 5', time: '12 phút trước' },
              ].map((log, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div>
                    <span className="font-bold text-stone-800">{log.student}</span>
                    <span className="text-stone-600 ml-2">{log.action}</span>
                  </div>
                  <span className="text-xs text-stone-400 font-medium">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
