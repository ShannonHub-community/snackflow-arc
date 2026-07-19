import React, { useState, useEffect, useRef, useMemo } from "react";
import { LogOut, CheckCircle2, AlertCircle, Utensils, ChevronLeft, ChevronRight, Plus, Minus, Zap, RefreshCw, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { IconResolver } from "../../components/WesternIcons";

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  notes: string | null;
  name?: string;
  item_name?: string;
}

interface Order {
  id: string;
  daily_order_id: string;
  table_number: string | null;
  order_type: "CASH" | "ONLINE";
  status: "PENDING_PAYMENT" | "UNPAID_CASH" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  total_amount: number;
  special_instructions: string | null;
  items?: OrderItem[];
  order_items?: OrderItem[];
  created_at: string;
}

interface DishDemand {
  item_id: string;
  name: string;
  total_ordered: number;
  present_stack: number;
  need_count: number;
  station: string;
  iconType: string;
}

const STATIONS = [
  { id: "all", name: "All Stations" },
  { id: "Beverage Station", name: "Beverage Station" },
  { id: "Grill Station", name: "Grill Station" },
  { id: "Oven Station", name: "Oven Station" },
];

const WESTERN_FALLBACK_KDS_DISHES: DishDemand[] = [
  { item_id: "prod_tea_001", name: "Tea", total_ordered: 10, present_stack: 4, need_count: 6, station: "Beverage Station", iconType: "coffee" },
  { item_id: "prod_coffee_001", name: "Coffee", total_ordered: 8, present_stack: 2, need_count: 6, station: "Beverage Station", iconType: "coffee" },
  { item_id: "prod_pizza_001", name: "Pizza", total_ordered: 7, present_stack: 1, need_count: 6, station: "Oven Station", iconType: "pizza" },
  { item_id: "prod_pasta_001", name: "Pasta", total_ordered: 4, present_stack: 1, need_count: 3, station: "Oven Station", iconType: "pasta" },
  { item_id: "prod_sandwich_001", name: "Sandwich", total_ordered: 5, present_stack: 2, need_count: 3, station: "Grill Station", iconType: "sandwich" },
  { item_id: "prod_burger_001", name: "Burger", total_ordered: 6, present_stack: 2, need_count: 4, station: "Grill Station", iconType: "burger" }
];

export default function KdsDashboard() {
  const navigate = useNavigate();
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [dishes, setDishes] = useState<DishDemand[]>(WESTERN_FALLBACK_KDS_DISHES);
  const [selectedItemId, setSelectedItemId] = useState<string | null>("prod_pizza_001");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("Just now");

  // Pagination for Left Screen (Demand Queue) to eliminate vertical scrollbars
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Debounce ref for batching action target updates (+1, +2, +5, -1)
  const pendingDeltasRef = useRef<Record<string, number>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rightBoardRef = useRef<HTMLDivElement>(null);

  // Parse station dish icon safely
  const getDishIcon = (item: any) => {
    if (!item) return "burger";
    if (item.iconType) return item.iconType;
    try {
      if (item.description) {
        const parsed = JSON.parse(item.description);
        if (parsed && parsed.icon) return parsed.icon.toLowerCase();
      }
    } catch (e) {}
    return "burger";
  };

  // Fetch active orders & station demand from backend
  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);

      // 1. Fetch active orders from backend
      const ordersData = await apiClient.get<Order[]>("/customer/orders?limit=100");
      setOrders([...ordersData]);

      // 2. Fetch menu items list
      let currentMenu = menuItems;
      if (isInitial || menuItems.length === 0) {
        currentMenu = await apiClient.get<any[]>("/customer/menu?all_items=true");
        setMenuItems(currentMenu);
      }

      // 3. Fetch aggregated station state
      const stationParam = selectedStation === "all" ? "all" : encodeURIComponent(selectedStation);
      let stationStateData: any = null;
      try {
        stationStateData = await apiClient.get<any>(`/kds/station-state/${stationParam}`);
      } catch (err) {
        // Fallback endpoint
        stationStateData = await apiClient.get<any>("/kds/station-state");
      }

      // Aggregate live active orders + station state
      const dishMap: Record<string, DishDemand> = {};

      // Initialize from station state dishes
      if (stationStateData && stationStateData.dishes) {
        stationStateData.dishes.forEach((d: any) => {
          const matchedMenu = currentMenu.find((m: any) => m.id === d.item_id || m.name.toLowerCase() === d.name.toLowerCase());
          dishMap[d.item_id] = {
            item_id: d.item_id,
            name: d.name,
            total_ordered: d.total_ordered || 0,
            present_stack: d.present_stack || 0,
            need_count: Math.max(0, (d.total_ordered || 0) - (d.present_stack || 0)),
            station: selectedStation === "all" ? "Kitchen" : selectedStation,
            iconType: getDishIcon(matchedMenu)
          };
        });
      }

      // Aggregate from active orders in DB (PAID, UNPAID_CASH, PENDING_PAYMENT, PREPARING)
      const activeOrders = ordersData.filter(
        o => o.status === "PAID" || o.status === "UNPAID_CASH" || o.status === "PENDING_PAYMENT" || o.status === "PREPARING"
      );

      activeOrders.forEach(order => {
        const itemList = (order.items && order.items.length > 0) ? order.items : (order.order_items || []);
        itemList.forEach(item => {
          const id = item.menu_item_id || item.id;
          const matchedMenu = currentMenu.find((m: any) => m.id === id);
          const dishName = item.name || item.item_name || (matchedMenu ? matchedMenu.name : "Unknown Dish");

          if (!dishMap[id]) {
            dishMap[id] = {
              item_id: id,
              name: dishName,
              total_ordered: item.quantity,
              present_stack: 0,
              need_count: item.quantity,
              station: "Kitchen",
              iconType: getDishIcon(matchedMenu)
            };
          } else {
            dishMap[id].total_ordered = Math.max(dishMap[id].total_ordered, dishMap[id].total_ordered + item.quantity);
            dishMap[id].need_count = Math.max(0, dishMap[id].total_ordered - dishMap[id].present_stack);
          }
        });
      });

      const aggregatedList = Object.values(dishMap);
      if (aggregatedList.length > 0) {
        setDishes(aggregatedList);
        if (!selectedItemId || !dishMap[selectedItemId]) {
          setSelectedItemId(aggregatedList[0].item_id);
        }
      } else {
        setDishes(WESTERN_FALLBACK_KDS_DISHES);
      }

      setIsOffline(false);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e: any) {
      console.warn("KDS fetch warning, loaded Western demo station queue:", e);
      setDishes(WESTERN_FALLBACK_KDS_DISHES);
      setIsOffline(false);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load & Polling effect (every 5 seconds)
  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => {
      fetchData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedStation]);

  // Online / Offline resiliency listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData(true);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Dynamically sorted dishes:
  // 1. Highest Need at the top (need_count desc)
  // 2. Items with Need: 0 pushed to bottom (greyed out)
  const sortedDishes = useMemo(() => {
    return [...dishes].sort((a, b) => {
      if (a.need_count === 0 && b.need_count > 0) return 1;
      if (a.need_count > 0 && b.need_count === 0) return -1;
      if (a.need_count !== b.need_count) return b.need_count - a.need_count;
      return a.name.localeCompare(b.name);
    });
  }, [dishes]);

  // Filter items for Action/Supply Board: items with Need > 0 (or all active sorted items)
  const activeSupplyDishes = useMemo(() => {
    const activeWithNeed = sortedDishes.filter(d => d.need_count > 0);
    return activeWithNeed.length > 0 ? activeWithNeed : sortedDishes;
  }, [sortedDishes]);

  // Viewport Paginated Dishes for Left Demand Queue
  const totalPages = Math.max(1, Math.ceil(sortedDishes.length / ITEMS_PER_PAGE));
  const currentDishes = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return sortedDishes.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedDishes, page]);

  // Scroll to corresponding card on Right Action Board when selected on left
  useEffect(() => {
    if (selectedItemId && rightBoardRef.current) {
      const el = rightBoardRef.current.querySelector(`#card-${selectedItemId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedItemId]);

  // Send batched API fulfillment call
  const sendBatchedFulfillment = async (itemId: string, totalDelta: number, clearNeed = false) => {
    try {
      await apiClient.post<any>("/kds/fulfill", {
        item_id: itemId,
        quantity_made: clearNeed ? -999 : totalDelta,
        station_id: selectedStation,
        clear_need: clearNeed
      });
    } catch (e: any) {
      console.error("Fulfillment API error:", e);
      fetchData(false);
    }
  };

  // Synchronized State Optimistic UI Handler with 300ms Debounce accumulator
  const handleBatchAction = (targetItemId: string, delta: number, clearNeed = false) => {
    if (!targetItemId) return;

    // 1. Instant Synchronized Optimistic UI Update (updates BOTH left & right cards)
    setDishes(prevDishes =>
      prevDishes.map(d => {
        if (d.item_id !== targetItemId) return d;
        
        let newStack = d.present_stack;
        if (clearNeed) {
          newStack = d.total_ordered;
        } else {
          newStack = Math.max(0, d.present_stack + delta);
        }
        
        const newNeed = Math.max(0, d.total_ordered - newStack);
        return {
          ...d,
          present_stack: newStack,
          need_count: newNeed
        };
      })
    );

    // 2. Accumulate delta in ref for this specific itemId
    if (clearNeed) {
      pendingDeltasRef.current[targetItemId] = 999;
    } else {
      pendingDeltasRef.current[targetItemId] = (pendingDeltasRef.current[targetItemId] || 0) + delta;
    }

    // 3. Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 4. Set 300ms debounce timer to batch network request
    debounceTimerRef.current = setTimeout(() => {
      Object.keys(pendingDeltasRef.current).forEach(itemId => {
        const accumulatedDelta = pendingDeltasRef.current[itemId];
        if (accumulatedDelta !== undefined) {
          delete pendingDeltasRef.current[itemId];
          sendBatchedFulfillment(itemId, accumulatedDelta, accumulatedDelta === 999);
        }
      });
    }, 300);
  };

  return (
    <div className={`h-screen w-screen bg-zinc-950 text-white flex flex-col font-sans overflow-hidden border-[8px] transition-colors duration-500 ${
      isOffline ? "border-red-600 animate-pulse" : "border-zinc-900"
    }`}>
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-red-600 text-white font-black text-sm py-1.5 px-4 text-center uppercase tracking-widest flex items-center justify-center gap-2 shrink-0 animate-bounce">
          <AlertCircle size={18} /> CONNECTION OFFLINE — Sync paused. Reconnecting...
        </div>
      )}

      {/* Header Bar with Station Tabs */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5">
          <div className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2 shrink-0">
            <Flame className="text-orange-500 w-7 h-7" />
            KDS DEMAND QUEUE
          </div>
          <div className="h-6 w-px bg-zinc-700"></div>

          {/* Station Selector Tabs */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
            {STATIONS.map(st => (
              <button
                key={st.id}
                onClick={() => {
                  setSelectedStation(st.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all ${
                  selectedStation === st.id
                    ? "bg-orange-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
            <RefreshCw size={12} className={loading ? "animate-spin text-orange-500" : "text-emerald-500"} />
            Synced: <span className="text-zinc-200 font-bold">{lastSyncedTime}</span>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-red-500/20 transition-colors"
          >
            <LogOut className="h-4 w-4" /> End Shift
          </button>
        </div>
      </header>

      {/* Main Split-Screen Workspace (Fixed Height, No Scrollbars on Workspace) */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-400 font-medium text-sm">Aggregating Station Demand...</p>
        </div>
      ) : (
        <main className="flex-1 overflow-hidden grid grid-cols-12 p-4 gap-4 bg-zinc-950">
          
          {/* LEFT SCREEN (5 cols): Demand Queue */}
          <section className="col-span-5 flex flex-col bg-zinc-900/40 rounded-2xl border border-zinc-800 p-4 overflow-hidden">
            {/* Header & Pagination Controls */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-zinc-300 uppercase tracking-wider">
                  Demand Queue ({sortedDishes.length} Items)
                </h2>
              </div>

              {/* Viewport Pagination */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 font-mono">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 text-zinc-200 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 text-zinc-200 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Demand Item Cards List */}
            <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
              {currentDishes.map(dish => {
                const isSelected = selectedItemId === dish.item_id;
                const isZeroNeed = dish.need_count === 0;

                return (
                  <button
                    key={dish.item_id}
                    onClick={() => setSelectedItemId(dish.item_id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left relative overflow-hidden select-none ${
                      isSelected
                        ? "bg-zinc-900 border-orange-500 ring-2 ring-orange-500/80 shadow-lg shadow-orange-950/30"
                        : isZeroNeed
                        ? "bg-zinc-950/60 border-zinc-900 opacity-40 grayscale hover:opacity-70"
                        : "bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    {/* Left Dish Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                        isZeroNeed ? "bg-zinc-900 text-zinc-600" : "bg-orange-950/50 text-orange-400 border border-orange-900/30"
                      }`}>
                        <IconResolver type={dish.iconType} className="w-6 h-6" />
                      </div>
                      <div className="truncate">
                        <h3 className={`text-base font-extrabold truncate ${isZeroNeed ? "text-zinc-500" : "text-white"}`}>
                          {dish.name}
                        </h3>
                        <p className="text-xs text-zinc-500 font-medium">
                          Prepared: <span className="text-emerald-400 font-bold">{dish.present_stack}</span> / {dish.total_ordered} Total
                        </p>
                      </div>
                    </div>

                    {/* Massive Need Badge */}
                    <div className={`flex flex-col items-end shrink-0 pl-3 ${
                      isZeroNeed ? "text-zinc-600" : "text-orange-500"
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">NEED</span>
                      <span className={`text-3xl font-black font-mono leading-none tracking-tighter ${
                        isZeroNeed ? "text-zinc-600" : "text-orange-400"
                      }`}>
                        {dish.need_count}
                      </span>
                    </div>
                  </button>
                );
              })}

              {currentDishes.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 py-12">
                  <CheckCircle2 size={48} className="opacity-20 mb-3" />
                  <p className="font-bold text-sm opacity-40">No items in station queue</p>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT SCREEN (7 cols): Supply / Action Board (1:1 Mapping of Active Items) */}
          <section className="col-span-7 flex flex-col bg-zinc-900/40 rounded-2xl border border-zinc-800 p-4 overflow-hidden">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h2 className="text-base font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Utensils className="text-orange-500 w-5 h-5" />
                Action / Supply Board ({activeSupplyDishes.length} Active Cards)
              </h2>
              <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 font-bold px-2.5 py-1 rounded uppercase">
                Synchronized Touch Targets
              </span>
            </div>

            {/* Scrollable Supply Board containing 1:1 Action Cards for each item */}
            <div ref={rightBoardRef} className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-4" style={{ scrollbarWidth: "thin" }}>
              {activeSupplyDishes.map(dish => {
                const isSelected = selectedItemId === dish.item_id;
                const isZeroNeed = dish.need_count === 0;

                return (
                  <div
                    key={dish.item_id}
                    id={`card-${dish.item_id}`}
                    className={`bg-zinc-900 border rounded-2xl p-4 shadow-xl transition-all duration-200 ${
                      isSelected
                        ? "border-orange-500 ring-2 ring-orange-500/80 shadow-orange-950/40"
                        : isZeroNeed
                        ? "border-zinc-800/60 opacity-60 bg-zinc-950/40"
                        : "border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    {/* Header Row: Item Name, Need: [X], Prepared: [X] */}
                    <div className="flex justify-between items-center mb-3.5 pb-2.5 border-b border-zinc-800/80">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isZeroNeed ? "bg-zinc-900 text-zinc-600" : "bg-orange-950/50 text-orange-400 border border-orange-900/30"
                        }`}>
                          <IconResolver type={dish.iconType} className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white tracking-tight">{dish.name}</h3>
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                            Total Volume: {dish.total_ordered}
                          </span>
                        </div>
                      </div>

                      {/* Need & Prepared Badges */}
                      <div className="flex items-center gap-2.5 font-mono font-bold text-xs">
                        <span className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                          isZeroNeed
                            ? "bg-zinc-950 text-zinc-500 border-zinc-800"
                            : "bg-orange-950/60 text-orange-400 border-orange-900/40"
                        }`}>
                          <span className="text-[10px] text-zinc-400 font-sans uppercase font-extrabold">Need:</span>
                          <span className="text-xl font-black">{dish.need_count}</span>
                        </span>

                        <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-sans uppercase font-extrabold">Prepared:</span>
                          <span className="text-xl font-black">{dish.present_stack}</span>
                        </span>
                      </div>
                    </div>

                    {/* Primary Row of Massive Increment Buttons */}
                    <div className="grid grid-cols-4 gap-3 mb-2.5">
                      <button
                        onClick={() => handleBatchAction(dish.item_id, 1)}
                        className="py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-black text-base shadow-[0_4px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-1 transition-all flex flex-col items-center justify-center select-none uppercase tracking-wider"
                      >
                        + 1 MADE
                      </button>

                      <button
                        onClick={() => handleBatchAction(dish.item_id, 2)}
                        className="py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-black text-base shadow-[0_4px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-1 transition-all flex flex-col items-center justify-center select-none uppercase tracking-wider"
                      >
                        + 2 MADE
                      </button>

                      <button
                        onClick={() => handleBatchAction(dish.item_id, 5)}
                        className="py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-black text-base shadow-[0_4px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-1 transition-all flex flex-col items-center justify-center select-none uppercase tracking-wider"
                      >
                        + 5 MADE
                      </button>

                      <button
                        onClick={() => handleBatchAction(dish.item_id, 0, true)}
                        className="py-3.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white rounded-xl font-extrabold text-xs shadow-[0_4px_0_rgb(194,65,12)] active:shadow-[0_0px_0_rgb(194,65,12)] active:translate-y-1 transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider select-none text-center px-1"
                      >
                        <Zap size={15} fill="currentColor" className="shrink-0" /> CLEAR NEED
                      </button>
                    </div>

                    {/* Secondary Row containing Smaller [-1 (Undo)] Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleBatchAction(dish.item_id, -1)}
                        className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg font-bold text-xs border border-zinc-700 transition-colors flex items-center gap-1.5 uppercase tracking-wider select-none"
                      >
                        <Minus size={13} /> - 1 (Undo)
                      </button>
                    </div>
                  </div>
                );
              })}

              {activeSupplyDishes.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-16">
                  <CheckCircle2 size={48} className="opacity-20 mb-3" />
                  <p className="font-bold text-sm opacity-40">All active items fulfilled</p>
                </div>
              )}
            </div>
          </section>

        </main>
      )}
    </div>
  );
}
