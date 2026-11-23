import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || '화면을 표시하는 중 오류가 발생했습니다.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFF9EF] text-[#252525] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#EAE0CC] rounded-3xl p-6 shadow-sm space-y-4 text-center">
            <h1 className="text-lg font-extrabold text-[#252525]">
              화면을 불러오는 중 문제가 발생했습니다
            </h1>
            <p className="text-xs text-[#5C5549] leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
              }}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#319447] text-white text-sm font-bold cursor-pointer"
            >
              화면 다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
