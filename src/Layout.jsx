import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ScanLine, History, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RestaurantModePreview from './components/settings/RestaurantModePreview';

const BASE_NAV = [
  { label: 'Scanner', page: 'Scanner', icon: ScanLine },
  { label: 'History', page: 'ScanHistory', icon: History },
];

const ADMIN_NAV = [
  ...BASE_NAV,
  { label: 'Settings', page: 'Settings', icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewRestaurant, setPreviewRestaurant] = useState(false);

  useEffect(() => {
    const preview = localStorage.getItem('pc_preview_restaurant') === 'true';
    setPreviewRestaurant(preview);

    base44.auth.me().then((user) => {
      setIsAdmin(user?.role === 'admin');
    }).catch(() => {});
  }, []);

  // Effective mode: admin sees admin UI unless they're previewing restaurant mode
  const showAdminUI = isAdmin && !previewRestaurant;
  const navItems = showAdminUI ? ADMIN_NAV : BASE_NAV;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Preview banner — only visible to admins in preview mode */}
      {isAdmin && previewRestaurant && <RestaurantModePreview />}

      <main className={`flex-1 pb-20 ${isAdmin && previewRestaurant ? 'pt-10' : ''}`}>
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50">
        <div className="flex max-w-lg mx-auto">
          {navItems.map(({ label, page, icon: Icon }) => {
            const isActive = currentPageName === page;
            return (
              <Link
                key={page}
                to={createPageUrl(page)}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}