import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Camera, Sparkles, Trophy, BookOpen, MessageCircle, 
  RefreshCw, ChevronRight, FileText, Share2, Settings, 
  Moon, Smile, Zap, Infinity, Gamepad2, BarChart3, PenLine, 
  LayoutGrid, GraduationCap, Plus, Image as ImageIcon, FileUp,
  Lightbulb, Search, HelpCircle, CheckCircle2, XCircle, Info, User, Star
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { getMathGuidance, AIResponse, MathStep } from './services/aiService';
import { exportToDocx } from './services/exportService';
import { cn } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Sidebar } from './components/Sidebar';
import { 
  db, auth, handleFirestoreError, OperationType 
} from './firebase';
import avatar from './assets/octopus.png';
import { 
  collection, doc, setDoc, getDocs, onSnapshot, 
  serverTimestamp, query, where, getDoc,
  getCountFromServer
} from 'firebase/firestore';
import { 
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User as FirebaseUser 
} from 'firebase/auth';



interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  step?: MathStep;
  isComplete?: boolean;
  finalFeedback?: { isCorrect: boolean; message: string; selectedOption: number };
  imageUrl?: string;
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [view, setView] = useState<'student' | 'teacher'>('student');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [studentId, setStudentId] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('');
  const [tempId, setTempId] = useState('');
  const [tempClass, setTempClass] = useState('');
  const [lastXpGain, setLastXpGain] = useState<number | null>(null);
  const [weeklyXp, setWeeklyXp] = useState(0);
  const [lastResetDate, setLastResetDate] = useState<string>('');
  
  // Firebase State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedXp = localStorage.getItem('math_xp');
    if (savedXp) {
      const xpVal = parseInt(savedXp);
      setXp(xpVal);
      setLevel(Math.floor(xpVal / 100) + 1);
    }

    const savedId = localStorage.getItem('student_id');
    const savedClass = localStorage.getItem('student_class');
    if (savedId) {
      setStudentId(savedId);
      setTempId(savedId);
    }
    if (savedClass) {
      setStudentClass(savedClass);
      setTempClass(savedClass);
    }

    // Weekly XP reset logic
    const savedWeeklyXp = localStorage.getItem('math_weekly_xp');
    const savedResetDate = localStorage.getItem('math_last_reset');
    const now = new Date();
    const currentWeekStart = new Date(now.setDate(now.getDate() - now.getDay())).toDateString();

    if (savedResetDate !== currentWeekStart) {
      setWeeklyXp(0);
      setLastResetDate(currentWeekStart);
      localStorage.setItem('math_weekly_xp', '0');
      localStorage.setItem('math_last_reset', currentWeekStart);
    } else {
      if (savedWeeklyXp) setWeeklyXp(parseInt(savedWeeklyXp));
      setLastResetDate(savedResetDate);
    }
    
    // Initial greeting or load from localStorage
    const savedMessages = localStorage.getItem('math_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse saved messages', e);
        const initialGreeting: Message[] = [{
          id: '1',
          role: 'model',
          content: 'Chào bạn! Mình là Bạch Tuộc AD vừa trồi lên từ đại dương tri thức đây! 🐙🌊 Bạn đang gặp "sóng gió" với bài tập Toán hay có tâm sự gì muốn trút bỏ không? Đừng để kiến thức trôi dạt nhé, hãy gửi ngay vào đây, mình sẽ dùng 8 vòi giải quyết giúp bạn trong một nốt nhạc! 🌊✨'
        }];
        setMessages(initialGreeting);
      }
    } else {
      const initialGreeting: Message[] = [{
        id: '1',
        role: 'model',
        content: 'Chào bạn! Mình là Bạch Tuộc AD vừa trồi lên từ đại dương tri thức đây! 🐙🌊 Bạn đang gặp "sóng gió" với bài tập Toán hay có tâm sự gì muốn trút bỏ không? Đừng để kiến thức trôi dạt nhé, hãy gửi ngay vào đây, mình sẽ dùng 8 vòi giải quyết giúp bạn trong một nốt nhạc! 🌊✨'
      }];
      setMessages(initialGreeting);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('math_messages', JSON.stringify(messages));
      if (studentId && auth.currentUser) {
        setDoc(doc(db, 'students', studentId, 'progress', 'data'), {
          messages: messages,
          lastUpdated: serverTimestamp()
        }, { merge: true }).catch(console.error);
      }
    }
  }, [messages, studentId]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Check if admin
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const isAdminRole = userDoc.exists() && userDoc.data()?.role === 'admin';
          const isvtdinh = currentUser.email === "vtdinhdv@gmail.com" && currentUser.emailVerified;
          const isphong = currentUser.email === "vubaphong@gmail.com" && currentUser.emailVerified;
          
          setIsAdmin(isAdminRole || isvtdinh || isphong);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(currentUser.email === "vtdinhdv@gmail.com" || currentUser.email === "vubaphong@gmail.com");
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Progress Listener
  useEffect(() => {
    if (user && studentId) {
      const fetchProgress = async () => {
        try {
          const progressDoc = await getDoc(doc(db, 'students', studentId, 'progress', 'data'));
          if (progressDoc.exists()) {
            const data = progressDoc.data();
            if (data.xp !== undefined) {
              setXp(data.xp);
              setLevel(data.level || Math.floor(data.xp / 100) + 1);
            }
            if (data.weeklyXp !== undefined) setWeeklyXp(data.weeklyXp);
            if (data.messages && data.messages.length > 0) {
              setMessages(data.messages);
            }
          }
        } catch(e) { console.error(e); }
      };
      fetchProgress();
    }
  }, [user, studentId]);

  // Fetch Total Students for Teacher view
  useEffect(() => {
    if (view === 'teacher' && isAdmin) {
      const fetchCount = async () => {
        try {
          const coll = collection(db, 'students');
          const snapshot = await getCountFromServer(coll);
          setTotalStudents(snapshot.data().count);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'students');
        }
      };
      fetchCount();
      
      // Real-time listener for students
      const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
        setTotalStudents(snapshot.size);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'students');
      });
      
      return () => unsubscribe();
    }
  }, [view, isAdmin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, feedback, view]);

  const addXp = (amount: number) => {
    const newXp = Math.max(0, xp + amount);
    setXp(newXp);
    setLevel(Math.floor(newXp / 100) + 1);
    localStorage.setItem('math_xp', newXp.toString());
    
    // Update weekly XP (capped at 100 for reward calculation)
    const newWeeklyXp = Math.max(0, Math.min(100, weeklyXp + amount));
    setWeeklyXp(newWeeklyXp);
    localStorage.setItem('math_weekly_xp', newWeeklyXp.toString());

    setLastXpGain(amount);
    setTimeout(() => setLastXpGain(null), 2000);

    // Sync to Firebase
    if (studentId && auth.currentUser) {
      setDoc(doc(db, 'students', studentId, 'progress', 'data'), {
        xp: newXp,
        level: Math.floor(newXp / 100) + 1,
        weeklyXp: newWeeklyXp,
        lastUpdated: serverTimestamp()
      }, { merge: true }).catch(console.error);
    }
  };

  const handleSend = async (text: string = input, file?: File) => {
    if (!text.trim() && !file && isLoading) return;
    setIsLoading(true);

    let imageBase64: string | undefined;
    let fullBase64: string | undefined;
    if (file) {
      fullBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
      imageBase64 = fullBase64.split(',')[1];
    }

    const isImage = file?.type.startsWith('image/');
    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text + (file && !isImage ? `\n\n[Đã đính kèm: ${file.name}]` : ''),
      ...(isImage && fullBase64 ? { imageUrl: fullBase64 } : {})
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setFeedback(null);
    setSelectedFile(null);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      // Pass level to AI for intelligent response
      const response = await getMathGuidance(text || "Giải bài tập trong file đính kèm", history, level, imageBase64);
      
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.step?.content || 'Hãy cùng xem bài này nhé.',
        step: response.step,
        isComplete: response.isComplete
      };
      
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: 'Hệ thống đang bận một chút, em thử lại sau nhé!'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadMenu(false);
      // Automatically send or wait for user to type? 
      // Let's just set it and let them send with text if they want.
    }
  };

  const handleOptionSelect = (step: MathStep, optionIndex: number) => {
    if (selectedOption !== null) return;
    
    setSelectedOption(optionIndex);
    const correctIndex = Number(step.correctOptionIndex);
    const isCorrect = optionIndex === correctIndex;
    
    if (isCorrect) {
      const fb = { 
        isCorrect: true, 
        message: `Chúc mừng em! 🌟 Bạch Tuộc AD rất tự hào về em.\n\n**Giải thích chi tiết:** ${step.explanation || 'Đáp án hoàn toàn chính xác.'}` 
      };
      setFeedback(fb);
      addXp(5);
      
      // Save final feedback to message to persist it
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.role === 'model') {
          lastMsg.finalFeedback = { ...fb, selectedOption: optionIndex };
        }
        return newMessages;
      });

      const currentMsg = messages[messages.length - 1];
      if (currentMsg.isComplete) {
        addXp(50); // Bonus for completion
      }
    } else {
      setFeedback({ 
        isCorrect: false, 
        message: 'Chưa chính xác rồi! Đừng nản lòng nhé, em thử suy nghĩ lại một chút nào. Bạch Tuộc AD đang chuẩn bị gợi ý cho em đây! 💪🐙' 
      });
      addXp(-3);
      setTimeout(() => {
        setSelectedOption(null);
        setFeedback(null);
        // Automatically ask for a hint if wrong
        handleSend(`Bạch Tuộc AD ơi, em đã chọn đáp án "${step.options?.[optionIndex]}" nhưng chưa đúng. Anh cho em một gợi ý khéo léo và yêu cầu em trả lời lại nhé!`);
      }, 3000);
    }
  };

  const handleContinue = () => {
    const currentMsg = messages[messages.length - 1];
    if (currentMsg.isComplete || currentMsg.step?.isTheory) {
      handleSend("Bạch Tuộc AD ơi, em đã hoàn thành phần lí thuyết này rồi. Anh hãy ra Bài tập 1 để em luyện tập thêm nhé. Em sẽ tự giải và gửi lời giải (bằng chữ hoặc hình ảnh) để anh kiểm tra và chỉ ra kiến thức em đã dùng nhé!");
    } else {
      handleSend("Tuyệt vời! Bạch Tuộc AD ơi, hãy dẫn dắt em sang bước tiếp theo nhé.");
    }
    setSelectedOption(null);
    setFeedback(null);
  };

  const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn bắt đầu đoạn chat mới không? Lịch sử hiện tại sẽ bị xóa.')) {
      const initialGreeting: Message[] = [{
        id: '1',
        role: 'model',
        content: 'Chào bạn! Mình là Bạch Tuộc AD vừa trồi lên từ đại dương tri thức đây! 🐙🌊 Bạn đang gặp "sóng gió" với bài tập Toán hay có tâm sự gì muốn trút bỏ không? Đừng để kiến thức trôi dạt nhé, hãy gửi ngay vào đây, mình sẽ dùng 8 vòi giải quyết giúp bạn trong một nốt nhạc! 🌊✨'
      }];
      setMessages(initialGreeting);
      localStorage.setItem('math_messages', JSON.stringify(initialGreeting));
      setSelectedOption(null);
      setFeedback(null);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to avoid auto-login with wrong account
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      return !!result.user;
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        alert("Đăng nhập thất bại: " + (error.message || "Vui lòng thử lại"));
      }
      return false;
    }
  };

  const handleRegisterStudent = async (id: string, className: string) => {
    if (!user) {
      await handleLogin();
    }
    
    if (auth.currentUser) {
      try {
        const studentDoc = doc(db, 'students', id);
        await setDoc(studentDoc, {
          id: id,
          class: className,
          lastLogin: serverTimestamp(),
          uid: auth.currentUser.uid
        }, { merge: true });
        
        setStudentId(id);
        setStudentClass(className);
        localStorage.setItem('student_id', id);
        localStorage.setItem('student_class', className);
        setShowInfoModal(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `students/${id}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setStudentId('');
      setStudentClass('');
      localStorage.removeItem('student_id');
      localStorage.removeItem('student_class');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleCameraClick = () => {
    alert("Tính năng chụp ảnh đang được phát triển. Em hãy gõ đề bài vào ô chat nhé! 😊");
  };





  return (
    <div className="flex min-h-screen bg-[#E6F4F1] text-[#2D2D2D] font-sans selection:bg-emerald-100 overflow-hidden">
      {/* Left Frame: Sidebar */}
      {view === 'student' && (
        <aside className="flex flex-col w-[350px] p-6 overflow-y-auto shrink-0 border-r border-stone-100/50">
          <Sidebar studentId={studentId} studentClass={studentClass} level={level} xp={xp} weeklyXp={weeklyXp} handleClearHistory={handleClearHistory} />
        </aside>
      )}

      {/* Right Frame: Main Content */}
      <div className={cn(
        "flex-1 flex flex-col bg-white shadow-2xl transition-all duration-500",
        view === 'student' ? "lg:rounded-l-[48px]" : ""
      )}>
        {/* Header (Inside Right Frame) */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100 px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-stone-100 p-0 overflow-hidden border border-stone-100 shadow-sm">
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <h1 className="font-bold text-stone-900 text-base leading-tight">Bạch Tuộc AD</h1>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Đang hoạt động</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Role pill switcher */}
              <div className="bg-stone-50 p-1.5 rounded-full flex gap-1 border border-stone-100">
                <button
                  onClick={() => setView('student')}
                  className={cn(
                    "px-6 py-2 rounded-full text-xs font-bold transition-all",
                    view === 'student' ? "bg-white text-emerald-600 shadow-sm ring-1 ring-stone-100" : "text-stone-400 hover:text-stone-600"
                  )}
                >
                  Học sinh
                </button>
                <button
                  onClick={() => setView('teacher')}
                  className={cn(
                    "px-6 py-2 rounded-full text-xs font-bold transition-all",
                    view === 'teacher' ? "bg-white text-blue-600 shadow-sm ring-1 ring-stone-100" : "text-stone-400 hover:text-stone-600"
                  )}
                >
                  Giáo viên
                </button>
              </div>

              <button 
                onClick={async () => {
                  if (!user) {
                    await handleLogin();
                    // After login, show modal if studentId is missing
                    if (!studentId) setShowInfoModal(true);
                  } else {
                    setTempId(studentId);
                    setTempClass(studentClass);
                    setShowInfoModal(true);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-100 rounded-full font-bold transition-all text-xs"
              >
                <User className="w-4 h-4" />
                {studentId ? `ID: ${studentId}` : (user ? 'Thông tin' : 'Đăng nhập')}
              </button>

              <div className="flex items-center gap-2 text-stone-400">
                <button 
                  onClick={() => exportToDocx(messages)}
                  className="p-2 hover:bg-stone-50 rounded-full transition-colors group" 
                  title="Tải Word"
                >
                  <FileText className="w-4.5 h-4.5 text-blue-400 group-hover:text-blue-500" />
                </button>
                <button className="p-2 hover:bg-stone-50 rounded-full transition-colors"><Share2 className="w-4.5 h-4.5" /></button>
                <button className="p-2 hover:bg-stone-50 rounded-full transition-colors"><Settings className="w-4.5 h-4.5" /></button>
                <button className="p-2 hover:bg-stone-50 rounded-full transition-colors"><Moon className="w-4.5 h-4.5" /></button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-smooth relative" ref={scrollRef}>
          <div className="max-w-5xl mx-auto px-8 py-10">
            {view === 'student' ? (
              <div className="space-y-8">
                <div className="space-y-8 pb-32">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex gap-4",
                          msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-stone-100 shadow-sm",
                          msg.role === 'user' ? "bg-stone-50" : "bg-white"
                        )}>
                          {msg.role === 'user' 
                            ? <User className="w-5 h-5 text-stone-400" /> 
                            : <img src={avatar} alt="Bot" className="w-full h-full object-cover scale-110" />
                          }
                        </div>
                        
                        <div className={cn(
                          "flex flex-col gap-2",
                          msg.role === 'user' ? "items-end" : "items-start"
                        )}>
                          <div className={cn(
                            "rounded-[32px] px-8 py-5 shadow-sm max-w-[90%]",
                            msg.role === 'user' 
                              ? "bg-white text-stone-800 rounded-tr-none border border-stone-100" 
                              : "bg-white border border-stone-100 rounded-tl-none"
                          )}>
                            <div className="prose prose-sm prose-stone max-w-none text-[16px] leading-relaxed">
                              {msg.imageUrl && (
                                <div className="mb-4 rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                                  <img src={msg.imageUrl} alt="Đính kèm" className="max-w-[200px] h-auto rounded-lg" />
                                </div>
                              )}
                              <Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</Markdown>
                            </div>

                            {/* Interactive Step Options */}
                            {msg.role === 'model' && idx === messages.length - 1 && msg.step && msg.step.options && msg.step.options.length > 0 && (
                              <div className="mt-6 space-y-4 border-t border-stone-50 pt-6">
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="grid grid-cols-1 gap-3"
                                >
                                  {msg.step.options.map((opt, oIdx) => {
                                    const isSelected = selectedOption === oIdx || msg.finalFeedback?.selectedOption === oIdx;
                                    const isCorrect = oIdx === Number(msg.step!.correctOptionIndex);
                                    const anySelected = selectedOption !== null || !!msg.finalFeedback;
                                    
                                    return (
                                      <button
                                        key={oIdx}
                                        onClick={() => handleOptionSelect(msg.step!, oIdx)}
                                        disabled={anySelected || msg.id !== messages[messages.length - 1].id}
                                        className={cn(
                                          "text-left px-6 py-4 rounded-2xl border transition-all duration-300 text-[15px] group flex items-center",
                                          isSelected
                                            ? (isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700")
                                            : (anySelected && isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-stone-100 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5")
                                        )}
                                      >
                                        <span className={cn(
                                          "inline-block w-8 h-8 rounded-full border text-center text-xs font-bold leading-8 mr-4 transition-colors shrink-0",
                                          isSelected
                                            ? "bg-white border-transparent" 
                                            : "bg-stone-50 border-stone-200 group-hover:bg-emerald-100 group-hover:border-emerald-200"
                                        )}>
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span className="flex-1">
                                          <Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{opt}</Markdown>
                                        </span>
                                        {anySelected && (
                                          isCorrect ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-2 shrink-0" />
                                          ) : (
                                            isSelected && <XCircle className="w-5 h-5 text-rose-500 ml-2 shrink-0" />
                                          )
                                        )}
                                      </button>
                                    );
                                  })}
                                </motion.div>

                                {/* Feedback Display */}
                                {(feedback || msg.finalFeedback) && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                      "p-5 rounded-2xl text-sm border",
                                      (feedback?.isCorrect || msg.finalFeedback?.isCorrect) ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 mb-2 font-bold">
                                      {(feedback?.isCorrect || msg.finalFeedback?.isCorrect) ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                                      <span>{(feedback?.isCorrect || msg.finalFeedback?.isCorrect) ? "Tuyệt vời! Đáp án chính xác:" : "Cố gắng lên! Đáp án chưa đúng:"}</span>
                                    </div>
                                    <div className="prose prose-sm max-w-none">
                                      <Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                                        {(feedback?.isCorrect || msg.finalFeedback?.isCorrect) 
                                          ? `**${String.fromCharCode(65 + Number(msg.step.correctOptionIndex))}: ${msg.step.options[Number(msg.step.correctOptionIndex)]}**\n\n${feedback?.message || msg.finalFeedback?.message}`
                                          : feedback?.message
                                        }
                                      </Markdown>
                                    </div>

                                    {(feedback?.isCorrect || msg.finalFeedback?.isCorrect) && msg.id === messages[messages.length - 1].id && (
                                      <div className="mt-4 flex justify-end">
                                        <button
                                          onClick={handleContinue}
                                          className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                                        >
                                          {(msg.isComplete || msg.step?.isTheory) ? "Luyện tập thêm" : "Tiếp tục"}
                                          <ChevronRight className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            )}
                          </div>

                          <span className="text-[11px] text-stone-400 font-medium px-4">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-stone-100 shadow-sm">
                        <img src={avatar} alt="Bot" className="w-full h-full object-cover scale-110" />
                      </div>
                      <div className="bg-white border border-stone-100 rounded-[32px] rounded-tl-none px-8 py-5 shadow-sm flex items-center gap-4">
                        <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                        <span className="text-[15px] text-stone-400 font-medium">Bạch Tuộc AD đang suy nghĩ...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <TeacherDashboard 
                isAdmin={isAdmin} 
                user={user} 
                totalStudents={totalStudents} 
                handleLogin={handleLogin} 
                handleLogout={handleLogout}
              />
            )}
          </div>
        </main>

        {/* Input Area (Only for Student) */}
        {view === 'student' && (
          <div className="bg-white border-t border-stone-100 p-8">
            <div className="max-w-4xl mx-auto">
              {selectedFile && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-emerald-600" /> : <FileUp className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <span className="text-sm font-medium text-emerald-700 truncate max-w-[200px]">{selectedFile.name}</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-emerald-400 hover:text-emerald-600 p-1">
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              )}
              <div className="flex gap-4">
                <div className="relative">
                  <button 
                    onClick={() => setShowUploadMenu(!showUploadMenu)}
                    className={cn(
                      "p-5 rounded-2xl transition-all border shadow-sm",
                      showUploadMenu ? "bg-emerald-600 text-white border-emerald-600" : "bg-stone-50 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 border-stone-100"
                    )}
                    title="Thêm tệp"
                  >
                    <Plus className={cn("w-7 h-7 transition-transform", showUploadMenu && "rotate-45")} />
                  </button>

                  <AnimatePresence>
                    {showUploadMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full left-0 mb-4 bg-white rounded-3xl border border-stone-100 shadow-xl p-2 w-48 z-50 overflow-hidden"
                      >
                        <button 
                          onClick={() => imageInputRef.current?.click()}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 rounded-2xl transition-colors text-stone-700 font-medium text-sm"
                        >
                          <ImageIcon className="w-5 h-5 text-rose-500" />
                          Tải ảnh lên
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 rounded-2xl transition-colors text-stone-700 font-medium text-sm"
                        >
                          <FileUp className="w-5 h-5 text-blue-500" />
                          Tải tệp lên
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={(e) => handleFileUpload(e, 'image')} />
                  <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'file')} />
                </div>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend(input, selectedFile || undefined)}
                    placeholder="Nhập đề bài toán hoặc tải tệp lên..."
                    className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-8 py-5 pr-16 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all text-[16px] shadow-sm"
                  />
                  <button
                    onClick={() => handleSend(input, selectedFile || undefined)}
                    disabled={(!input.trim() && !selectedFile) || isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-emerald-600 disabled:text-stone-300 transition-all hover:scale-110"
                  >
                    <Send className="w-7 h-7" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* XP Gain Animation */}
      <AnimatePresence>
        {lastXpGain !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: -100, scale: 1.5 }}
            exit={{ opacity: 0 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 z-[200] pointer-events-none"
          >
            <div className={cn(
              "text-white px-6 py-3 rounded-full font-black text-2xl shadow-xl flex items-center gap-2 border-4 border-white",
              lastXpGain > 0 ? "bg-amber-400" : "bg-red-500"
            )}>
              {lastXpGain > 0 ? <Trophy className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
              {lastXpGain > 0 ? `+${lastXpGain}` : lastXpGain} XP
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login/Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-[#2D2D2D]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-stone-900">
                    {studentId ? 'Thông tin học sinh' : 'Đăng nhập học sinh'}
                  </h3>
                  <button 
                    onClick={() => setShowInfoModal(false)}
                    className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-stone-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Mã học sinh (Dãy số)</label>
                    <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white transition-all">
                      <User className="w-5 h-5 text-stone-400" />
                      <input 
                        type="text" 
                        placeholder="Nhập mã số học sinh..."
                        value={tempId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d+$/.test(val)) {
                            setTempId(val);
                          }
                        }}
                        className="bg-transparent border-none focus:outline-none w-full font-bold text-stone-800 placeholder:text-stone-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Lớp học</label>
                    <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all">
                      <GraduationCap className="w-5 h-5 text-stone-400" />
                      <input 
                        type="text" 
                        placeholder="Ví dụ: 6A1, 6A2..."
                        value={tempClass}
                        onChange={(e) => setTempClass(e.target.value)}
                        className="bg-transparent border-none focus:outline-none w-full font-bold text-stone-800 placeholder:text-stone-300"
                      />
                    </div>
                  </div>

                  {studentId && (
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Trophy className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-wider mb-0.5">Thành tích học tập</p>
                          <p className="text-emerald-700 font-bold">Level {level} — {xp} XP</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          <span>Tiến trình Level {level}</span>
                          <span>{xp % 100}%</span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden border border-emerald-100">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${xp % 100}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-emerald-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Star className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Điểm thưởng tuần</span>
                            <span className="text-[9px] text-emerald-400 font-medium">Giới hạn 1.00/tuần</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-emerald-600">{(weeklyXp * 0.01).toFixed(2)}</span>
                          <p className="text-[9px] text-emerald-400 font-medium">100 XP = 1.00</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-8">
                  {studentId && (
                    <button 
                      onClick={() => {
                        setStudentId('');
                        setStudentClass('');
                        setTempId('');
                        setTempClass('');
                        localStorage.removeItem('student_id');
                        localStorage.removeItem('student_class');
                        setShowInfoModal(false);
                      }}
                      className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl font-bold transition-all"
                    >
                      Đăng xuất
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (tempId && tempClass) {
                        handleRegisterStudent(tempId, tempClass);
                      }
                    }}
                    disabled={!tempId || !tempClass}
                    className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 disabled:shadow-none"
                  >
                    {studentId ? 'Cập nhật' : 'Đăng nhập'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
