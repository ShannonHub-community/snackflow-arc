import React, { useState, useEffect } from "react";
import { LogOut, WifiOff, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Dish {
  id: string;
  name: string;
  need: number;
  prepared: number;
}

export default function KdsDashboard() {
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([
    { id: "1", name: "Masala Dosa", need: 7, prepared: 0 },
    { id: "2", name: "Plain Dosa", need: 3, prepared: 0 },
    { id: "3", name: "Idli Sambar", need: 12, prepared: 0 },
    { id: "4", name: "Onion Uttapam", need: 0, prepared: 15 },
  ]);

  const handleAction = (id: string, action: number | "clear") => {
    setDishes(prev => prev.map(dish => {
      if (dish.id === id) {
        if (action === "clear") {
          return { ...dish, prepared: dish.prepared + dish.need, need: 0 };
        } else if (typeof action === "number") {
          if (action > 0) {
            const count = Math.min(action, dish.need);
            return { ...dish, need: dish.need - count, prepared: dish.prepared + count };
          } else {
            // Undo: decrease prepared, increase need
            const count = Math.min(Math.abs(action), dish.prepared);
            return { ...dish, need: dish.need + count, prepared: dish.prepared - count };
          }
        }
      }
      return dish;
    }));
  };

  const activeDishes = dishes.filter(d => d.need > 0).sort((a, b) => b.need - a.need);
  const inactiveDishes = dishes.filter(d => d.need === 0);

  return (
    <div className={`min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-transparent transition-all duration-300 ${isOffline ? "border-[12px] border-red-600" : "border-[12px] border-zinc-950"}`}>
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-red-600 text-white font-black text-3xl py-3 text-center uppercase tracking-widest shadow-xl z-50">
          Offline - Reconnecting...
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="text-3xl font-black tracking-tight text-white uppercase">STATION: DOSA & GRIDDLE</div>
          <div className="h-8 w-px bg-zinc-700"></div>
          <div className="text-xl font-medium text-zinc-400">Logged in as: <span className="text-zinc-200 font-bold">Chef_01</span></div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsOffline(!isOffline)}
            className={`p-4 rounded-xl font-bold text-lg transition-colors ${isOffline ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
          >
            <WifiOff className="w-8 h-8" />
          </button>
          <button 
            onClick={() => navigate("/login")}
            className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl transition-colors text-xl font-black tracking-wider uppercase"
          >
            <LogOut className="h-6 w-6" /> Log Out
          </button>
        </div>
      </header>

      {/* Main Split Screen */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6">
        
        {/* Section A: The Demand Queue */}
        <section className="md:w-1/3 flex flex-col border-r border-zinc-800 pr-6">
          <h2 className="text-2xl font-black text-zinc-500 uppercase tracking-widest mb-6 shrink-0">The Demand Queue</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-4 pb-12" style={{ scrollbarWidth: 'none' }}>
            {activeDishes.map(dish => (
              <div key={dish.id} className="bg-zinc-900 rounded-3xl p-6 border-l-8 border-orange-500 shadow-2xl relative overflow-hidden flex items-center justify-between animate-in slide-in-from-bottom-4 duration-300">
                <div>
                  <div className="text-3xl font-black tracking-tight text-white">{dish.name}</div>
                  <div className="text-lg font-medium text-emerald-500 mt-1">Prepared: {dish.prepared}</div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm font-bold text-orange-500 uppercase tracking-widest">Need</div>
                  <div className="text-7xl font-black text-white leading-none tabular-nums">{dish.need}</div>
                </div>
              </div>
            ))}
            
            {inactiveDishes.length > 0 && (
              <div className="mt-8 pt-8 border-t border-zinc-800/50">
                <div className="text-sm font-bold text-zinc-600 uppercase tracking-widest mb-4">Cleared / Inactive</div>
                {inactiveDishes.map(dish => (
                  <div key={dish.id} className="bg-zinc-900/50 rounded-3xl p-6 border-l-8 border-zinc-800 opacity-50 flex items-center justify-between mb-4">
                    <div className="text-2xl font-bold tracking-tight text-zinc-400">
                      {dish.name}
                      <div className="text-sm font-medium text-zinc-500 mt-1">Prepared: {dish.prepared}</div>
                    </div>
                    <div className="text-4xl font-black text-zinc-600 leading-none"><CheckCircle2 className="w-10 h-10" /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section B: The Action / Supply Board */}
        <section className="md:w-2/3 flex flex-col">
          <h2 className="text-2xl font-black text-zinc-500 uppercase tracking-widest mb-6 shrink-0">Action / Supply Board</h2>
          <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-12" style={{ scrollbarWidth: 'none' }}>
            {activeDishes.map(dish => (
              <div key={`action-${dish.id}`} className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="text-2xl font-bold text-zinc-400 mb-2">
                  {dish.name} 
                  <span className="text-white ml-2 bg-zinc-800 px-3 py-1 rounded-lg">Need: {dish.need}</span>
                  <span className="text-emerald-400 ml-2 bg-zinc-800 px-3 py-1 rounded-lg">Prepared: {dish.prepared}</span>
                </div>
                
                <div className="flex gap-4">
                  <button onClick={() => handleAction(dish.id, 1)} style={{ width: '118.941px', height: '127.98599999999999px' }} className="flex-1 h-32 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-4xl font-black rounded-2xl transition-all shadow-[0_8px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-2 flex items-center justify-center select-none">
                    + 1 MADE
                  </button>
                  <button onClick={() => handleAction(dish.id, 2)} className="flex-1 h-32 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-4xl font-black rounded-2xl transition-all shadow-[0_8px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-2 flex items-center justify-center select-none">
                    + 2 MADE
                  </button>
                  <button onClick={() => handleAction(dish.id, 5)} className="flex-1 h-32 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-4xl font-black rounded-2xl transition-all shadow-[0_8px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-2 flex items-center justify-center select-none">
                    + 5 MADE
                  </button>
                  <button onClick={() => handleAction(dish.id, "clear")} className="flex-1 h-32 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-2xl font-black rounded-2xl transition-all shadow-[0_8px_0_rgb(29,78,216)] active:shadow-[0_0px_0_rgb(29,78,216)] active:translate-y-2 flex flex-col items-center justify-center select-none">
                    <span>CLEAR</span>
                    <span className="text-lg opacity-80 text-center font-bold">TOTAL NEED</span>
                  </button>
                </div>
                
                <div className="flex justify-start">
                  <button onClick={() => handleAction(dish.id, -1)} className="px-8 h-16 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-400 text-xl font-bold rounded-xl transition-all border border-zinc-700 shadow-sm flex items-center gap-2 select-none">
                    - 1 (Undo)
                  </button>
                </div>
              </div>
            ))}
            
            {activeDishes.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <CheckCircle2 className="w-24 h-24 mb-6 opacity-20" />
                <h3 className="text-4xl font-black uppercase tracking-widest opacity-20 text-center max-w-md">Station Clear. Good Job, Chef.</h3>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
