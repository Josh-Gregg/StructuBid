import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import Logo from './components/Logo';
import { LayoutDashboard, FileText, PlusCircle, LogOut, Menu, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export default function Layout({ children }) {
  const [user, setUser] = React.useState(null);
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
    ...(user?.role === 'admin' ? [{ name: 'Team', path: 'Team', icon: Users }] : []),
  ];

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col">
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 print:hidden shrink-0 shadow-sm z-10">
        <Link to={createPageUrl('Home')} className="flex items-center">
          <Logo className="scale-75 origin-left" />
        </Link>
        
        <div className="flex items-center gap-4">
          {['admin', 'user'].includes(user?.role) && (
            <Link
              to={createPageUrl('ProposalForm')}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-sm text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              New Proposal
            </Link>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg outline-none transition-colors">
              <Menu className="w-6 h-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl shadow-lg border-gray-100">
              <div className="px-3 py-3 bg-gray-50/50 rounded-t-xl">
                <p className="text-sm font-bold text-gray-900 truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 capitalize font-medium">{user.role}</p>
              </div>
              <DropdownMenuSeparator className="bg-gray-100 m-0" />
              <div className="p-1.5 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname.includes(item.path) || (location.pathname === '/' && item.path === 'Home');
                  return (
                    <DropdownMenuItem key={item.path} asChild className={`rounded-lg cursor-pointer ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                      <Link
                        to={createPageUrl(item.path)}
                        className="flex items-center gap-3 px-2 py-2.5 w-full outline-none"
                      >
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="font-semibold">{item.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                {['admin', 'user'].includes(user?.role) && (
                  <DropdownMenuItem asChild className="md:hidden rounded-lg cursor-pointer">
                    <Link
                      to={createPageUrl('ProposalForm')}
                      className="flex items-center gap-3 px-2 py-2.5 w-full text-blue-700 outline-none"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="font-semibold">New Proposal</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </div>
              <DropdownMenuSeparator className="bg-gray-100 m-0" />
              <div className="p-1.5">
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-red-600 cursor-pointer flex items-center gap-3 px-2 py-2.5 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 w-full outline-none">
                  <LogOut className="w-4 h-4" />
                  <span className="font-semibold">Logout</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-w-0 overflow-auto print:overflow-visible relative">
        <div className="flex-1 p-4 md:p-8 print:p-0">
          <div className="max-w-7xl mx-auto print:max-w-none print:m-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}