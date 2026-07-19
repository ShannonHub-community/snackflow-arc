import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, AlertCircle, CreditCard, Banknote, ShoppingBag, CheckCircle2, Loader2, Utensils, RefreshCw, QrCode } from 'lucide-react';
import { generateShortId, simulatePhonePeRedirect, isStoreOpen, fetchMockOrder, fetchAllMockOrders, MockOrder } from './mockPaymentServices';
import { apiClient } from './lib/apiClient';
import { StoreLogoIcon, IconResolver } from './components/WesternIcons';

// --- TYPES ---
export type OrderStatus = 'processing' | 'ready' | 'cancelled';
export type PaymentMethod = 'online' | 'offline';

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  isSpecialty: boolean;
  iconType: string;
  inStock?: boolean;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
  note: string;
}

export interface ActiveOrder {
  id: string;
  dailyOrderId: string;
  items: { name: string; quantity: number; price: number; note?: string }[];
  total: number;
  paymentMode: PaymentMethod;
  status: OrderStatus;
  orderTime: number; 
  createdAt?: string;
  etaMinutes?: number;
}

const WESTERN_DEMO_MENU: FoodItem[] = [
  { id: "prod_tea_001", name: "Tea", price: 40, isSpecialty: false, iconType: "coffee" },
  { id: "prod_coffee_001", name: "Coffee", price: 60, isSpecialty: false, iconType: "coffee" },
  { id: "prod_pizza_001", name: "Pizza", price: 250, isSpecialty: true, iconType: "pizza" },
  { id: "prod_pasta_001", name: "Pasta", price: 220, isSpecialty: true, iconType: "pasta" },
  { id: "prod_sandwich_001", name: "Sandwich", price: 120, isSpecialty: false, iconType: "sandwich" },
  { id: "prod_burger_001", name: "Burger", price: 150, isSpecialty: false, iconType: "burger" },
];

// --- APP COMPONENT ---
export default function App() {
  const [view, setView] = useState<'landing'|'menu'|'checkout'|'gateway'|'pay-existing'|'tracking'>('landing');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [hasUnpaidCashOrder, setHasUnpaidCashOrder] = useState(false);
  const [menuItems, setMenuItems] = useState<FoodItem[]>(WESTERN_DEMO_MENU);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Modals & States
  const [tooManyItemsModal, setTooManyItemsModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('online');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [processingPayment, setProcessingPayment] = useState(false);
  const [pendingPayExistingOrder, setPendingPayExistingOrder] = useState<MockOrder | null>(null);

  // Tracking Dashboard States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [refundResult, setRefundResult] = useState<'bank' | 'cash' | null>(null);
  
  // Checkout API & Clock states
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Absolute clock ticker (updates every second & on tab focus)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Persistence Effect
  useEffect(() => {
    const hasUnpaid = localStorage.getItem('unpaidCashOrder');
    if (hasUnpaid === 'true') {
      setHasUnpaidCashOrder(true);
    }
  }, []);

  // Live Store Status Polling Effect (every 5s)
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  useEffect(() => {
    const checkStoreStatus = async () => {
      try {
        const res = await apiClient.get<any>('/customer/store/status');
        if (res && typeof res.is_open === 'boolean') {
          setIsStoreOpen(res.is_open);
        }
      } catch (e) {
        console.warn('Store status check warning:', e);
      }
    };

    checkStoreStatus();
    const interval = setInterval(checkStoreStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch menu from backend with instant fallback
  useEffect(() => {
    const fetchMenu = async () => {
      setMenuLoading(true);
      setMenuError(null);
      try {
        const data = await apiClient.get<any[]>('/customer/menu?all_items=true');
        if (Array.isArray(data) && data.length > 0) {
          const mappedItems: FoodItem[] = data.map((item: any) => {
            let iconType = 'burger';
            try {
              if (item.description) {
                const parsed = JSON.parse(item.description);
                if (parsed && parsed.icon) {
                  iconType = parsed.icon.toLowerCase();
                }
              }
            } catch (e) {}

            return {
              id: item.id,
              name: item.name,
              price: Number(item.price),
              isSpecialty: item.category === 'Mains' || item.price > 180,
              iconType: iconType || item.name.toLowerCase(),
              inStock: item.in_stock !== false,
            };
          });
          setMenuItems(mappedItems);
        } else {
          setMenuItems(WESTERN_DEMO_MENU);
        }
      } catch (error) {
        console.warn('Backend menu fetch warning, loaded Western demo items:', error);
        setMenuItems(WESTERN_DEMO_MENU);
        setMenuError(null);
      } finally {
        setMenuLoading(false);
      }
    };

    fetchMenu();
    const menuInterval = setInterval(fetchMenu, 5000);
    return () => clearInterval(menuInterval);
  }, []);

  // Task 2: HARD-STOP Polling Effect -- Completely skips polling/timers when order is cancelled
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (view === 'tracking' && activeOrder && activeOrder.status !== 'cancelled') {
      const pollOrderStatus = async () => {
        try {
          const data = await apiClient.get<any>(`/customer/orders/${activeOrder.id}`);
          
          let clientStatus: OrderStatus = 'processing';
          if (data.status === 'READY' || data.status === 'COMPLETED') {
            clientStatus = 'ready';
          } else if (data.status === 'CANCELLED') {
            clientStatus = 'cancelled';
          }

          const updated = {
            ...activeOrder,
            status: clientStatus,
            createdAt: data.created_at || activeOrder.createdAt,
            etaMinutes: data.eta_minutes ?? activeOrder.etaMinutes ?? 5
          };

          setActiveOrder(updated);
          localStorage.setItem('activeOrder', JSON.stringify(updated));
        } catch (err) {
          console.warn('Unable to sync order status:', err);
        }
      };

      pollOrderStatus();
      interval = setInterval(pollOrderStatus, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [view, activeOrder?.id, activeOrder?.status]);

  // Robust ISO timestamp parser
  const parseTimestamp = (ts: string | number | undefined) => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    let iso = ts;
    if (typeof ts === 'string' && !ts.endsWith('Z') && !ts.includes('+') && !ts.includes(' -')) {
      iso = ts + 'Z';
    }
    const parsed = new Date(iso).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  };

  const getRemainingSeconds = () => {
    if (!activeOrder) return 0;
    const createdTimeMs = activeOrder.createdAt 
      ? parseTimestamp(activeOrder.createdAt)
      : activeOrder.orderTime;
    const etaMins = activeOrder.etaMinutes ?? 5;
    const targetTimeMs = createdTimeMs + (etaMins * 60 * 1000);
    return Math.max(0, Math.floor((targetTimeMs - now) / 1000));
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.foodItem.price * c.quantity), 0);
  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Task 1: Strict price-based limit: Total cart value strictly > ₹1000
  const isCartOverLimit = cartTotal > 1000;

  // Cart Actions
  const updateQuantity = (item: FoodItem, diff: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.foodItem.id === item.id);
      const currentQty = existing ? existing.quantity : 0;
      const newQty = currentQty + diff;
      
      if (diff > 0) {
        let projectedTotal = 0;
        let itemFound = false;
        prev.forEach(c => {
          if (c.foodItem.id === item.id) {
            projectedTotal += c.foodItem.price * newQty;
            itemFound = true;
          } else {
            projectedTotal += c.foodItem.price * c.quantity;
          }
        });
        if (!itemFound) {
          projectedTotal += item.price;
        }

        if (projectedTotal > 1000) {
          setTooManyItemsModal(true);
        }
      }

      if (newQty <= 0) {
        return prev.filter(c => c.foodItem.id !== item.id);
      }
      
      if (existing) {
        return prev.map(c => c.foodItem.id === item.id ? { ...c, quantity: newQty } : c);
      }
      return [...prev, { foodItem: item, quantity: newQty, note: '' }];
    });
  };

  const updateNote = (itemId: string, note: string) => {
    setCart(prev => prev.map(c => c.foodItem.id === itemId ? { ...c, note } : c));
  };

  const confirmOrder = async (method: 'online' | 'offline') => {
    if (!isStoreOpen) {
      setOrderError("Store is currently closed and not accepting new orders.");
      setPlacingOrder(false);
      return;
    }
    if (isCartOverLimit) return;
    setPlacingOrder(true);
    setOrderError(null);
    try {
      let sessionUuid = localStorage.getItem('session_uuid');
      if (!sessionUuid) {
        sessionUuid = crypto.randomUUID();
        localStorage.setItem('session_uuid', sessionUuid);
      }

      const payload = {
        session_uuid: sessionUuid,
        table_number: "4",
        order_type: method === 'online' ? 'ONLINE' : 'CASH',
        items: cart.map(c => ({
          menu_item_id: c.foodItem.id,
          quantity: c.quantity,
          notes: c.note || null
        })),
        special_instructions: null
      };

      const response = await apiClient.post<any>('/customer/orders', payload);

      if (method === 'online') {
        try {
          await apiClient.patch(`/customer/orders/${response.order.id}`, { status: 'PAID' }, {
            headers: { 'X-Admin-Key': 'snackflow_admin_dev_secret_2026' }
          });
        } catch (e) {
          console.warn('Auto-transition to PAID skipped:', e);
        }
      }

      const activeOrderItems = response.order.items.map((item: any) => {
        const menuItem = menuItems.find(m => m.id === item.menu_item_id);
        return {
          name: menuItem ? menuItem.name : 'Unknown Item',
          quantity: item.quantity,
          price: Number(item.unit_price),
          note: item.notes || ''
        };
      });

      const newOrder: ActiveOrder = {
        id: response.order.id,
        dailyOrderId: response.order.daily_order_id,
        items: activeOrderItems,
        total: Number(response.order.total_amount),
        paymentMode: method,
        status: 'processing',
        orderTime: Date.now(),
        createdAt: response.order.created_at,
        etaMinutes: response.order.eta_minutes || 5
      };

      if (method === 'offline') {
        localStorage.setItem('unpaidCashOrder', 'true');
        setHasUnpaidCashOrder(true);
      }
      
      localStorage.setItem('activeOrder', JSON.stringify(newOrder));
      setActiveOrder(newOrder);
      setCart([]);
      setRefundResult(null);
      setView('tracking');
    } catch (err: any) {
      console.error('Failed to create order:', err);
      setOrderError(err.message || 'Failed to place your order. Please try again.');
      throw err;
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCheckoutConfirm = () => {
    if (isCartOverLimit) return;
    if (paymentMode === 'online') {
      setView('gateway');
    } else {
      confirmOrder('offline');
    }
  };

  // Task 2: Instant Dummy Payment Resolution (No external 3rd-party gateways)
  const handleGatewayPay = async () => {
    setProcessingPayment(true);
    setOrderError(null);
    try {
      if (pendingPayExistingOrder) {
        if (pendingPayExistingOrder.id === activeOrder?.id || localStorage.getItem('unpaidCashOrder') === 'true') {
            localStorage.removeItem('unpaidCashOrder');
            setHasUnpaidCashOrder(false);
        }
        
        const newOrder: ActiveOrder = { 
          id: pendingPayExistingOrder.id,
          dailyOrderId: pendingPayExistingOrder.id,
          items: pendingPayExistingOrder.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            note: item.note || ''
          })),
          total: pendingPayExistingOrder.total,
          paymentMode: 'online', 
          status: 'ready', 
          orderTime: Date.now() 
        };
        localStorage.setItem('activeOrder', JSON.stringify(newOrder));
        setActiveOrder(newOrder);
        setRefundResult(null);
        setView('tracking');
        setPendingPayExistingOrder(null);
      } else {
        // Immediately POST order and transition to live tracking
        await confirmOrder('online');
      }
    } catch (err: any) {
      console.error('Payment processing failed:', err);
      setOrderError(err.message || 'Payment or order creation failed. Please try again.');
      setView('checkout');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelOrder = (type: 'bank' | 'cash') => {
    setRefundResult(type);
    if (activeOrder) {
      const updated = { ...activeOrder, status: 'cancelled' as OrderStatus };
      setActiveOrder(updated);
      localStorage.setItem('activeOrder', JSON.stringify(updated));
      
      if (activeOrder.paymentMode === 'offline') {
        localStorage.removeItem('unpaidCashOrder');
        setHasUnpaidCashOrder(false);
      }
    }
    setShowCancelModal(false);
  };

  // --- VIEWS ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-zinc-950 text-white border-x border-zinc-800 shadow-2xl relative overflow-x-hidden flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      
      {/* 1. LANDING PAGE */}
      {view === 'landing' && (
        <div className="flex-1 flex flex-col p-6 items-center justify-center text-center space-y-8 bg-zinc-950">
          <div className="flex flex-col items-center">
            <div className="bg-orange-600 p-5 rounded-3xl text-white mb-4 shadow-lg shadow-orange-950/50">
              <StoreLogoIcon className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">SnackFlow Bistro</h1>
            <p className="text-zinc-400 mt-2 text-sm font-medium">Western Hackathon Kitchen & Express Order Portal</p>
          </div>
          
          <div className="w-full space-y-3">
            {!isStoreOpen && (
              <div className="bg-red-950/60 border border-red-900/50 p-3 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                🔴 Store Currently Closed
              </div>
            )}
            <button 
              disabled={!isStoreOpen && (!activeOrder || activeOrder.status === 'cancelled')}
              onClick={() => {
                if (activeOrder && activeOrder.status !== 'cancelled') {
                   setView('tracking');
                } else {
                   setView('menu');
                }
              }}
              className={`w-full font-black py-4 rounded-2xl shadow-lg transition-all uppercase tracking-wider text-sm ${
                !isStoreOpen && (!activeOrder || activeOrder.status === 'cancelled')
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/60 opacity-60 shadow-none"
                  : "bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white shadow-orange-950/30"
              }`}
            >
              {!isStoreOpen && (!activeOrder || activeOrder.status === 'cancelled')
                ? 'Store Currently Closed'
                : (activeOrder && activeOrder.status !== 'cancelled' ? 'Return to Active Order' : 'Order Food Now')}
            </button>
            <button 
              onClick={() => setView('pay-existing')}
              className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-3.5 rounded-2xl shadow-sm transition-all text-sm uppercase tracking-wider"
            >
              Pay for Existing Order
            </button>
          </div>
        </div>
      )}

      {/* 2. MENU PAGE */}
      {view === 'menu' && (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 relative">
          {!isStoreOpen ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-950">
              <div className="text-6xl mb-6 animate-bounce">🌙</div>
              <h2 className="text-3xl font-black text-white mb-3 tracking-tight uppercase">Store Currently Closed</h2>
              <p className="text-zinc-400 mb-8 text-sm max-w-xs leading-relaxed font-medium">
                We are currently not accepting new orders. Please check back with our staff during operating hours.
              </p>
              <button onClick={() => setView('landing')} className="text-orange-400 font-bold border-b border-orange-400 pb-0.5 text-sm uppercase tracking-wider">
                Go Back Home
              </button>
            </div>
          ) : (
            <>
              <header className="bg-zinc-900 border-b border-zinc-800 p-3.5 sticky top-0 z-20 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('landing')} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="bg-orange-600 p-1.5 rounded-lg text-white">
                    <StoreLogoIcon className="w-4 h-4" />
                  </div>
                  <h1 className="text-base font-extrabold text-white tracking-tight uppercase">SnackFlow Express</h1>
                </div>
                <div className="text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 font-bold px-2 py-1 rounded uppercase">
                  Kitchen Online
                </div>
              </header>
              
              <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-3">
                {menuItems.map(item => {
                  const isOut = item.inStock === false;
                  const cartItem = cart.find(c => c.foodItem.id === item.id);
                  const qty = cartItem ? cartItem.quantity : 0;
                  const note = cartItem ? cartItem.note : '';
                  return (
                    <div key={item.id} className={`bg-zinc-900 rounded-2xl border border-zinc-800/80 p-4 shadow-lg transition-all ${
                      isOut ? "opacity-50 bg-zinc-950/40 border-zinc-800" : "hover:border-zinc-700"
                    }`}>
                      <div className="flex gap-3.5">
                        <div className={`p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 shrink-0 self-start w-16 h-16 flex items-center justify-center ${
                          isOut ? "text-zinc-600" : "text-orange-400"
                        }`}>
                          <IconResolver type={item.iconType} className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className={`font-extrabold leading-tight text-base ${isOut ? "text-zinc-500 line-through" : "text-white"}`}>{item.name}</h3>
                            {isOut ? (
                              <span className="bg-red-950/80 text-red-400 border border-red-900/50 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                Out of Stock
                              </span>
                            ) : item.isSpecialty && (
                              <span className="bg-orange-950/60 text-orange-400 border border-orange-900/40 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                Chef Choice
                              </span>
                            )}
                          </div>
                          <div className={`font-mono font-black mt-1 text-base ${isOut ? "text-zinc-600" : "text-orange-400"}`}>₹{item.price}</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-col gap-2">
                        {qty > 0 && !isOut && (
                          <input 
                            type="text" 
                            maxLength={50}
                            placeholder="Special instructions (e.g. extra sauce)" 
                            value={note}
                            onChange={(e) => updateNote(item.id, e.target.value)}
                            className="w-full text-xs border border-zinc-800 rounded-xl px-3 py-2 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        )}
                        <div className="flex justify-end items-center gap-2">
                          {isOut ? (
                            <button 
                              disabled={true}
                              className="bg-zinc-800/80 text-zinc-500 border border-zinc-700/50 text-xs font-bold px-4 py-2 rounded-xl uppercase tracking-wider cursor-not-allowed pointer-events-none"
                            >
                              Out of Stock
                            </button>
                          ) : qty > 0 ? (
                            <div className="flex items-center gap-3 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                              <button onClick={() => updateQuantity(item, -1)} className="bg-zinc-900 hover:bg-zinc-800 text-white w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-colors">-</button>
                              <span className="font-mono font-bold w-5 text-center text-white text-sm">{qty}</span>
                              <button onClick={() => updateQuantity(item, 1)} className="bg-orange-600 hover:bg-orange-500 text-white w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-colors">+</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => updateQuantity(item, 1)} 
                              className="bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 text-xs font-bold px-4 py-2 rounded-xl transition-all uppercase tracking-wider"
                            >
                              Add +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sticky Cart Footer with Task 1 Strict Checkout Disabling */}
              {cartItemCount > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 pb-6 shadow-2xl z-30">
                  <div className="flex justify-between items-center mb-3 px-1 text-sm font-mono">
                    <span className="text-zinc-400 font-medium">{cartItemCount} items selected</span>
                    <span className="text-lg font-black text-orange-400 bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-lg">₹{cartTotal}</span>
                  </div>

                  {/* Warning banner when price limit (> ₹1000) exceeded */}
                  {isCartOverLimit && (
                    <div className="mb-3 p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2 font-medium">
                      <AlertCircle size={16} className="shrink-0 text-red-400" />
                      <span>Order total exceeds ₹1000 (Current: ₹{cartTotal}). Reduce items to checkout.</span>
                    </div>
                  )}

                  {/* Task 1: Strictly Disabled Checkout Button when isCartOverLimit */}
                  <button 
                    disabled={isCartOverLimit}
                    onClick={() => {
                      if (!isCartOverLimit) {
                        if (hasUnpaidCashOrder) setPaymentMode('online');
                        setView('checkout');
                      }
                    }}
                    className={`w-full font-black py-4 rounded-2xl flex items-center justify-center shadow-lg transition-all text-sm uppercase tracking-wider ${
                      isCartOverLimit 
                        ? "bg-zinc-800 text-zinc-500 border border-zinc-700/60 opacity-50 cursor-not-allowed pointer-events-none shadow-none" 
                        : "bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white active:scale-95"
                    }`}
                  >
                    {isCartOverLimit ? "Reduce Total to Checkout" : "Proceed to Checkout"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* High-Volume Order Intercept Modal */}
          {tooManyItemsModal && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center w-full max-w-sm">
                <div className="text-4xl mb-3 animate-bounce">🎉</div>
                <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">Large Order Notice</h3>
                <p className="text-zinc-300 mb-6 leading-relaxed text-sm">
                  That’s a large order! To make sure we prepare it as fast as possible, please place this order directly with our team at the counter.
                </p>
                <button 
                  onClick={() => setTooManyItemsModal(false)} 
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg text-sm uppercase tracking-wider transition-all"
                >
                  Understood
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CHECKOUT PAGE */}
      {view === 'checkout' && (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 relative">
          <header className="p-3.5 border-b border-zinc-800 bg-zinc-900 flex items-center gap-3">
            <button onClick={() => setView('menu')} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-base font-extrabold text-white uppercase tracking-tight">Order Checkout</h2>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <h3 className="font-black text-zinc-300 mb-3 uppercase tracking-wider text-xs">Order Summary</h3>
              <div className="space-y-3 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                {cart.map(c => (
                  <div key={c.foodItem.id} className="flex justify-between items-start text-sm">
                    <div className="flex-1 pr-3">
                      <span className="font-bold text-white">{c.quantity}x {c.foodItem.name}</span>
                      {c.note && <div className="text-zinc-400 text-xs mt-0.5 italic">Note: {c.note}</div>}
                    </div>
                    <span className="font-mono font-bold text-orange-400">₹{c.foodItem.price * c.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-2 pt-3 border-t border-zinc-800 font-mono">
                  <span className="font-bold text-zinc-400 uppercase tracking-widest text-xs">Total</span>
                  <span className="text-xl font-black text-orange-400">₹{cartTotal}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-black text-zinc-300 mb-3 uppercase tracking-wider text-xs">Payment Method</h3>
              <div className="space-y-3">
                <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                  paymentMode === 'online' ? 'border-orange-500 bg-zinc-900 ring-1 ring-orange-500' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}>
                  <input type="radio" name="payment" checked={paymentMode === 'online'} onChange={() => setPaymentMode('online')} className="sr-only" />
                  <div className={`p-2.5 rounded-xl mr-3.5 ${paymentMode === 'online' ? 'bg-orange-950 text-orange-400 border border-orange-900/40' : 'bg-zinc-800 text-zinc-400'}`}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Pay Online Now</div>
                    <div className="text-xs text-zinc-400 mt-0.5">Instant Digital Payment</div>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-2xl transition-all ${
                  hasUnpaidCashOrder ? 'opacity-40 cursor-not-allowed bg-zinc-950 border-zinc-900' : 'cursor-pointer hover:border-zinc-700'
                } ${paymentMode === 'offline' ? 'border-orange-500 bg-zinc-900 ring-1 ring-orange-500' : 'border-zinc-800 bg-zinc-900/50'}`}>
                  <input type="radio" name="payment" disabled={hasUnpaidCashOrder} checked={paymentMode === 'offline'} onChange={() => setPaymentMode('offline')} className="sr-only" />
                  <div className={`p-2.5 rounded-xl mr-3.5 ${paymentMode === 'offline' ? 'bg-orange-950 text-orange-400 border border-orange-900/40' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Banknote size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Pay with Cash at Counter</div>
                    <div className="text-xs text-zinc-400 mt-0.5">Pay upon pickup</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 pb-6 space-y-3 bg-zinc-900">
            {!isStoreOpen && (
              <div className="p-3 bg-red-950/60 border border-red-900/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>Store is currently closed. New orders cannot be placed right now.</span>
              </div>
            )}

            {orderError && (
              <div className="p-3 bg-red-950/60 border border-red-900/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>{orderError}</span>
              </div>
            )}
            
            <button 
              onClick={handleCheckoutConfirm} 
              disabled={placingOrder || isCartOverLimit || !isStoreOpen}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {placingOrder && <Loader2 className="animate-spin w-5 h-5" />}
              {!isStoreOpen ? 'Store Currently Closed' : (placingOrder ? 'Processing Order...' : (paymentMode === 'online' ? 'Proceed to Secure Payment' : 'Confirm Order'))}
            </button>
          </div>
        </div>
      )}

      {/* 4. PAYMENT GATEWAY */}
      {view === 'gateway' && (
        <div className="flex-1 flex flex-col bg-zinc-950 relative">
          <header className="p-3.5 border-b border-zinc-800 bg-zinc-900 flex items-center gap-3">
             <button disabled={processingPayment} onClick={() => setView(pendingPayExistingOrder ? 'pay-existing' : 'checkout')} className="p-1.5 text-zinc-400 hover:text-white">
               <ArrowLeft size={20} />
             </button>
             <h2 className="text-base font-extrabold text-white uppercase tracking-tight">Digital Gateway</h2>
          </header>
          
          <div className="p-5 space-y-6">
             <div className="text-center mb-8 mt-4">
               <p className="text-zinc-400 uppercase tracking-widest text-xs font-bold mb-2">Amount to pay</p>
               <div className="text-4xl font-black text-orange-400 bg-zinc-900 border border-zinc-800 inline-block px-5 py-2 rounded-2xl shadow-inner font-mono">
                 ₹{pendingPayExistingOrder ? pendingPayExistingOrder.total : cartTotal}
               </div>
             </div>

             <div className="space-y-3">
                <button onClick={handleGatewayPay} className="w-full flex items-center p-4 border border-zinc-800 bg-zinc-900 hover:border-orange-500 rounded-2xl transition-all gap-3 text-left">
                   <div className="bg-orange-600/20 text-orange-400 border border-orange-500/30 w-9 h-9 rounded-xl font-black flex items-center justify-center text-base shadow-sm shrink-0">
                     <QrCode size={18} />
                   </div>
                   <div>
                     <div className="font-bold text-white text-base">UPI</div>
                     <div className="text-xs text-zinc-400 font-medium">Instant Digital Payment</div>
                   </div>
                </button>
                <button onClick={handleGatewayPay} className="w-full flex items-center p-4 border border-zinc-800 bg-zinc-900 hover:border-orange-500 transition-all gap-3 text-left">
                   <div className="bg-zinc-800 text-zinc-300 w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><CreditCard size={18} /></div>
                   <div>
                     <div className="font-bold text-white text-base">Credit / Debit Card</div>
                     <div className="text-xs text-zinc-400 font-medium">Standard Bank Cards</div>
                   </div>
                </button>
              </div>
          </div>

          {processingPayment && (
            <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
               <div className="w-12 h-12 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin mb-4"></div>
               <h3 className="text-xl font-extrabold text-white mb-2">Redirecting to UPI...</h3>
               <p className="text-zinc-400 text-sm">Please do not close this window.</p>
            </div>
          )}
        </div>
      )}

      {/* 5. PAY EXISTING ORDER */}
      {view === 'pay-existing' && (
        <div className="flex-1 flex flex-col bg-zinc-950">
          <header className="p-3.5 border-b border-zinc-800 bg-zinc-900 flex items-center gap-3">
             <button onClick={() => setView('landing')} className="p-1.5 text-zinc-400 hover:text-white">
               <ArrowLeft size={20} />
             </button>
             <h2 className="text-base font-extrabold text-white uppercase tracking-tight">Pay Existing Order</h2>
          </header>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
             {fetchAllMockOrders().map((order) => (
               <div key={order.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-lg">
                 <div className="flex justify-between items-center mb-3">
                   <div>
                     <h3 className="font-black text-white text-lg font-mono">Order {order.id}</h3>
                     <p className="text-sm font-bold text-orange-400 font-mono">₹{order.total}</p>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} 
                       className="bg-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-xl hover:bg-zinc-700 transition-colors text-xs uppercase"
                     >
                       {expandedOrderId === order.id ? 'Hide' : 'Details'}
                     </button>
                     <button 
                       onClick={() => { setPendingPayExistingOrder(order); setView('gateway'); }} 
                       className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-1.5 rounded-xl transition-colors shadow-sm text-xs uppercase"
                     >
                       Pay
                     </button>
                   </div>
                 </div>
                 
                 {expandedOrderId === order.id && (
                   <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 mt-2 space-y-2">
                     <h4 className="font-bold text-zinc-400 text-[10px] border-b border-zinc-800 pb-1.5 mb-2 uppercase tracking-widest">Bill Details</h4>
                     {order.items.map((item, i) => (
                       <div key={i} className="flex justify-between text-xs font-mono">
                         <span className="text-zinc-300">{item.quantity}x {item.name}</span>
                         <span className="text-white font-bold">₹{item.price * item.quantity}</span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>
      )}

      {/* 6. ORDER TRACKING & REFUND GUIDE PAGE */}
      {view === 'tracking' && activeOrder && (
        <div className="flex-1 flex flex-col relative bg-zinc-950">
          <header className="p-3.5 border-b border-zinc-800 bg-zinc-900 flex items-center gap-3">
             <button onClick={() => setView('landing')} className="p-1.5 text-zinc-400 hover:text-white">
               <ArrowLeft size={20} />
             </button>
             <h2 className="text-base font-extrabold text-white uppercase tracking-tight">
               {activeOrder.status === 'cancelled' ? 'Refund Guide' : 'Live Status'}
             </h2>
          </header>

          <div className="p-4 flex-1 overflow-y-auto pb-6">
            {activeOrder.status === 'cancelled' ? (
               <div className="flex-1 flex flex-col items-center justify-center pt-6 text-center">
                 <div className="w-16 h-16 bg-red-950/60 text-red-400 border border-red-900/50 rounded-full flex items-center justify-center mb-4">
                   <AlertCircle size={32} />
                 </div>
                 <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Order Cancelled</h2>
                 
                 {/* Task 2: HARD-STOP Refund Guide Screen -- Stays indefinitely until user clicks BACK TO HOME */}
                 {refundResult === 'cash' && (
                   <div className="bg-zinc-900 border border-orange-500/40 p-4 rounded-2xl text-orange-300 font-medium mb-6 text-sm text-left shadow-lg leading-relaxed">
                     As you requested a cash order, please go to the counter and say: "Hi, this is my order ID {activeOrder.dailyOrderId} for the amount of ₹{activeOrder.total}, I need a cash refund. Can you process it?"
                   </div>
                 )}
                 {refundResult === 'bank' && (
                   <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-zinc-300 font-medium mb-6 text-sm text-left shadow-md leading-relaxed">
                     Your online refund request for Order ID <span className="text-white font-bold">{activeOrder.dailyOrderId}</span> (₹{activeOrder.total}) has been initiated. Funds will return to your account within 3-5 business days.
                   </div>
                 )}
                 
                 <button 
                   onClick={() => { 
                     localStorage.removeItem('activeOrder'); 
                     setActiveOrder(null); 
                     setView('landing'); 
                   }} 
                   className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-black py-4 px-8 rounded-2xl shadow-lg w-full text-sm uppercase tracking-wider transition-all"
                 >
                   BACK TO HOME
                 </button>
               </div>
            ) : (
              <div>
                <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-6 text-center shadow-xl relative overflow-hidden mb-5">
                   <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs mb-1">Order Ticket</p>
                   <h1 className="text-6xl font-black font-mono tracking-tighter text-orange-400 mb-4">{activeOrder.dailyOrderId}</h1>
                   
                   <p className="text-xs text-zinc-400 font-medium">Placed at {new Date(activeOrder.orderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center mb-6 shadow-md">
                  {activeOrder.status === 'processing' ? (
                     <div>
                        <Clock size={36} className="text-orange-400 mx-auto mb-3 animate-pulse" />
                        <h3 className="text-lg font-black text-white mb-1">Kitchen is preparing your order...</h3>
                        <p className="text-zinc-400 text-xs font-medium mb-3 uppercase tracking-wider">Estimated Time Remaining</p>
                        <div className="text-4xl font-black text-orange-400 font-mono tracking-tight">
                          {Math.floor(getRemainingSeconds() / 60)}:{String(getRemainingSeconds() % 60).padStart(2, '0')} <span className="text-sm text-zinc-500 font-bold font-sans uppercase">Mins</span>
                        </div>
                     </div>
                  ) : (
                     <div className="animate-bounce">
                        <CheckCircle2 size={44} className="text-emerald-400 mx-auto mb-3" />
                        <h3 className="text-xl font-black text-white mb-1">Order {activeOrder.dailyOrderId} is Ready!</h3>
                        <p className="text-emerald-400 font-bold text-sm">Please pickup your order at the counter.</p>
                     </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => { localStorage.removeItem('activeOrder'); setActiveOrder(null); setView('landing'); }} 
                    className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl transition-colors text-sm border border-zinc-800 uppercase tracking-wider"
                  >
                    Place a New Order
                  </button>

                  {activeOrder.status === 'processing' && (
                    <button 
                      onClick={() => setShowCancelModal(true)} 
                      className="w-full py-3 text-zinc-500 hover:text-zinc-300 font-bold text-xs uppercase tracking-wider"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cancel Modal Overlay */}
          {showCancelModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center">
              <div className="bg-zinc-900 border-t border-zinc-800 w-full rounded-t-3xl shadow-2xl p-6">
                <h3 className="text-xl font-black text-white mb-2">Cancel Order?</h3>
                <p className="text-zinc-400 mb-6 text-sm">How would you like to process your refund for <span className="font-bold text-white font-mono">₹{activeOrder.total}</span>?</p>
                
                <div className="space-y-3 mb-5">
                   {activeOrder.paymentMode === 'online' && (
                     <button 
                       onClick={() => handleCancelOrder('bank')} 
                       className="w-full flex justify-between items-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl font-bold text-white hover:border-zinc-700 transition-colors text-sm"
                     >
                       Refund to My Bank <ArrowLeft size={16} className="text-zinc-500 transform rotate-180" />
                     </button>
                   )}
                   <button 
                     onClick={() => handleCancelOrder('cash')} 
                     className="w-full flex justify-between items-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl font-bold text-white hover:border-zinc-700 transition-colors text-sm"
                   >
                     Get Cash at Counter <ArrowLeft size={16} className="text-zinc-500 transform rotate-180" />
                   </button>
                </div>
                
                <button 
                  onClick={() => setShowCancelModal(false)} 
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl transition-colors text-xs uppercase tracking-wider"
                >
                  Keep Order
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
