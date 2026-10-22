import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Download, Share } from 'lucide-react';
import { AdminPwaHead, useAppInstall } from '../components/admin/AdminPwa';

/** 렌탈어때 관리자 앱 설치 안내(직원용). 이 페이지에서만 설치 정보가 켜진다. */
export function InstallPage() {
  const { installed, showIosGuide } = useAppInstall();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f4f8fe] to-white px-4 py-10">
      <AdminPwaHead />
      <Helmet>
        <title>렌탈어때 앱 설치</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="w-full max-w-[420px] rounded-[28px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,30,69,0.12)]">
        <img src="/app/icon-512.png" alt="렌탈어때 앱 아이콘" width={84} height={84} className="mx-auto h-[84px] w-[84px] rounded-[20px]" />
        <h1 className="mt-6 text-xl font-extrabold text-slate-900">렌탈어때 앱 설치</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          견적·문의를 휴대폰에서 바로 확인하는 관리자 앱이에요.<br />
          아래 순서대로 홈 화면에 설치해 주세요.
        </p>

        <ol className="mt-6 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-sm leading-6 text-slate-700">
          {showIosGuide ? (
            <>
              <li>1. 이 페이지를 <b>사파리</b>로 열기 (크롬·카카오톡에서는 안 돼요)</li>
              <li className="flex flex-wrap items-center gap-1">2. 하단 <Share size={15} aria-label="공유" className="inline" /> <b>공유</b> 버튼 누르기</li>
              <li>3. <b>홈 화면에 추가</b> → 이름 "렌탈어때" 확인 후 <b>추가</b></li>
              <li>4. 홈 화면의 아이콘으로 실행</li>
            </>
          ) : (
            <>
              <li>1. 아래 <b>"앱 다운로드"</b> 버튼 누르기</li>
              <li>2. 다운로드된 파일을 열고 <b>설치</b> 누르기 ("출처를 알 수 없는 앱" 허용이 필요할 수 있어요)</li>
              <li>3. 설치가 끝나면 "렌탈어때" 아이콘으로 실행</li>
              <li>4. 처음 열면 관리자 계정으로 로그인</li>
            </>
          )}
        </ol>

        {installed ? (
          <p className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3.5 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={18} aria-hidden="true" /> 이미 설치되어 앱으로 실행 중이에요
          </p>
        ) : showIosGuide ? (
          <p className="mt-6 rounded-xl bg-slate-100 py-3.5 text-sm font-semibold text-slate-500">아이폰은 위 방법으로 설치해 주세요</p>
        ) : (
          <>
            <a
              href="/app/rentalpartner.apk"
              download="렌탈어때.apk"
              className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#1d4ed8]"
            >
              <Download size={18} aria-hidden="true" /> 앱 다운로드 (안드로이드)
            </a>
            <p className="mt-2 text-xs leading-5 text-slate-500">안드로이드 폰에서 눌러 주세요. PC에서 열었다면 아래 QR로 폰에서 열어 주세요.</p>
          </>
        )}

        <div className="mx-auto mt-8 w-fit rounded-2xl border border-slate-200 p-3">
          <img src="/app/install-qr.png" alt="설치 페이지 QR 코드" width={160} height={160} className="h-40 w-40" />
        </div>
        <p className="mt-3 text-xs text-slate-400">다른 기기(폰)로 이 QR을 스캔해도 같은 페이지가 열려요</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          아이폰은 사파리에서 열어 "홈 화면에 추가"를 이용해 주세요.
        </p>
      </main>
    </div>
  );
}

export default InstallPage;
