import React from 'react';
import { XCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[40px] shadow-xl max-w-md w-full text-center space-y-6 border border-rose-100">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900">Đã có lỗi xảy ra</h1>
            <p className="text-stone-600">Ứng dụng gặp một sự cố nhỏ. Đừng lo lắng, hãy thử tải lại trang nhé!</p>
            <div className="p-4 bg-stone-50 rounded-2xl text-left overflow-auto max-h-40">
              <code className="text-xs text-rose-500">{this.state.errorInfo}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
