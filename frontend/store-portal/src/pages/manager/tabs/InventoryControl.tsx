import React, { useState, useEffect } from "react";
import { Search, Loader2, Plus } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  in_stock: boolean;
}

const WESTERN_FALLBACK_INVENTORY: MenuItem[] = [
  { id: "prod_tea_001", name: "Tea", category: "Beverages", price: 40, in_stock: true },
  { id: "prod_coffee_001", name: "Coffee", category: "Beverages", price: 60, in_stock: true },
  { id: "prod_pizza_001", name: "Pizza", category: "Mains", price: 250, in_stock: true },
  { id: "prod_pasta_001", name: "Pasta", category: "Mains", price: 220, in_stock: true },
  { id: "prod_sandwich_001", name: "Sandwich", category: "Mains", price: 120, in_stock: true },
  { id: "prod_burger_001", name: "Burger", category: "Mains", price: 150, in_stock: true }
];

export default function InventoryControl() {
  const [inventory, setInventory] = useState<MenuItem[]>(WESTERN_FALLBACK_INVENTORY);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "", price: "" });

  // Get user role from JWT
  useEffect(() => {
    const token = apiClient.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }, []);

  // Fetch menu items from backend
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<any[]>('/customer/menu?all_items=true');
      if (Array.isArray(data) && data.length > 0) {
        const mappedItems: MenuItem[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category || 'Mains',
          price: Number(item.price),
          in_stock: item.in_stock !== false,
        }));
        setInventory(mappedItems);
      } else {
        setInventory(WESTERN_FALLBACK_INVENTORY);
      }
    } catch (error) {
      console.warn('Failed to fetch menu items, using Western fallback inventory:', error);
      setInventory(WESTERN_FALLBACK_INVENTORY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredItems = inventory.filter(
    item => 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      item.category.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const toggleStock = async (id: string, currentStock: boolean) => {
    setLoadingId(id);
    const nextStock = !currentStock;
    setInventory(prev => prev.map(item => item.id === id ? { ...item, in_stock: nextStock } : item));
    try {
      await apiClient.patch(`/manager/menu/${id}/stock`, { is_in_stock: nextStock });
    } catch (error) {
      console.warn('Failed to update stock via API:', error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newItem.name,
        description: "",
        price: parseFloat(newItem.price),
        category_id: "00000000-0000-0000-0000-000000000000", // Default category UUID
        in_stock: true,
        prep_time_minutes: 10,
      };
      console.log("Network: Sending new item...", payload);
      const response = await apiClient.post<any>('/customer/menu', payload);
      console.log("Item created successfully:", response);
      // Re-fetch inventory to update UI
      await fetchInventory();
      setNewItem({ name: "", category: "", price: "" });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
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
          {userRole === 'owner' && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <form onSubmit={handleAddItem} className="space-y-4">
              <input
                type="text"
                placeholder="Item name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="text"
                placeholder="Category"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="number"
                placeholder="Price"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                step="0.01"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Save Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading inventory...
            </div>
          ) : (
            <>
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className={`p-6 flex items-center justify-between transition-colors ${
                    !item.in_stock ? "bg-slate-50" : ""
                  }`}
                >
                  <div>
                    <div className={`text-xl font-bold ${!item.in_stock ? "text-slate-400" : "text-slate-900"}`}>
                      {item.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-medium text-slate-500">{item.category}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="text-sm font-bold text-slate-600">₹{item.price}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleStock(item.id, item.in_stock)}
                    disabled={loadingId === item.id}
                    className={`relative overflow-hidden flex items-center justify-center min-w-[140px] px-6 py-3 rounded-xl font-bold transition-all ${
                      item.in_stock 
                        ? "bg-slate-900 text-white hover:bg-slate-800" 
                        : "bg-red-100 text-red-600 hover:bg-red-200"
                    } ${loadingId === item.id ? "opacity-70 cursor-wait" : ""}`}
                  >
                    {loadingId === item.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      item.in_stock ? "IN STOCK" : "OUT OF STOCK"
                    )}
                  </button>
                </div>
              ))}
              
              {filteredItems.length === 0 && (
                <div className="p-12 text-center text-slate-500 font-medium">
                  No items found matching "{search}"
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
