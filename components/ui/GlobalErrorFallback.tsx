import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const GlobalErrorFallback: React.FC<GlobalErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex max-w-md flex-col items-center rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
          <AlertTriangle size={32} />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-800">
          일시적인 오류가 발생했습니다
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          페이지를 불러오는 중 문제가 발생했습니다.<br />
          잠시 후 다시 시도해 주세요.
        </p>
        
        {/* 개발 환경에서만 에러 상세 내용 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 w-full rounded-lg bg-slate-100 p-4 text-left text-xs text-red-600 overflow-auto max-h-32">
            <code>{error.message}</code>
          </div>
        )}

        <button
          onClick={resetErrorBoundary}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#001e45] py-3.5 font-medium text-white transition-colors hover:bg-[#002b63]"
        >
          <RefreshCw size={18} />
          다시 시도하기
        </button>
      </div>
    </div>
  );
};
