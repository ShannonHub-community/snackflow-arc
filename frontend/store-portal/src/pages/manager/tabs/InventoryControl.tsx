import React, { useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

export default function InventoryControl() {
  const [items, setItems] = useState<MenuItem[]>([
    { id: "1", name: "Masala Dosa", category: "South Indian", price: 80, inStock: true },
    { id: "2", name: "Plain Dosa", category: "South Indian", price: 60, inStock: true },
    { id: "3", name: "Idli Sambar", category: "South Indian", price: 50, inStock: true },
    { id: "4", name: "Filter Coffee", category: "Beverages", price: 30, inStock: true },
    { id: "5", name: "Cold Coffee", category: "Beverages", price: 60, inStock: true },
    { id: "6", name: "Veg Cheese Burger", category: "Fast Food", price: 120, inStock: false },
    { id: "7", name: "French Fries", category: "Fast Food", price: 80, inStock: true },
  ]);

  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredItems = items.filter(
    item => 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      item.category.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const toggleStock = (id: string, currentStock: boolean) => {
    // Optimistic update
    setItems(items.map(item => item.id === id ? { ...item, inStock: !currentStock } : item));
    setLoadingId(id);
    
    // Simulate API delay
    setTimeout(() => {
      setLoadingId(null);
    }, 800);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Inventory Control</h2>
        <p className="text-slate-500 mt-1">Manage 86'd items (Out of Stock).</p>
      </div>

      <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search menu items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className={`p-6 flex items-center justify-between transition-colors ${
                !item.inStock ? "bg-slate-50" : ""
              }`}
            >
              <div>
                <div className={`text-xl font-bold ${!item.inStock ? "text-slate-400" : "text-slate-900"}`}>
                  {item.name}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-medium text-slate-500">{item.category}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-sm font-bold text-slate-600">₹{item.price}</span>
                </div>
              </div>
              
              <button
                onClick={() => toggleStock(item.id, item.inStock)}
                disabled={loadingId === item.id}
                className={`relative overflow-hidden flex items-center justify-center min-w-[140px] px-6 py-3 rounded-xl font-bold transition-all ${
                  item.inStock 
                    ? "bg-slate-900 text-white hover:bg-slate-800" 
                    : "bg-red-100 text-red-600 hover:bg-red-200"
                } ${loadingId === item.id ? "opacity-70 cursor-wait" : ""}`}
              >
                {loadingId === item.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  item.inStock ? "IN STOCK" : "OUT OF STOCK"
                )}
              </button>
            </div>
          ))}
          
          {filteredItems.length === 0 && (
            <div className="p-12 text-center text-slate-500 font-medium">
              No items found matching "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
