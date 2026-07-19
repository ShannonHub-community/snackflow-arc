import React, { useState, useEffect } from "react";
import { apiClient } from "../../../lib/apiClient";
import { IconResolver } from "../../../components/WesternIcons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../../components/ui/table";
import { Plus, Pencil, Trash2, LayoutTemplate, CheckCircle2, Loader2, X, Coffee, Pizza, Utensils, Sandwich, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

const WESTERN_FALLBACK_MENU = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Tea", price: "40.00", category: "Beverages", station: "Beverage Station", icon: "Coffee", in_stock: true },
  { id: "22222222-2222-2222-2222-222222222222", name: "Coffee", price: "60.00", category: "Beverages", station: "Beverage Station", icon: "Coffee", in_stock: true },
  { id: "33333333-3333-3333-3333-333333333333", name: "Pizza", price: "250.00", category: "Mains", station: "Oven Station", icon: "Pizza", in_stock: true },
  { id: "44444444-4444-4444-4444-444444444444", name: "Pasta", price: "220.00", category: "Mains", station: "Oven Station", icon: "Utensils", in_stock: true },
  { id: "55555555-5555-5555-5555-555555555555", name: "Sandwich", price: "120.00", category: "Mains", station: "Grill Station", icon: "Sandwich", in_stock: true },
  { id: "66666666-6666-6666-6666-666666666666", name: "Burger", price: "150.00", category: "Mains", station: "Grill Station", icon: "Utensils", in_stock: true }
];

export default function StoreCustomization() {
  const [theme, setTheme] = useState("western");
  const [addingItem, setAddingItem] = useState<"idle" | "adding" | "added">("idle");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "Mains", station: "Kitchen counter", icon: "Utensils" });
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);

  const [menuItems, setMenuItems] = useState<any[]>(WESTERN_FALLBACK_MENU);
  const [categories, setCategories] = useState<any[]>([{ id: "cat_bev", name: "Beverages" }, { id: "cat_mains", name: "Mains" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch categories
      let cats = categories;
      try {
        const fetchedCats = await apiClient.get<any[]>('/customer/menu/categories');
        if (Array.isArray(fetchedCats) && fetchedCats.length > 0) {
          cats = fetchedCats;
          setCategories(cats);
        }
      } catch (e) {
        console.warn('Failed to fetch categories, using default categories');
      }

      // 2. Fetch all menu items (including out of stock)
      const data = await apiClient.get<any[]>('/customer/menu?all_items=true');
      
      if (Array.isArray(data) && data.length > 0) {
        // 3. Map database items to frontend structure
        const mappedItems = data.map((item: any) => {
          const matchedCategory = cats.find(c => c.id === item.category_id);
          
          let station = 'Kitchen counter';
          let icon = 'Utensils';
          let rawDescription = '';
          
          try {
            if (item.description) {
              const parsed = JSON.parse(item.description);
              if (parsed && typeof parsed === 'object') {
                station = parsed.station || 'Kitchen counter';
                icon = parsed.icon || 'Utensils';
                rawDescription = parsed.description || '';
              }
            }
          } catch (e) {
            rawDescription = item.description || '';
          }

          return {
            id: item.id,
            name: item.name,
            price: Number(item.price).toFixed(2),
            category: matchedCategory ? matchedCategory.name : 'Mains',
            station: station,
            icon: icon,
            in_stock: item.in_stock !== false,
            description: rawDescription,
            category_id: item.category_id
          };
        });
        setMenuItems(mappedItems);
      } else {
        setMenuItems(WESTERN_FALLBACK_MENU);
      }
    } catch (err: any) {
      console.warn('Failed to fetch menu from backend, loaded Western demo fallback:', err);
      setCategories([{ id: "cat_bev", name: "Beverages" }, { id: "cat_mains", name: "Mains" }]);
      setMenuItems(WESTERN_FALLBACK_MENU);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleStock = async (itemId: string, currentInStock: boolean) => {
    const nextInStock = !currentInStock;
    setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, in_stock: nextInStock } : i));
    try {
      await apiClient.patch(`/manager/menu/${itemId}/stock`, { is_in_stock: nextInStock });
    } catch (err) {
      console.warn("Stock toggle API warning:", err);
    }
  };

  const handleAdd = () => {
    setIsEditingMode(false);
    setNewItem({ name: "", price: "", category: categories[0]?.name || "Mains", station: "Kitchen counter", icon: "Utensils" });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingItem("adding");
    setShowAddModal(false);
    
    try {
      // Find matching database category ID
      const matchedCategory = categories.find(c => c.name === newItem.category);
      const categoryId = matchedCategory ? matchedCategory.id : "00000000-0000-0000-0000-000000000000";
      
      const descriptionJSON = JSON.stringify({
        description: "",
        station: newItem.station,
        icon: newItem.icon
      });

      const payload = {
        name: newItem.name,
        description: descriptionJSON,
        price: parseFloat(newItem.price),
        category_id: categoryId,
        in_stock: true,
        prep_time_minutes: 10,
      };
      
      const ADMIN_API_KEY = (import.meta as any).env.VITE_ADMIN_API_KEY || 'change_this_admin_key';
      
      if (isEditingMode && currentEditId !== null) {
        const existingItem = menuItems.find(item => item.id === currentEditId);
        const putPayload = {
          ...payload,
          in_stock: existingItem ? existingItem.in_stock : true
        };
        
        await apiClient.put(`/customer/menu/${currentEditId}`, putPayload, {
          headers: {
            'X-Admin-Key': ADMIN_API_KEY
          }
        });
      } else {
        await apiClient.post('/customer/menu', payload, {
          headers: {
            'X-Admin-Key': ADMIN_API_KEY
          }
        });
      }
      
      setAddingItem("added");
      await fetchMenu(); // Re-fetch from DB
      setTimeout(() => setAddingItem("idle"), 1500);
    } catch (err) {
      console.error('Failed to save item:', err);
      setAddingItem("idle");
      alert('Failed to save menu item. Check console logs for details.');
    }
  };

  const handleEdit = (id: string) => {
    setEditingItemId(id);
    const itemToEdit = menuItems.find(item => item.id === id);
    setTimeout(() => {
      if (itemToEdit) {
        setNewItem({ 
          name: itemToEdit.name, 
          price: itemToEdit.price, 
          category: itemToEdit.category, 
          station: itemToEdit.station, 
          icon: itemToEdit.icon 
        });
        setIsEditingMode(true);
        setCurrentEditId(id);
        setShowAddModal(true);
      }
      setEditingItemId(null);
    }, 500);
  };

  const handleDelete = async (id: string) => {
    setDeletingItemId(id);
    try {
      const ADMIN_API_KEY = (import.meta as any).env.VITE_ADMIN_API_KEY || 'change_this_admin_key';
      await apiClient.delete(`/customer/menu/${id}`, {
        headers: {
          'X-Admin-Key': ADMIN_API_KEY
        }
      });
      await fetchMenu();
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item from database.');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...menuItems];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setMenuItems(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === menuItems.length - 1) return;
    const newItems = [...menuItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setMenuItems(newItems);
  };

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col relative">
      {/* Add Item Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {isEditingMode ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                {isEditingMode ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Pizza" required />
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="150.00" required />
              </div>
              <div className="space-y-2">
                <Label>Type of Food</Label>
                <select 
                  value={newItem.category} 
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                  {categories.length === 0 && <option value="Mains">Mains</option>}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Station Routing</Label>
                <select 
                  value={newItem.station} 
                  onChange={e => setNewItem({...newItem, station: e.target.value})}
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="Beverage Station">Beverage Station</option>
                  <option value="Grill Station">Grill Station</option>
                  <option value="Oven Station">Oven Station</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Select Icon (SVG)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["tea", "coffee", "pizza", "burger", "sandwich", "pasta"].map(iconName => (
                    <div 
                      key={iconName}
                      onClick={() => setNewItem({...newItem, icon: iconName})}
                      className={`p-3 border rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
                        newItem.icon === iconName ? 'border-orange-500 bg-orange-50 text-orange-600 font-bold' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <IconResolver type={iconName} className="w-6 h-6 mb-1" />
                      <span className="text-[10px] capitalize">{iconName}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-md font-bold mt-6 bg-slate-900 text-white">{isEditingMode ? "Save Changes" : "Add to Menu"}</Button>
            </form>
          </div>
        </div>
      )}

      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Storefront Customization</h2>
          <p className="text-sm text-slate-500 mt-1">Configure your mobile menu appearance and inventory.</p>
        </div>
        <LayoutTemplate className="h-8 w-8 text-slate-300 hidden md:block" />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 grid lg:grid-cols-[1fr_320px] gap-8 min-h-0">
        
        {/* Left Side: Builder (Scrollable) */}
        <div className="space-y-6 overflow-y-auto pr-2 pb-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Brand Aesthetic</CardTitle>
              <CardDescription>The platform-wide visual style for your customer menu.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-red-500 bg-red-50/50 shadow-sm">
                <div className="flex gap-2 shrink-0">
                  <div className="h-8 w-8 rounded-full bg-red-600 shadow-sm"></div>
                  <div className="h-8 w-8 rounded-full bg-yellow-400 shadow-sm"></div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Modern Western Cafe</div>
                  <div className="text-xs text-slate-500 mt-0.5">Standardized brand identity across SnackFlow</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center w-full">
                <div>
                  <CardTitle>Menu Inventory</CardTitle>
                  <CardDescription>Manage items, prices, and kitchen routing.</CardDescription>
                </div>
                <Button 
                  size="sm"
                  onClick={handleAdd}
                  disabled={addingItem !== "idle" || loading}
                  className={addingItem === "added" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {addingItem === "idle" && <><Plus className="mr-2 h-4 w-4" /> Add Item</>}
                  {addingItem === "adding" && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>}
                  {addingItem === "added" && <><CheckCircle2 className="mr-2 h-4 w-4" /> Added</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 border-t border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 border-b-0"></TableHead>
                    <TableHead className="border-b-0">Item</TableHead>
                    <TableHead className="border-b-0">Price</TableHead>
                    <TableHead className="border-b-0">Station</TableHead>
                    <TableHead className="text-right border-b-0">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-slate-400" />
                        Loading menu inventory...
                      </TableCell>
                    </TableRow>
                  ) : menuItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                        No menu items found. Click "Add Item" to add the first item!
                      </TableCell>
                    </TableRow>
                  ) : (
                    menuItems.map((item, index) => (
                      <TableRow key={item.id} className={item.in_stock ? "" : "opacity-60 bg-slate-50/50"}>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <button 
                              onClick={() => handleMoveUp(index)} 
                              disabled={index === 0}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleMoveDown(index)} 
                              disabled={index === menuItems.length - 1}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{item.name}</span>
                            {!item.in_stock && <Badge variant="destructive" className="text-[9px] px-1 py-0 font-bold uppercase tracking-wide">Out of stock</Badge>}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{item.category}</div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">₹{item.price}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-[10px] uppercase border-slate-200 border">{item.station}</Badge>
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-8 text-[11px] font-extrabold px-2.5 rounded-lg border transition-all ${
                              item.in_stock 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            }`}
                            onClick={() => handleToggleStock(item.id, item.in_stock)}
                          >
                            {item.in_stock ? "In Stock" : "Out of Stock"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-500"
                            onClick={() => handleEdit(item.id)}
                            disabled={editingItemId !== null}
                          >
                            {editingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingItemId !== null}
                          >
                            {deletingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Iframe Preview */}
        <div className="hidden lg:flex flex-col">
          <div className="bg-slate-100 rounded-[2rem] p-4 shadow-inner border-4 border-slate-200 h-[600px] flex flex-col relative overflow-hidden">
            {/* Mock Mobile Screen */}
            <div className="bg-white rounded-[1.5rem] flex-1 overflow-hidden shadow-sm flex flex-col border border-slate-200">
              {/* Header */}
              <div className="px-5 py-6 bg-red-500 text-white">
                <h3 className="text-lg font-bold tracking-tight">CAFE-882</h3>
                <p className="text-xs opacity-90 font-medium">Table 4</p>
              </div>
              {/* Content */}
              <div className="flex-1 bg-slate-50 p-4 space-y-4 overflow-y-auto">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4 first:mt-0">{category}</div>
                    <div className="space-y-2">
                      {(items as typeof menuItems).map(item => (
                        <div key={item.id} className={`bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border border-slate-200 ${item.in_stock ? "" : "opacity-50"}`}>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500 font-semibold mt-0.5">₹{item.price}</div>
                          </div>
                          <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 p-1 text-slate-600">
                            <IconResolver type={item.icon} className="h-full w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 rounded-full"></div>
          </div>
          <div className="text-center mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Customer Preview</div>
        </div>
      </div>
    </div>
  );
}
