import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import Logo from './components/Logo';
import { LayoutDashboard, FileText, PlusCircle, LogOut, Menu, X } from 'lucide-react';

export default function Layout({ children }) {
  const [user, setUser] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navItems = [
    { name: 'Dashboard', path: 'Home', icon: LayoutDashboard },
    { name: 'Proposals', path: 'Proposals', icon: FileText },
  ];

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <Logo />
        <button className="md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname.includes(item.path) || (location.pathname === '/' && item.path === 'Home');
          return (
            <Link
              key={item.path}
              to={createPageUrl(item.path)}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                isActive ? 'bg-blue-50 text-blue-800 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          );
        })}
        {['admin', 'team_member'].includes(user?.role) && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <Link
              to={createPageUrl('ProposalForm')}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-md"
            >
              <PlusCircle className="w-5 h-5" />
              New Proposal
            </Link>
          </div>
        )}
      </nav>
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between px-2">
          <div className="text-sm truncate pr-2">
            <p className="font-bold text-gray-900 truncate">{user.full_name}</p>
            <p className="text-gray-500 text-xs capitalize font-medium">{user.role}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex">
      {/* Desktop Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col shadow-sm z-10">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
      
      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <Logo className="scale-75 origin-left" />
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}