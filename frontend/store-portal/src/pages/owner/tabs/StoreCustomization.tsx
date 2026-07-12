import React, { useState } from "react";
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
import { Plus, GripVertical, Pencil, Trash2, LayoutTemplate, CheckCircle2, Loader2, X, Coffee, Pizza, Utensils, Sandwich, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export default function StoreCustomization() {
  const [theme, setTheme] = useState("maharashtrian");
  const [addingItem, setAddingItem] = useState<"idle" | "adding" | "added">("idle");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "Mains", station: "Kitchen counter", icon: "Utensils" });
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);

  const [menuItems, setMenuItems] = useState([
    { id: 1, name: "Classic Butter Dosa", price: "99.00", category: "Mains", priority: 1, station: "Dosa Tawa", icon: "burger" },
    { id: 2, name: "Filter Coffee", price: "45.00", category: "Beverages", priority: 2, station: "Beverage", icon: "cup" },
    { id: 3, name: "Vada Pav (2pc)", price: "50.00", category: "Sides", priority: 3, station: "Fryer", icon: "bowl" },
  ]);

  const handleAdd = () => {
    setIsEditingMode(false);
    setNewItem({ name: "", price: "", category: "Mains", station: "Kitchen counter", icon: "Utensils" });
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddingItem("adding");
    setShowAddModal(false);
    setTimeout(() => {
      setAddingItem("added");
      if (isEditingMode && currentEditId !== null) {
        setMenuItems(prev => prev.map(item => item.id === currentEditId ? { ...item, ...newItem } : item));
      } else {
        setMenuItems([...menuItems, { id: Date.now(), name: newItem.name, price: newItem.price, category: newItem.category, priority: menuItems.length + 1, station: newItem.station, icon: newItem.icon }]);
      }
      setTimeout(() => setAddingItem("idle"), 1500);
    }, 800);
  };

  const handleEdit = (id: number) => {
    setEditingItemId(id);
    const itemToEdit = menuItems.find(item => item.id === id);
    setTimeout(() => {
      if (itemToEdit) {
        setNewItem({ name: itemToEdit.name, price: itemToEdit.price, category: itemToEdit.category, station: itemToEdit.station, icon: itemToEdit.icon });
        setIsEditingMode(true);
        setCurrentEditId(id);
        setShowAddModal(true);
      }
      setEditingItemId(null);
    }, 500);
  };

  const handleDelete = (id: number) => {
    setDeletingItemId(id);
    setTimeout(() => {
      setMenuItems(prev => prev.filter(item => item.id !== id));
      setDeletingItemId(null);
    }, 500);
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

  const getEmoji = (icon: string) => {
    switch (icon.toLowerCase()) {
      case "burger": return "🍔";
      case "cup": case "coffee": return "☕";
      case "bowl": return "🍲";
      case "utensils": return "🍽️";
      case "pizza": return "🍕";
      case "sandwich": return "🥪";
      default: return "🍛";
    }
  };

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
                <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Masala Dosa" required />
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="99.00" required />
              </div>
              <div className="space-y-2">
                <Label>Type of Food</Label>
                <select 
                  value={newItem.category} 
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="Mains">Mains</option>
                  <option value="Sides">Sides</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Desserts">Desserts</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Station Routing</Label>
                <select 
                  value={newItem.station} 
                  onChange={e => setNewItem({...newItem, station: e.target.value})}
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="Kitchen counter">Kitchen counter</option>
                  <option value="Beverage">Beverage</option>
                  <option value="Fryer">Fryer</option>
                  <option value="Dosa Tawa">Dosa Tawa</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Select Icon (SVG)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {["Utensils", "Coffee", "Pizza", "Sandwich"].map(iconName => (
                    <div 
                      key={iconName}
                      onClick={() => setNewItem({...newItem, icon: iconName})}
                      className={`cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border ${newItem.icon === iconName ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'}`}
                    >
                      {iconName === "Utensils" && <Utensils className="h-6 w-6 mb-1" />}
                      {iconName === "Coffee" && <Coffee className="h-6 w-6 mb-1" />}
                      {iconName === "Pizza" && <Pizza className="h-6 w-6 mb-1" />}
                      {iconName === "Sandwich" && <Sandwich className="h-6 w-6 mb-1" />}
                      <span className="text-[10px] font-bold">{iconName}</span>
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

      <div className="flex-1 grid lg:grid-cols-[1fr_320px] gap-8 min-h-0">
        
        {/* Left Side: Builder (Scrollable) */}
        <div className="space-y-6 overflow-y-auto pr-2 pb-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Theme Selector</CardTitle>
              <CardDescription>Choose the visual identity for your customer-facing menu.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("western")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === "western" ? "border-red-500 bg-red-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-slate-50"
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-red-500"></div>
                    <div className="h-6 w-6 rounded-full bg-yellow-400"></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700">Western</span>
                </button>
                <button
                  onClick={() => setTheme("south-indian")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === "south-indian" ? "border-emerald-600 bg-emerald-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-slate-50"
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-600"></div>
                    <div className="h-6 w-6 rounded-full border border-slate-300 bg-white"></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700">South Indian</span>
                </button>
                <button
                  onClick={() => setTheme("maharashtrian")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === "maharashtrian" ? "border-orange-500 bg-orange-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-slate-50"
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-orange-500"></div>
                    <div className="h-6 w-6 rounded-full bg-red-800"></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700">Maharashtrian</span>
                </button>
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
                  disabled={addingItem !== "idle"}
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
                  {menuItems.map((item, index) => (
                    <TableRow key={item.id}>
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
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{item.category}</div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-700">₹{item.price}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px] uppercase border-slate-200 border">{item.station}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
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
                  ))}
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
              <div className={`px-5 py-6 ${
                theme === "western" ? "bg-red-500 text-white" : 
                theme === "south-indian" ? "bg-emerald-600 text-white" : 
                "bg-orange-500 text-white"
              }`}>
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
                        <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border border-slate-200">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500 font-semibold mt-0.5">₹{item.price}</div>
                          </div>
                          <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center text-xl border border-slate-100">{getEmoji(item.icon)}</div>
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
