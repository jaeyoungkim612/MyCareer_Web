// app/getting-started/layout.tsx

export const metadata = {
  title: "My Career+ 시작 가이드",
  description: "My Career+ 플랫폼 사용법 안내",
}

export default function GettingStartedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex">
      {/* 가이드 전용 사이드바 */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">시작 가이드</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">My Career+ 완전정복</p>
            </div>
          </div>
          <div className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-sm font-medium">
            🚀 단계별 안내서
          </div>
        </div>

        {/* 진행률 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">진행률</span>
              <span className="font-medium">1/4 단계</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>

        {/* 단계 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <a href="/getting-started/login-guide" className="block">
            <div className="cursor-pointer transition-all duration-200 hover:shadow-md bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-500 text-white">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    <h3 className="font-semibold text-sm text-blue-700">로그인하기</h3>
                    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                  <p className="text-xs text-blue-600">사번과 비밀번호로 첫 로그인</p>
                </div>
              </div>
            </div>
          </a>

          <a href="/getting-started/password-guide" className="block">
            <div className="cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-100 text-green-600">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">비밀번호 변경</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">보안을 위한 비밀번호 설정</p>
                </div>
              </div>
            </div>
          </a>

          <a href="/getting-started/areas-guide" className="block">
            <div className="cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-purple-100 text-purple-600">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                    </svg>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">5개 영역 소개</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">My Career+ 핵심 기능들</p>
                </div>
              </div>
            </div>
          </a>

          <a href="/getting-started/usage-guide" className="block">
            <div className="cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-amber-100 text-amber-600">
                  4
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">사용법 익히기</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Plan → Status → Results</p>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* 하단 액션 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <a href="/login" className="block">
            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium">
              <svg className="mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              로그인하러 가기
            </button>
          </a>
          <a href="/" className="block">
            <button className="w-full border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 py-2 px-4 rounded-lg font-medium">
              메인으로 이동
            </button>
          </a>
        </div>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
