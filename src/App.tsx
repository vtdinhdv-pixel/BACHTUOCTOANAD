import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, LogIn, LogOut } from "lucide-react";
import OctopusHeader from "./components/OctopusHeader";
import ChatInterface from "./components/ChatInterface";
import TeacherDashboard from "./components/TeacherDashboard";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  onSnapshot, 
  query, 
  where,
  updateDoc,
  orderBy, 
  limit,
  User,
  handleFirestoreError,
  OperationType
} from "./firebase";

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, errorInfo: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: "" };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message || String(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Đã có lỗi xảy ra. Vui lòng tải lại trang.";
      try {
        const parsed = JSON.parse(this.state.errorInfo);
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          displayMessage = "Bạn không có quyền thực hiện thao tác này.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Plus className="rotate-45" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Rất tiếc!</h2>
          <p className="text-gray-600 mb-6">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-lg"
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [isTeacherDashboardOpen, setIsTeacherDashboardOpen] = useState(false);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [isTeacherLoginOpen, setIsTeacherLoginOpen] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [isConfirmNewChatOpen, setIsConfirmNewChatOpen] = useState(false);
  const [lastTeacherResponse, setLastTeacherResponse] = useState<{content: string, timestamp: number} | null>(null);
  const [chatSessionId, setChatSessionId] = useState(Date.now().toString());

  const [teacherStats, setTeacherStats] = useState({
    studentCount: 0,
    questions: [] as string[],
    topicData: [] as { topic: string; count: number }[],
    teacherRequests: [] as { id: string; content: string; timestamp: any; studentName?: string; status?: string }[],
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          // Check/Create user profile
          const userDocRef = doc(db, "users", currentUser.uid);
          try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserRole(userDoc.data().role);
            } else {
              // Default to student
              const newProfile = {
                uid: currentUser.uid,
                displayName: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL,
                role: "student",
                createdAt: serverTimestamp()
              };
              await setDoc(userDocRef, newProfile);
              setUserRole("student");
            }
          } catch (error) {
            console.error("Error checking user profile:", error);
          }
        } else {
          setUserRole(null);
          setIsTeacherAuthenticated(false);
        }
      } finally {
        setIsAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  // Teacher Data Listener
  useEffect(() => {
    if (!isAuthReady || !user || (userRole !== "teacher" && userRole !== "admin" && !isTeacherAuthenticated)) return;

    let unsubscribeRequests: (() => void) | undefined;
    let unsubscribeStudents: (() => void) | undefined;

    try {
      // Listen to teacher requests
      const requestsQuery = query(collection(db, "teacherRequests"), orderBy("timestamp", "desc"), limit(50));
      unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        
        setTeacherStats(prev => ({
          ...prev,
          teacherRequests: requests
        }));
      }, (error) => {
        console.error("Teacher requests error:", error);
      });

      // Listen to student count
      const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
      unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
        setTeacherStats(prev => ({
          ...prev,
          studentCount: snapshot.size
        }));
      }, (error) => {
        console.error("Student count error:", error);
      });
    } catch (error) {
      console.error("Teacher data listener error:", error);
    }

    return () => {
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeStudents) unsubscribeStudents();
    };
  }, [isAuthReady, user, userRole, isTeacherAuthenticated]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleTeacherClick = () => {
    if (userRole === "teacher" || userRole === "admin" || isTeacherAuthenticated) {
      setIsTeacherDashboardOpen(true);
    } else {
      setIsTeacherLoginOpen(true);
    }
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPassword === "giaovien123") {
      setIsTeacherAuthenticated(true);
      setIsTeacherLoginOpen(false);
      setIsTeacherDashboardOpen(true);
      setLoginError(false);
      setTeacherPassword("");
    } else {
      setLoginError(true);
    }
  };

  // Helper to categorize questions into topics
  const getTopicData = (questions: string[]) => {
    const topics = [
      { name: "Phân số", keywords: ["phân số", "tử số", "mẫu số", "rút gọn"] },
      { name: "Số nguyên", keywords: ["số nguyên", "âm", "dương", "tập hợp Z"] },
      { name: "Hình học", keywords: ["hình", "tam giác", "góc", "đường thẳng", "điểm"] },
      { name: "Số thập phân", keywords: ["thập phân", "phẩy"] },
      { name: "Đại số", keywords: ["x", "y", "biểu thức", "tính giá trị"] },
    ];

    const counts: { [key: string]: number } = {
      "Phân số": 0,
      "Số nguyên": 0,
      "Hình học": 0,
      "Số thập phân": 0,
      "Đại số": 0,
      "Khác": 0,
    };

    questions.forEach((q) => {
      let found = false;
      const lowerQ = q.toLowerCase();
      for (const topic of topics) {
        if (topic.keywords.some((k) => lowerQ.includes(k))) {
          counts[topic.name]++;
          found = true;
          break;
        }
      }
      if (!found) counts["Khác"]++;
    });

    return Object.keys(counts).map((topic) => ({
      topic,
      count: counts[topic],
    }));
  };

  const handleNewQuestion = (question: string) => {
    setTeacherStats((prev) => {
      const newQuestions = [question, ...prev.questions].slice(0, 20);
      return {
        ...prev,
        questions: newQuestions,
        topicData: getTopicData(newQuestions),
      };
    });
  };

  const handleTeacherRequest = async (content: string) => {
    if (!user) return;
    try {
      await setDoc(doc(collection(db, "teacherRequests")), {
        studentUid: user.uid,
        studentName: user.displayName || "Học sinh",
        content,
        status: "pending",
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Teacher request error:", error);
    }
  };

  const handleTeacherRespond = async (requestId: string, response: string) => {
    setLastTeacherResponse({ content: response, timestamp: Date.now() });
    try {
      await updateDoc(doc(db, "teacherRequests", requestId), {
        status: "responded",
        response: response
      });
    } catch (error) {
      console.error("Teacher respond error:", error);
    }
  };

  const handleNewChat = () => {
    setIsConfirmNewChatOpen(true);
  };

  const confirmNewChat = () => {
    setChatSessionId(Date.now().toString());
    setIsConfirmNewChatOpen(false);
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-400 to-indigo-600 p-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-8 rounded-[40px] shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg viewBox="0 0 200 200" className="w-16 h-16">
              <circle cx="100" cy="100" r="80" fill="#74b9ff" />
              <circle cx="75" cy="85" r="10" fill="white" />
              <circle cx="125" cy="85" r="10" fill="white" />
              <path d="M80 130 Q100 150 120 130" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2 uppercase">BẠCH TUỘC TOÁN VUI</h2>
          <p className="text-gray-500 mb-8">Chào mừng em đến với thế giới Toán học! Hãy đăng nhập để bắt đầu học nhé.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white border-2 border-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-lg active:scale-95"
          >
            <LogIn size={20} className="text-blue-500" />
            Đăng nhập với Google
          </button>
          
          <p className="mt-8 text-xs text-gray-400 italic">
            Học toán lớp 6 thật vui cùng Bạch Tuộc Trạng Nguyên!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        <OctopusHeader 
          onTeacherClick={handleTeacherClick} 
          onNewChat={handleNewChat}
          requestCount={teacherStats.teacherRequests.filter(r => r.status === "pending").length}
        />
        
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-xs font-bold text-gray-700">{user.displayName}</span>
            <span className="text-[10px] text-gray-400 capitalize">{userRole}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-white/80 backdrop-blur-sm text-gray-500 rounded-full hover:text-red-500 transition-colors shadow-sm"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>

        <main className="flex-1 overflow-hidden">
          <ChatInterface 
            key={chatSessionId}
            sessionId={chatSessionId}
            onNewChat={handleNewChat}
            onMessageSent={handleNewQuestion} 
            onTeacherRequest={handleTeacherRequest}
            teacherResponse={lastTeacherResponse}
            onTeacherResponseHandled={() => setLastTeacherResponse(null)}
          />
        </main>
        
        <TeacherDashboard 
          isOpen={isTeacherDashboardOpen} 
          onClose={() => setIsTeacherDashboardOpen(false)} 
          onRespond={handleTeacherRespond}
          stats={teacherStats}
        />

        {/* Teacher Login Modal */}
        <AnimatePresence>
          {isTeacherLoginOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Xác thực Giáo viên</h3>
                <form onSubmit={handleTeacherLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                    <input 
                      type="password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className={`w-full p-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 ${loginError ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Nhập mật khẩu giáo viên..."
                      autoFocus
                    />
                    {loginError && <p className="text-red-500 text-xs mt-1">Mật khẩu không đúng!</p>}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsTeacherLoginOpen(false);
                        setLoginError(false);
                        setTeacherPassword("");
                      }}
                      className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                      Đăng nhập
                    </button>
                  </div>
                </form>
                <p className="mt-4 text-[10px] text-gray-400 text-center italic">
                  (Mật khẩu mặc định: giaovien123)
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {isConfirmNewChatOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center"
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Bắt đầu Chat mới?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Đoạn hội thoại hiện tại sẽ được kết thúc và làm mới hoàn toàn.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConfirmNewChatOpen(false)}
                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={confirmNewChat}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                  >
                    Đồng ý
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
);
}
