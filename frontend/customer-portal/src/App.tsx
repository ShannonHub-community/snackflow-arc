import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, AlertCircle, CreditCard, Banknote, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { generateShortId, simulatePhonePeRedirect, isStoreOpen, fetchMockOrder, fetchAllMockOrders, MockOrder } from './mockPaymentServices';

// --- TYPES ---
export type OrderStatus = 'processing' | 'ready' | 'cancelled';
export type PaymentMethod = 'online' | 'offline';

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  isSpecialty: boolean;
  iconType: string;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
  note: string;
}

export interface ActiveOrder {
  id: string;
  items: { name: string; quantity: number; price: number; note?: string }[];
  total: number;
  paymentMode: PaymentMethod;
  status: OrderStatus;
  orderTime: number; 
}

// --- CONSTANTS ---
const MENU_ITEMS: FoodItem[] = [
  { id: '1', name: 'Classic Bombay Burger', price: 199, isSpecialty: true, iconType: 'burger' },
  { id: '2', name: 'Masala Fries', price: 99, isSpecialty: false, iconType: 'fries' },
  { id: '3', name: 'Iced Cardamom Latte', price: 149, isSpecialty: true, iconType: 'latte' },
  { id: '4', name: 'Paneer Tikka Salad', price: 179, isSpecialty: false, iconType: 'salad' },
];

// --- ICONS ---
const StoreLogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
  </svg>
);

const BurgerIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-gray-900">
    <path d="M6 14C6 8 10 4 16 4C22 4 26 8 26 14H6Z" />
    <path d="M5 16C7 15 9 17 11 16C13 15 15 17 17 16C19 15 21 17 23 16C25 15 27 17 29 16" />
    <rect x="5" y="18" width="22" height="4" rx="2" />
    <path d="M6 24H26C26 26 22 28 16 28C10 28 6 26 6 24Z" />
    <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    <circle cx="16" cy="7" r="0.5" fill="currentColor" />
    <circle cx="20" cy="9" r="0.5" fill="currentColor" />
  </svg>
);

const IcedLatteIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-gray-900">
    <path d="M8 10L10 26C10 27.1 10.9 28 12 28H20C21.1 28 22 27.1 22 26L24 10" />
    <path d="M6 10H26" />
    <path d="M8 7H24L26 10H6L8 7Z" />
    <path d="M18 7V2L22 2" />
    <rect x="12" y="14" width="4" height="4" />
    <rect x="17" y="18" width="3" height="3" />
    <rect x="13" y="22" width="4" height="4" />
  </svg>
);

const FriesIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-gray-900">
    <path d="M8 16L10 28C10 29.1 10.9 30 12 30H20C21.1 30 22 29.1 22 28L24 16H8Z" />
    <path d="M12 16V6" />
    <path d="M16 16V4" />
    <path d="M20 16V8" />
    <path d="M10 16L8 8" />
    <path d="M22 16L24 10" />
  </svg>
);

const SaladIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-gray-900">
    <path d="M4 16C4 22 9 26 16 26C23 26 28 22 28 16" />
    <path d="M2 16H30" />
    <path d="M16 16C16 10 12 6 8 8C10 12 14 14 16 16Z" />
    <path d="M16 16C16 8 20 5 24 7C22 11 18 13 16 16Z" />
    <path d="M8 16C8 12 5 10 3 12C5 14 6 15 8 16Z" />
  </svg>
);

const IconResolver = ({type}: {type: string}) => {
  if (type === 'burger') return <BurgerIcon />;
  if (type === 'latte') return <IcedLatteIcon />;
  if (type === 'fries') return <FriesIcon />;
  if (type === 'salad') return <SaladIcon />;
  return <BurgerIcon />;
};

// --- APP COMPONENT ---
export default function App() {
  const [view, setView] = useState<'landing'|'menu'|'checkout'|'gateway'|'pay-existing'|'tracking'>('landing');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [hasUnpaidCashOrder, setHasUnpaidCashOrder] = useState(false);
  
  // Modals & States
  const [tooManyItemsModal, setTooManyItemsModal] = useState(false);
  
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('online');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [processingPayment, setProcessingPayment] = useState(false);
  const [pendingPayExistingOrder, setPendingPayExistingOrder] = useState<MockOrder | null>(null);

  // Tracking Dashboard States
  const [timeLeft, setTimeLeft] = useState(5);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [refundResult, setRefundResult] = useState<'bank' | 'cash' | null>(null);

  // Persistence Effect
  useEffect(() => {
    // Session lock disabled for testing phase
    /*
    const savedActive = localStorage.getItem('activeOrder');
    if (savedActive) {
      const parsed = JSON.parse(savedActive);
      setActiveOrder(parsed);
      if (parsed.status !== 'cancelled') {
        setView('tracking');
      }
    }
    */
    const hasUnpaid = localStorage.getItem('unpaidCashOrder');
    if (hasUnpaid === 'true') {
      setHasUnpaidCashOrder(true);
    }
  }, []);

  // Tracking Timer Effect
  useEffect(() => {
    if (view === 'tracking' && activeOrder && activeOrder.status === 'processing') {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeOrder.orderTime) / 1000);
        const remaining = Math.max(5 - elapsed, 0);
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
           const updated = { ...activeOrder, status: 'ready' as OrderStatus };
           setActiveOrder(updated);
           localStorage.setItem('activeOrder', JSON.stringify(updated));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [view, activeOrder]);

  const cartTotal = cart.reduce((sum, c) => sum + (c.foodItem.price * c.quantity), 0);
  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Cart Actions
  const updateQuantity = (item: FoodItem, diff: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.foodItem.id === item.id);
      const currentQty = existing ? existing.quantity : 0;
      const newQty = currentQty + diff;
      
      if (diff > 0) {
        const totalCount = prev.reduce((sum, c) => sum + c.quantity, 0);
        if (totalCount >= 10) {
          setTooManyItemsModal(true);
          return prev;
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

  const confirmOrder = (method: 'online' | 'offline') => {
    const formattedItems = cart.map(c => ({
      name: c.foodItem.name,
      quantity: c.quantity,
      price: c.foodItem.price,
      note: c.note
    }));

    const newOrder: ActiveOrder = {
      id: generateShortId(),
      items: formattedItems,
      total: cartTotal,
      paymentMode: method,
      status: 'processing',
      orderTime: Date.now()
    };

    if (method === 'offline') {
      localStorage.setItem('unpaidCashOrder', 'true');
      setHasUnpaidCashOrder(true);
    }
    
    localStorage.setItem('activeOrder', JSON.stringify(newOrder));
    setActiveOrder(newOrder);
    setCart([]);
    setRefundResult(null);
    setTimeLeft(5);
    setView('tracking');
  };

  const handleCheckoutConfirm = () => {
    if (paymentMode === 'online') {
      setView('gateway');
    } else {
      confirmOrder('offline');
    }
  };

  const handleGatewayPay = async () => {
    setProcessingPayment(true);
    await simulatePhonePeRedirect();
    setProcessingPayment(false);
    
    if (pendingPayExistingOrder) {
      if (pendingPayExistingOrder.id === activeOrder?.id || localStorage.getItem('unpaidCashOrder') === 'true') {
          localStorage.removeItem('unpaidCashOrder');
          setHasUnpaidCashOrder(false);
      }
      
      const newOrder: ActiveOrder = { 
        ...pendingPayExistingOrder, 
        paymentMode: 'online', 
        status: 'ready', 
        orderTime: Date.now() 
      };
      localStorage.setItem('activeOrder', JSON.stringify(newOrder));
      setActiveOrder(newOrder);
      setRefundResult(null);
      setTimeLeft(0);
      setView('tracking');
      setPendingPayExistingOrder(null);
    } else {
      confirmOrder('online');
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
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 border-x border-gray-200 shadow-2xl relative overflow-x-hidden flex flex-col font-sans">
      
      {/* 1. LANDING PAGE */}
      {view === 'landing' && (
        <div className="flex-1 flex flex-col p-4 items-center justify-center text-center space-y-8">
          <div className="flex flex-col items-center">
            <div className="bg-red-600 p-4 rounded-3xl text-white mb-4 shadow-xl">
              <StoreLogoIcon className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">The Bombay Bistro</h1>
            <p className="text-gray-500 mt-2 text-base">Modern Western Cafe with an Indian Soul</p>
          </div>
          
          <div className="w-full space-y-3">
            <button 
              onClick={() => {
                if (activeOrder && activeOrder.status !== 'cancelled') {
                   setView('tracking');
                } else {
                   setView('menu');
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl shadow-md transition-transform active:scale-95 text-base"
            >
              {activeOrder && activeOrder.status !== 'cancelled' ? 'Return to Active Order' : 'Place New Order'}
            </button>
            <button 
              onClick={() => {
                setView('pay-existing');
              }}
              className="w-full bg-white border-2 border-gray-200 text-gray-900 font-bold py-3 rounded-2xl shadow-sm hover:bg-gray-50 transition-transform active:scale-95 text-base"
            >
              Pay for Existing Order
            </button>
          </div>
        </div>
      )}

      {/* 2. MENU PAGE */}
      {view === 'menu' && (
        <div className="flex-1 flex flex-col h-full bg-gray-50 relative">
          {!isStoreOpen ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="text-5xl mb-6">🌙</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Store is Closed</h2>
              <p className="text-gray-500 mb-8">Sorry, we are currently closed. Our hours are 9:00 AM - 9:00 PM.</p>
              <button onClick={() => setView('landing')} className="text-red-600 font-bold border-b-2 border-red-600">Go Back Home</button>
            </div>
          ) : (
            <>
              <header className="bg-white border-b border-gray-200 p-3 sticky top-0 z-20 shadow-sm flex items-center gap-3">
                <button onClick={() => setView('landing')} className="p-1"><ArrowLeft size={24} className="text-gray-600" /></button>
                <div className="bg-red-600 p-1.5 rounded-lg text-white">
                  <StoreLogoIcon className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-gray-900 tracking-tight">The Bombay Bistro</h1>
              </header>
              
              <div className="flex-1 overflow-y-auto p-3 pb-24 space-y-3">
                {MENU_ITEMS.map(item => {
                  const cartItem = cart.find(c => c.foodItem.id === item.id);
                  const qty = cartItem ? cartItem.quantity : 0;
                  const note = cartItem ? cartItem.note : '';
                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                      <div className="flex gap-3">
                        <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 shrink-0 self-start w-16 h-16">
                            <IconResolver type={item.iconType} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 leading-tight text-sm">{item.name}</h3>
                            {item.isSpecialty && <span className="bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest mt-1 inline-block">Bestseller</span>}
                            <div className="font-black text-gray-900 mt-1.5 text-sm">₹{item.price}</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-col gap-2">
                        {qty > 0 && (
                          <input 
                            type="text" 
                            maxLength={50}
                            placeholder="Add note (e.g. extra chutney)" 
                            value={note}
                            onChange={(e) => updateNote(item.id, e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-gray-900 placeholder:text-gray-400"
                          />
                        )}
                        <div className="flex justify-end items-center gap-2">
                            {qty > 0 ? (
                              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <button onClick={() => updateQuantity(item, -1)} className="bg-white p-1.5 rounded-lg shadow-sm text-gray-900 w-7 h-7 flex items-center justify-center">-</button>
                                <span className="font-bold w-5 text-center text-gray-900 text-sm">{qty}</span>
                                <button onClick={() => updateQuantity(item, 1)} className="bg-red-600 p-1.5 rounded-lg shadow-sm text-white w-7 h-7 flex items-center justify-center">+</button>
                              </div>
                            ) : (
                              <button onClick={() => updateQuantity(item, 1)} className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-red-100">Add +</button>
                            )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {cartItemCount > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-4 shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.1)] z-30">
                  <div className="flex justify-between items-center mb-3 px-1 text-sm">
                    <span className="text-gray-500 font-medium">{cartItemCount} items in cart</span>
                    <span className="text-lg font-black text-gray-900 bg-yellow-400 px-2 py-0.5 rounded-md">₹{cartTotal}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (hasUnpaidCashOrder) setPaymentMode('online');
                      setView('checkout');
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform text-base"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </>
          )}

          {/* Polite Threshold Intercept Modal */}
          {tooManyItemsModal && (
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 shadow-2xl text-center w-full">
                <div className="text-4xl mb-4 animate-bounce">🎉</div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">Wow, that’s a big order!</h3>
                <p className="text-gray-500 mb-6 leading-relaxed text-sm">To ensure we prepare your group's food perfectly, please place this order directly with our counter staff.</p>
                <button onClick={() => setTooManyItemsModal(false)} className="w-full bg-red-600 text-white font-bold py-3 rounded-2xl shadow-md text-base">Got it</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PAYMENT OPTION PAGE */}
      {view === 'checkout' && (
        <div className="flex-1 flex flex-col h-full bg-white relative">
          <header className="p-3 border-b border-gray-100 flex items-center gap-3">
            <button onClick={() => setView('menu')} className="p-1"><ArrowLeft size={24} className="text-gray-600" /></button>
            <h2 className="text-base font-bold text-gray-900">Checkout</h2>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
               <h3 className="font-extrabold text-gray-900 mb-3 tracking-tight text-lg">Order Summary</h3>
               <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 {cart.map(c => (
                   <div key={c.foodItem.id} className="flex justify-between items-start text-sm">
                     <div className="flex-1 pr-3">
                       <span className="font-bold text-gray-900">{c.quantity}x {c.foodItem.name}</span>
                       {c.note && <div className="text-gray-500 text-xs mt-1 italic leading-tight">Note: {c.note}</div>}
                     </div>
                     <span className="font-bold text-gray-900">₹{c.foodItem.price * c.quantity}</span>
                   </div>
                 ))}
                 <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-200">
                    <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">Total</span>
                    <span className="text-xl font-black text-gray-900">₹{cartTotal}</span>
                 </div>
               </div>
            </div>

            <div>
              <h3 className="font-extrabold text-gray-900 mb-3 tracking-tight text-lg">Payment Method</h3>
              <div className="space-y-3">
                <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMode === 'online' ? 'border-red-600 bg-red-50' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" checked={paymentMode === 'online'} onChange={() => setPaymentMode('online')} className="sr-only" />
                  <div className={`p-2 rounded-full mr-3 ${paymentMode === 'online' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Pay Online Now</div>
                    <div className="text-xs text-gray-500 mt-0.5">Secure UPI / Cards</div>
                  </div>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-2xl transition-colors ${hasUnpaidCashOrder ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' : 'cursor-pointer hover:border-gray-300'} ${paymentMode === 'offline' ? 'border-red-600 bg-red-50' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" disabled={hasUnpaidCashOrder} checked={paymentMode === 'offline'} onChange={() => setPaymentMode('offline')} className="sr-only" />
                  <div className={`p-2 rounded-full mr-3 ${paymentMode === 'offline' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Banknote size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Pay with Cash at Counter</div>
                    <div className="text-xs text-gray-500 mt-0.5">Pay when you pick up</div>
                  </div>
                </label>
                {hasUnpaidCashOrder && (
                  <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl text-xs flex items-start gap-2 mt-2 border border-yellow-100">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>You have an active unpaid cash order. Please pay online for this order.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 pb-6">
            <button onClick={handleCheckoutConfirm} className="w-full bg-red-600 text-white font-bold py-3 rounded-2xl shadow-lg active:scale-95 transition-transform text-base">
              {paymentMode === 'online' ? 'Proceed to Secure Payment' : 'Confirm Order'}
            </button>
          </div>
        </div>
      )}

      {/* 4. PAYMENT GATEWAY INTERFERENCE */}
      {view === 'gateway' && (
        <div className="flex-1 flex flex-col bg-white relative">
          <header className="p-3 border-b border-gray-100 flex items-center gap-3">
             <button disabled={processingPayment} onClick={() => setView(pendingPayExistingOrder ? 'pay-existing' : 'checkout')} className="p-1"><ArrowLeft size={24} className="text-gray-600" /></button>
             <h2 className="text-base font-bold text-gray-900">Secure Payment</h2>
          </header>
          
          <div className="p-4 space-y-6">
             <div className="text-center mb-8 mt-4">
               <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-2">Amount to pay</p>
               <div className="text-4xl font-black text-gray-900 bg-yellow-400 inline-block px-4 py-1 rounded-xl shadow-sm">₹{pendingPayExistingOrder ? pendingPayExistingOrder.total : cartTotal}</div>
             </div>

             <div className="space-y-3">
               <button onClick={handleGatewayPay} className="w-full flex items-center p-4 border-2 border-gray-200 rounded-2xl hover:border-purple-600 hover:bg-purple-50 transition-colors gap-3">
                  <div className="bg-purple-600 text-white w-8 h-8 rounded-full font-black flex items-center justify-center text-base shadow-sm shrink-0">Pê</div>
                  <span className="font-bold text-gray-900 text-base">PhonePe / UPI</span>
               </button>
               <button onClick={handleGatewayPay} className="w-full flex items-center p-4 border-2 border-gray-200 rounded-2xl hover:border-gray-300 transition-colors gap-3">
                  <div className="bg-gray-100 text-gray-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0"><CreditCard size={16} /></div>
                  <span className="font-bold text-gray-900 text-base">Credit / Debit Card</span>
               </button>
             </div>
          </div>

          {processingPayment && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
               <div className="w-12 h-12 border-4 border-gray-100 border-t-red-600 rounded-full animate-spin mb-4"></div>
               <h3 className="text-xl font-extrabold text-gray-900 mb-2">Redirecting to PhonePe...</h3>
               <p className="text-gray-500 text-base">Please do not close this window.</p>
            </div>
          )}
        </div>
      )}

      {/* 5. QUICK PAY GATE PAGE */}
      {view === 'pay-existing' && (
        <div className="flex-1 flex flex-col bg-gray-50">
          <header className="p-3 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm">
             <button onClick={() => setView('landing')} className="p-1"><ArrowLeft size={24} className="text-gray-600" /></button>
             <h2 className="text-base font-bold text-gray-900">Pay Existing Order</h2>
          </header>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
             {fetchAllMockOrders().map((order) => (
               <div key={order.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                 <div className="flex justify-between items-center mb-4">
                   <div>
                     <h3 className="font-extrabold text-gray-900 text-lg">Order {order.id}</h3>
                     <p className="text-sm font-bold text-gray-500">₹{order.total}</p>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} 
                       className="bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                     >
                       {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                     </button>
                     <button 
                       onClick={() => { setPendingPayExistingOrder(order); setView('gateway'); }} 
                       className="bg-red-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-red-700 transition-colors shadow-sm text-sm"
                     >
                       Pay
                     </button>
                   </div>
                 </div>
                 
                 {expandedOrderId === order.id && (
                   <div className="animate-slide-up bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2 space-y-2">
                     <h4 className="font-bold text-gray-900 text-xs border-b border-gray-200 pb-2 mb-2 uppercase tracking-widest">Bill Breakdown</h4>
                     {order.items.map((item, i) => (
                       <div key={i} className="flex justify-between text-sm">
                         <div className="flex-1 pr-3">
                           <span className="text-gray-700 font-medium">{item.quantity}x {item.name}</span>
                           {item.note && <div className="text-gray-500 text-xs mt-0.5 italic">Note: {item.note}</div>}
                         </div>
                         <span className="text-gray-900 font-bold">₹{item.price * item.quantity}</span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>
      )}

      {/* 6. ORDER TRACKING PAGE */}
      {view === 'tracking' && activeOrder && (
        <div className="flex-1 flex flex-col relative bg-white">
          <header className="p-3 border-b border-gray-100 flex items-center gap-3">
             <button onClick={() => { setView('landing'); }} className="p-1"><ArrowLeft size={24} className="text-gray-600" /></button>
             <h2 className="text-base font-bold text-gray-900">Live Tracking</h2>
          </header>

          <div className="p-4 flex-1 overflow-y-auto pb-6">
            {activeOrder.status === 'cancelled' ? (
               <div className="flex-1 flex flex-col items-center justify-center pt-6 text-center animate-fade-in">
                 <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
                   <AlertCircle size={32} />
                 </div>
                 <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Order Cancelled</h2>
                 
                 {refundResult === 'cash' && (
                   <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-900 font-medium mb-6 text-sm text-left shadow-sm">
                     "As you have requested a cash refund, please head to the counter and kindly tell the executive: 'My order ID is {activeOrder.id} and I have proceeded with a cash refund on the portal. Could you please check if the refund has been approved for the amount of ₹{activeOrder.total}?'"
                   </div>
                 )}
                 {refundResult === 'bank' && (
                   <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-800 font-medium mb-6 text-sm text-left shadow-sm">
                     "Thank you for your patience. Your online refund request for Order ID {activeOrder.id} of ₹{activeOrder.total} has been successfully initiated. The amount will be credited back to your original payment mode within 3-5 business days. A confirmation receipt will be sent shortly."
                   </div>
                 )}
                 
                 <button onClick={() => { localStorage.removeItem('activeOrder'); setActiveOrder(null); setView('landing'); }} className="bg-gray-900 text-white font-bold py-3 px-8 rounded-2xl shadow-md w-full text-base">Back to Home</button>
               </div>
            ) : (
              <div className="animate-fade-in">
                <div className="bg-gray-900 text-white rounded-3xl p-6 text-center shadow-xl relative overflow-hidden mb-6">
                   <p className="text-gray-400 font-bold tracking-widest uppercase text-xs mb-2">Order ID</p>
                   <h1 className="text-5xl font-black tracking-tighter mb-6">{activeOrder.id}</h1>
                   
                   <p className="text-xs text-gray-400 font-medium mb-1">Order Received at {new Date(activeOrder.orderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                   
                   {/* Decorative circle */}
                   <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-6 rounded-3xl text-center mb-6 shadow-sm transition-all">
                  {activeOrder.status === 'processing' ? (
                     <div className="animate-pulse">
                        <Clock size={32} className="text-yellow-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Preparing your meal...</h3>
                        <p className="text-gray-500 text-sm font-medium mb-3">Estimated time remaining:</p>
                        <div className="text-3xl font-black text-gray-900">
                          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} <span className="text-lg text-gray-500 font-bold">Mins</span>
                        </div>
                     </div>
                  ) : (
                     <div className="animate-bounce">
                        <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                        <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">Order {activeOrder.id} is ready!</h3>
                        <p className="text-gray-600 font-medium text-base">Please pickup at the counter.</p>
                     </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <button onClick={() => { localStorage.removeItem('activeOrder'); setActiveOrder(null); setView('landing'); }} className="w-full py-3 bg-red-50 text-red-700 font-bold rounded-2xl hover:bg-red-100 transition-colors text-base border border-red-100 shadow-sm">
                    Place a New Order
                  </button>

                  {activeOrder.status === 'processing' && (
                    <button onClick={() => setShowCancelModal(true)} className="w-full py-3 text-gray-500 font-bold border-2 border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm">
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cancel Modal Overlay */}
          {showCancelModal && (
            <div className="absolute inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-end justify-center">
              <div className="bg-white w-full rounded-t-3xl shadow-2xl p-5 sm:p-6">
                <h3 className="text-xl font-black text-gray-900 mb-2">Cancel Order?</h3>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">How would you like to receive your refund for <span className="font-bold text-gray-900">₹{activeOrder.total}</span>?</p>
                
                <div className="space-y-3 mb-5">
                   {activeOrder.paymentMode === 'online' && (
                     <button onClick={() => handleCancelOrder('bank')} className="w-full flex justify-between items-center p-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 hover:border-gray-300 transition-colors text-sm">
                       Refund to My Bank <ArrowLeft size={16} className="text-gray-400 transform rotate-180" />
                     </button>
                   )}
                   <button onClick={() => handleCancelOrder('cash')} className="w-full flex justify-between items-center p-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 hover:border-gray-300 transition-colors text-sm">
                     Get Cash at Counter <ArrowLeft size={16} className="text-gray-400 transform rotate-180" />
                   </button>
                </div>
                
                <button onClick={() => setShowCancelModal(false)} className="w-full py-3 bg-gray-100 text-gray-900 font-bold rounded-2xl hover:bg-gray-200 transition-colors text-sm">Keep Order</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
