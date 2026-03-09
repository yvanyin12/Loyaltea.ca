import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ScanLine, History, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Scanner', page: 'Scanner', icon: ScanLine },
  { label: 'History', page: 'ScanHistory', icon: History },
  { label: 'Settings', page: 'Settings', icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50">
        <div className="flex max-w-lg mx-auto">
          {NAV_ITEMS.map(({ label, page, icon: Icon }) => {
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