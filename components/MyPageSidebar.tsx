import React from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "../src/context/AuthContext";

type MyPageSidebarActive = "requests" | "cart" | "info" | "inquiry";

interface MyPageSidebarProps {
  active: MyPageSidebarActive;
}

const menuItems: Array<{ key: MyPageSidebarActive; label: string; to: string }> = [
  { key: "requests", label: "요청 내역", to: "/mypage" },
  { key: "cart", label: "장바구니", to: "/quote-cart" },
  { key: "info", label: "내 정보 관리", to: "/mypage/info" },
  { key: "inquiry", label: "1:1 문의 내역", to: "/mypage/inquiry" },
];

export const MyPageSidebar: React.FC<MyPageSidebarProps> = ({ active }) => {
  const { user, userProfile } = useAuth();

  if (!user) return null;

  return (
    <aside className="h-fit rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#B3C1D4]">
        <User size={32} className="text-[#001E45]" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{userProfile?.name || "고객"} 님</h2>
      <p className="mb-6 break-words text-sm leading-6 text-gray-500">{userProfile?.email || user.email}</p>
      <nav className="space-y-1 border-t border-gray-100 pt-4 text-left">
        {menuItems.map((item) => {
          const isActive = item.key === active;

          return (
            <Link
              key={item.key}
              to={item.to}
              className={`block rounded px-2 py-2 text-sm transition-colors ${
                isActive
                  ? "font-semibold text-[#001E45] hover:bg-[#001E45]/5"
                  : "font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
