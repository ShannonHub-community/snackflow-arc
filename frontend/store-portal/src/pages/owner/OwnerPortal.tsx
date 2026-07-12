import React, { useState } from "react";
import { Outlet, NavLink, Navigate, useNavigate } from "react-router-dom";
import { Settings, Palette, ShieldAlert, DollarSign, LineChart, LogOut, Store, Menu, X } from "lucide-react";

export default function OwnerPortal() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Profile & Settings", path: "/owner/profile", icon: Settings },
    { name: "Finance & Live Revenue", path: "/owner/finance", icon: DollarSign, secure: true },
    { name: "Analytics", path: "/owner/analytics", icon: LineChart },
    { name: "Store Customization", path: "/owner/customization", icon: Palette },
    { name: "Security & Team", path: "/owner/security", icon: ShieldAlert, secure: true },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl italic">
                S
              </div>
              <span className="text-xl font-bold tracking-tight text-white">SnackFlow<span className="text-orange-500 text-sm align-top">™</span></span>
            </div>
            <div className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">CAFE-882</div>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? "" : "opacity-60"}`} />
                  <span className="font-medium text-sm">{item.name}</span>
                  {item.secure && <LockIcon className="ml-auto w-4 h-4 text-slate-500" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sudo Status</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
            <p className="text-xs text-slate-400">Unlocked for session</p>
          </div>
          <button 
            onClick={() => navigate("/login")}
            className="flex w-full justify-center items-center gap-3 px-4 py-2 text-[10px] font-bold tracking-wider uppercase bg-slate-700 text-white hover:bg-slate-600 transition-colors rounded-lg"
          >
            <LogOut className="h-4 w-4 opacity-75" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Admin Portal</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Real-time management for <span className="font-semibold text-slate-700 uppercase tracking-tight">CAFE-882</span></p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">Rajesh Kumar</p>
              <p className="text-[10px] text-slate-500">Owner Access</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300">
              <Store className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto pb-12">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
