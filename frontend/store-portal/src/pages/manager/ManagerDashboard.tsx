import { Outlet, NavLink, Navigate, useNavigate } from "react-router-dom";
import { Clock, AlertCircle, Package, DollarSign, LogOut } from "lucide-react";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  
  const navItems = [
    { name: "Shift Control", path: "/manager/shift", icon: Clock },
    { name: "Resolution Center", path: "/manager/resolution", icon: AlertCircle },
    { name: "Inventory", path: "/manager/inventory", icon: Package },
    { name: "Cash Report", path: "/manager/cash-report", icon: DollarSign },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6">
          <div className="text-xl font-bold tracking-tight text-white mb-1">Manager Portal</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CAFE-882</div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-4 rounded-xl transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-6 h-6 ${isActive ? "text-blue-400" : "opacity-60"}`} />
                  <span className="font-bold text-sm tracking-wide">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => navigate("/login")}
            className="flex w-full justify-center items-center gap-3 px-4 py-4 text-xs font-bold tracking-wider uppercase bg-slate-800 text-white hover:bg-slate-700 transition-colors rounded-xl"
          >
            <LogOut className="h-5 w-5 opacity-75" />
            End Shift
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-slate-50 p-6 md:p-8">
        <div className="max-w-6xl mx-auto h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
