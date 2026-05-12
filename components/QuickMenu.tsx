import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from './ui/Container';
import { getQuickMenuItems, QuickMenuItem } from '../src/api/cmsApi';
import {
  Hotel, Zap, Ticket, Gift, Globe, ShoppingBag, Utensils, Car,
  LayoutGrid, Key, Monitor, Laptop, Printer, Phone, Camera, Plus, Loader2
} from 'lucide-react';

// Dynamic icon mapping based on icon name stored in DB
const getIcon = (iconName: string, colorClass: string = 'text-slate-500') => {
  const iconMap: Record<string, React.ReactNode> = {
    'Building': <Hotel className={colorClass} />,
    'Hotel': <Hotel className={colorClass} />,
    'Zap': <Zap className={colorClass} />,
    'Ticket': <Ticket className={colorClass} />,
    'Gift': <Gift className={colorClass} />,
    'Globe': <Globe className={colorClass} />,
    'ShoppingBag': <ShoppingBag className={colorClass} />,
    'Utensils': <Utensils className={colorClass} />,
    'Car': <Car className={colorClass} />,
    'LayoutGrid': <LayoutGrid className={colorClass} />,
    'Key': <Key className={colorClass} />,
    'Monitor': <Monitor className={colorClass} />,
    'Laptop': <Laptop className={colorClass} />,
    'Printer': <Printer className={colorClass} />,
    'Phone': <Phone className={colorClass} />,
    'Camera': <Camera className={colorClass} />,
  };
  return iconMap[iconName] || <Plus className={colorClass} />;
};

// Color palette for icons
const iconColors = [
  'text-rose-500', 'text-orange-500', 'text-green-600', 'text-blue-500',
  'text-indigo-500', 'text-purple-500', 'text-yellow-600', 'text-[#001E45]',
  'text-gray-500', 'text-pink-500', 'text-cyan-500', 'text-emerald-500'
];

export const QuickMenu: React.FC = () => {
  const [items, setItems] = useState<QuickMenuItem[]>([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await getQuickMenuItems();
        setItems(data);
      } catch (error) {
        console.error('Failed to load quick menu items:', error);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  if (loading) {
    return (
      <div className="py-8 md:py-16 bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#001E45]" size={32} />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="py-12 md:py-16 bg-white overflow-hidden">
      <Container>
        <div className="relative">
            {/* 2-row Grid for mobile, Flex for desktop */}
            <div
               className="grid grid-cols-5 gap-y-2 gap-x-[0.5rem] md:flex md:justify-between items-start pb-2 md:pb-0"
            >
          {items.map((item, index) => {
            // 카테고리가 있으면 해당 카테고리 필터링 링크 생성, 없으면 기존 링크 사용
            // title 파라미터도 함께 추가하여 페이지 제목 설정
            let linkUrl = item.link;

            if (item.category) {
              linkUrl = `/products?category=${encodeURIComponent(item.category)}&title=${encodeURIComponent(item.name)}`;
            } else if (item.link && !item.link.includes('title=')) {
              // 기존 링크에 title이 없으면 추가
              const hasQuestionMark = item.link.includes('?');
              linkUrl = `${item.link}${hasQuestionMark ? '&' : '?'}title=${encodeURIComponent(item.name)}`;
            }

            return (
              <Link
                key={item.id}
                to={linkUrl}
                className="group flex flex-col items-center gap-1.5 md:gap-[1em] flex-shrink-0 w-full md:w-auto md:flex-1 min-w-0"
              >
                <div className="w-[4.1rem] h-[4.1rem] md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-2xl bg-slate-50 flex items-center justify-center bg-opacity-10 group-hover:bg-opacity-25 transition-all duration-300 group-hover:-translate-y-1">
                  <div className="w-full h-full flex items-center justify-center md:scale-110 lg:scale-125">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-[0.1rem] md:p-[0.2rem]" />
                    ) : (
                      getIcon(item.icon, iconColors[index % iconColors.length])
                    )}
                  </div>
                </div>
                <span className="text-[13px] md:text-sm lg:text-base text-slate-700 font-semibold tracking-tight truncate w-full text-center px-1">
                  {item.name}
                </span>
              </Link>
            )
          })}
            </div>
        </div>
      </Container>
    </div>
  );
};
