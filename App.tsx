import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { GlobalErrorFallback } from './components/ui/GlobalErrorFallback';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { FloatingQuoteButton } from './components/FloatingQuoteButton';
import { AuthProvider } from './src/context/AuthContext';
import { PriceDisplayProvider } from './src/context/PriceDisplayContext';
import { AdminRoute } from './src/components/AdminRoute';
import { trackException, trackPageView } from './src/utils/analytics';

const lazyPage = <T extends Record<string, unknown>>(
  factory: () => Promise<T>,
  exportName: keyof T,
) =>
  lazy(async () => ({
    default: (await factory())[exportName] as ComponentType<any>,
  }));

const MainPage = lazyPage(() => import('./pages/MainPage'), 'MainPage');
const ProductListPage = lazyPage(() => import('./pages/ProductListPage'), 'ProductListPage');
const ProductRouteResolver = lazyPage(() => import('./pages/ProductRouteResolver'), 'ProductRouteResolver');
const MyPage = lazyPage(() => import('./pages/MyPage'), 'MyPage');
const MyInfoPage = lazyPage(() => import('./pages/MyInfoPage'), 'MyInfoPage');
const InquiryPage = lazyPage(() => import('./pages/InquiryPage'), 'InquiryPage');
const Login = lazyPage(() => import('./pages/Login'), 'Login');
const SignUp = lazyPage(() => import('./pages/SignUp'), 'SignUp');
const RedirectToProduct = lazyPage(() => import('./pages/RedirectToProduct'), 'RedirectToProduct');
const CSCenter = lazyPage(() => import('./pages/CSCenter'), 'CSCenter');
const ProductSearchResult = lazyPage(() => import('./pages/ProductSearchResult'), 'ProductSearchResult');
const QuoteCartPage = lazyPage(() => import('./pages/QuoteCart'), 'QuoteCartPage');
const QuoteRequestPage = lazyPage(() => import('./pages/QuoteRequest'), 'QuoteRequestPage');
const TermsOfService = lazyPage(() => import('./pages/TermsOfService'), 'TermsOfService');
const PrivacyPolicy = lazyPage(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const BoardPage = lazyPage(() => import('./pages/BoardPage'), 'BoardPage');
const BoardPostDetailPage = lazyPage(() => import('./pages/GnbPostDetailPage'), 'BoardPostDetailPage');
const ReviewCreatePage = lazyPage(() => import('./pages/ReviewCreatePage'), 'ReviewCreatePage');
const ReviewEditPage = lazyPage(() => import('./pages/ReviewEditPage'), 'ReviewEditPage');
const BlankPage = lazyPage(() => import('./pages/BlankPage'), 'BlankPage');
const NotFound = lazyPage(() => import('./pages/NotFound'), 'NotFound');
const AdminDashboard = lazyPage(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const ProductManager = lazyPage(() => import('./pages/admin/ProductManager'), 'ProductManager');
const BookingList = lazyPage(() => import('./pages/admin/BookingList'), 'BookingList');
const SectionManager = lazyPage(() => import('./pages/admin/SectionManager'), 'SectionManager');
const CategoryManager = lazyPage(() => import('./pages/admin/CategoryManager'), 'CategoryManager');
const CMSManager = lazyPage(() => import('./pages/admin/CMSManager'), 'CMSManager');
const UserManager = lazyPage(() => import('./pages/admin/UserManager'), 'UserManager');
const AdminLogin = lazyPage(() => import('./pages/admin/AdminLogin'), 'AdminLogin');
const AdminSignup = lazyPage(() => import('./pages/admin/AdminSignup'), 'AdminSignup');
const NavMenuManager = lazyPage(() => import('./pages/admin/NavMenuManager'), 'NavMenuManager');
const FAQManager = lazyPage(() => import('./pages/admin/FAQManager'), 'FAQManager');
const InquiryManager = lazyPage(() => import('./pages/admin/InquiryManager'), 'InquiryManager');
const GnbSectionManager = lazyPage(() => import('./pages/admin/GnbSectionManager'), 'GnbSectionManager');
const QuoteEmailSettingsPage = lazyPage(() => import('./pages/admin/QuoteEmailSettings'), 'QuoteEmailSettingsPage');

const COMPANY_SITE_URL = 'https://humanpartner.kr/';

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-400">
    불러오는 중...
  </div>
);

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
);

const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search, hash]);

  return null;
};

const RouteAnalytics = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const pagePath = `${pathname}${search}${hash}`;
    const frameId = window.requestAnimationFrame(() => {
      trackPageView(pagePath);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname, search, hash]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const detail = event.message || "Unhandled runtime error";
      trackException(detail, true, "window.error");
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "Unhandled promise rejection";

      trackException(reason, false, "window.unhandledrejection");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
};

const CompanyRedirect = () => {
  useEffect(() => {
    window.location.replace(COMPANY_SITE_URL);
  }, []);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-slate-500">
      <p>운영사 소개 페이지로 이동 중입니다.</p>
      <a href={COMPANY_SITE_URL} className="font-semibold text-[#001E45] underline">
        자동 이동이 안 되면 여기를 눌러주세요.
      </a>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <PriceDisplayProvider>
        <ErrorBoundary FallbackComponent={GlobalErrorFallback} onReset={() => window.location.reload()}>
          <Router>
          <ScrollToTop />
          <RouteAnalytics />
          <Routes>
            {/* Admin Routes - Protected */}
            <Route
              path="/admin"
              element={withSuspense(
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>,
              )}
            >
              <Route path="cms" element={withSuspense(<CMSManager />)} />
              <Route path="sections" element={withSuspense(<SectionManager />)} />
              <Route path="categories" element={withSuspense(<CategoryManager />)} />
              <Route path="products" element={withSuspense(<ProductManager />)} />
              <Route path="rental-requests" element={withSuspense(<BookingList />)} />
              <Route path="bookings" element={<Navigate to="/admin/rental-requests" replace />} />
              <Route path="users" element={withSuspense(<UserManager />)} />
              <Route path="menus" element={withSuspense(<NavMenuManager />)} />
              <Route path="faqs" element={withSuspense(<FAQManager />)} />
              <Route path="inquiries" element={withSuspense(<InquiryManager />)} />
              <Route path="gnb-sections" element={withSuspense(<GnbSectionManager />)} />
              <Route path="quote-email-settings" element={withSuspense(<QuoteEmailSettingsPage />)} />
              <Route path="mice-tabs" element={<Navigate to="/admin/gnb-sections" replace />} />
            </Route>

            {/* Admin Login - Separate Route */}
            <Route path="/admin/login" element={withSuspense(<AdminLogin />)} />
            <Route path="/admin/signup" element={withSuspense(<AdminSignup />)} />

            {/* Public Routes */}
            <Route
              path="/*"
              element={
                <div className="min-h-screen bg-white">
                  <div className="print:hidden">
                    <Header />
                  </div>
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<MainPage />} />
                      <Route path="/products" element={<ProductListPage />} />
                      <Route path="/products/:categorySlug" element={<ProductRouteResolver />} />
                      <Route path="/products/:categorySlug/:subcategorySlug" element={<ProductRouteResolver />} />
                      <Route path="/mypage" element={<MyPage />} />
                      <Route path="/mypage/info" element={<MyInfoPage />} />
                      <Route path="/mypage/inquiry" element={<InquiryPage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/cs" element={<CSCenter />} />
                      <Route path="/p/:code" element={<RedirectToProduct />} />
                      <Route path="/search" element={<ProductSearchResult />} />
                      <Route path="/quote-cart" element={<QuoteCartPage />} />
                      <Route path="/quote-request" element={<QuoteRequestPage />} />
                      <Route path="/company" element={<CompanyRedirect />} />
                      <Route path="/notice" element={<BoardPage boardType="notice" />} />
                      <Route path="/notice/:id" element={<BoardPostDetailPage boardType="notice" />} />
                      <Route path="/event" element={<BoardPage boardType="event" />} />
                      <Route path="/event/:id" element={<BoardPostDetailPage boardType="event" />} />
                      <Route path="/review" element={<BoardPage boardType="review" />} />
                      <Route path="/review/new" element={<ReviewCreatePage />} />
                      <Route path="/review/:id/edit" element={<ReviewEditPage />} />
                      <Route path="/review/:id" element={<BoardPostDetailPage boardType="review" />} />
                      <Route path="/blank" element={<BlankPage />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                  <div className="print:hidden">
                    <Footer />
                    <FloatingQuoteButton />
                  </div>
                </div>
              }
            />
          </Routes>
          </Router>
        </ErrorBoundary>
      </PriceDisplayProvider>
    </AuthProvider>
  );
}

export default App;
