// 관리자 앱(PWA) 설치용 서비스 워커.
// 견적/문의는 항상 최신이어야 하므로 아무것도 캐시하지 않고, 설치 조건만 충족시킨다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
