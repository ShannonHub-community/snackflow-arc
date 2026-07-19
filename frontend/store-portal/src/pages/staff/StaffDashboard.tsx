import { useState, useEffect } from "react";
import React from "react";
import { LogOut, PackageCheck, CheckCircle2, Package, XCircle, Timer, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StaffDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-gray-950 p-4 flex items-center justify-between border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold tracking-tight text-white">CAFE-882</div>
          <div className="h-6 w-px bg-gray-700"></div>
          <div className="flex bg-gray-800 p-1 rounded-lg">
            <div className="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 bg-blue-500 text-white">
              <PackageCheck className="h-4 w-4" /> Counter
            </div>
          </div>
        </div>
        <button 
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <LogOut className="h-4 w-4" /> End Shift
        </button>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden">
        <CounterTab />
      </main>
    </div>
  );
}

// ----------------------------------------------------
// Counter Tab
// ----------------------------------------------------

type OrderStatus = "ready" | "packed" | "cancelled";

interface OrderItem {
  name: string;
  note?: string;
}

interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  time: string;
  cancelCountdown?: number;
}

function CounterTab() {
  const [orders, setOrders] = useState<Order[]>([
    { 
      id: "A12", 
      status: "ready", 
      items: [{name: "1x Pizza", note: "Extra cheese"}, {name: "2x Coffee", note: "Less sugar"}], 
      time: "2m ago" 
    },
    { 
      id: "B44", 
      status: "ready", 
      items: [{name: "1x Burger", note: "No onions"}], 
      time: "5m ago" 
    },
    { 
      id: "C09", 
      status: "packed", 
      items: [{name: "1x Sandwich"}], 
      time: "1m ago" 
    },
    { 
      id: "D91", 
      status: "cancelled", 
      items: [{name: "1x Pasta"}], 
      time: "8m ago", 
      cancelCountdown: 15 
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prev => {
        let changed = false;
        const next = prev.map(o => {
          if (o.status === "cancelled" && o.cancelCountdown !== undefined && o.cancelCountdown > 0) {
            changed = true;
            return { ...o, cancelCountdown: o.cancelCountdown - 1 };
          }
          return o;
        });
        
        if (changed) {
          // Remove items that hit 0
          return next.filter(o => !(o.status === "cancelled" && o.cancelCountdown !== undefined && o.cancelCountdown <= 0));
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = (id: string, action: "pack" | "place" | "cancel" | "retrieve") => {
    if (action === "pack") {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "packed" } : o));
    } else if (action === "place") {
      setOrders(prev => prev.filter(o => o.id !== id));
    } else if (action === "cancel") {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "cancelled", cancelCountdown: undefined } : o));
    } else if (action === "retrieve") {
      // Retrieve cancelled order -> back to ready? Or just removes it?
      // "so that means order items are used in somewhere." -> meaning we salvaged it, so we can dismiss it from cancelled list.
      setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  const readyOrders = orders.filter(o => o.status === "ready");
  const packedOrders = orders.filter(o => o.status === "packed");
  const cancelledOrders = orders.filter(o => o.status === "cancelled");

  return (
    <div className="flex h-full p-6 gap-6">
      {/* Ready to Pack */}
      <div className="flex-1 flex flex-col bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" /> Ready to Pack
          </h2>
          <span className="bg-blue-500/20 text-blue-400 font-bold px-3 py-1 rounded-full text-sm">{readyOrders.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
          {readyOrders.map(order => (
            <OrderCard key={order.id} order={order} onAction={handleAction} />
          ))}
          {readyOrders.length === 0 && (
            <div className="text-gray-500 text-center mt-10 font-medium">No orders ready to pack</div>
          )}
        </div>
      </div>

      {/* Packed */}
      <div className="flex-1 flex flex-col bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" /> Packed
          </h2>
          <span className="bg-green-500/20 text-green-400 font-bold px-3 py-1 rounded-full text-sm">{packedOrders.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
          {packedOrders.map(order => (
            <OrderCard key={order.id} order={order} onAction={handleAction} />
          ))}
          {packedOrders.length === 0 && (
            <div className="text-gray-500 text-center mt-10 font-medium">No packed orders</div>
          )}
        </div>
      </div>

      {/* Cancelled Tab */}
      <div className="w-80 flex flex-col bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shrink-0">
        <div className="bg-red-950/30 p-4 border-b border-red-900/30 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-5 h-5" /> Cancelled
          </h2>
          <span className="bg-red-500/20 text-red-400 font-bold px-3 py-1 rounded-full text-sm">{cancelledOrders.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
          {cancelledOrders.map(order => (
            <div key={order.id} className="bg-gray-800 rounded-xl p-4 border border-red-500/20 relative overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-300">
              {order.cancelCountdown !== undefined && order.cancelCountdown > 0 && (
                 <div className="absolute top-0 left-0 w-full h-1 bg-gray-700">
                   <div className="h-full bg-red-500 transition-all duration-1000 ease-linear" style={{ width: `${(order.cancelCountdown / 15) * 100}%` }}></div>
                 </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-black text-white">#{order.id}</span>
                {order.cancelCountdown !== undefined && (
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                    <Timer className="w-3 h-3" /> {order.cancelCountdown}s
                  </span>
                )}
              </div>
              <div className="space-y-1 mb-4 flex-1">
                {order.items.map((item, i) => (
                  <div key={i} className="text-sm text-gray-300">• {item.name}</div>
                ))}
              </div>
              <button 
                onClick={() => handleAction(order.id, "retrieve")}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Retrieve Items
              </button>
            </div>
          ))}
          {cancelledOrders.length === 0 && (
            <div className="text-gray-500 text-center mt-10 font-medium">No cancelled orders</div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onAction }: { key?: React.Key, order: Order, onAction: (id: string, action: "pack" | "place" | "cancel" | "retrieve") => void }) {
  return (
    <div className={`bg-gray-800 rounded-xl p-5 border shadow-lg flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 ${
      order.status === "ready" ? "border-blue-500/30" : "border-green-500/30"
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-3xl font-black text-white">#{order.id}</div>
          <div className="text-sm text-gray-400 mt-1">{order.time}</div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          order.status === "ready" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
        }`}>
          {order.status === "ready" ? "Ready to Pack" : "Packed"}
        </div>
      </div>
      
      <div className="flex-1 bg-black/20 rounded-lg p-3 space-y-2">
        {order.items.map((item, i) => (
          <div key={i} className="flex flex-col">
            <div className="text-lg font-medium text-gray-200 flex items-start gap-2">
              <span className="text-gray-500">•</span> {item.name}
            </div>
            {item.note && (
              <div className="text-sm text-amber-400 ml-4 italic font-medium">Note: {item.note}</div>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex gap-3 mt-2">
        {order.status === "ready" && (
          <>
            <button 
              onClick={() => onAction(order.id, "pack")}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md"
            >
              PACK
            </button>
            <button 
              onClick={() => onAction(order.id, "cancel")}
              className="px-4 py-3 bg-gray-700 hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30 text-gray-300 font-bold rounded-xl transition-all active:scale-95"
            >
              Cancel
            </button>
          </>
        )}
        {order.status === "packed" && (
          <>
            <button 
              onClick={() => onAction(order.id, "place")}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md"
            >
              PLACE
            </button>
            <button 
              onClick={() => onAction(order.id, "cancel")}
              className="px-4 py-3 bg-gray-700 hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30 text-gray-300 font-bold rounded-xl transition-all active:scale-95"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
