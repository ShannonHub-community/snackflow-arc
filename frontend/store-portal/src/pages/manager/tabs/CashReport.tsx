import React from "react";
import { Wallet } from "lucide-react";

export default function CashReport() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto mt-12 text-center">
      <div className="mx-auto w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8">
        <Wallet className="w-12 h-12" />
      </div>
      
      <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Drawer Target</h2>
      <p className="text-lg text-slate-500 mb-12">Expected App Cash</p>

      <div className="bg-white rounded-[3rem] p-16 border-2 border-slate-200 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-4 bg-emerald-500"></div>
        <div className="text-[5rem] md:text-[7rem] font-black text-slate-900 tracking-tighter leading-none">
          ₹4,250
        </div>
      </div>

      <p className="text-sm font-medium text-slate-400 mt-8 max-w-sm mx-auto leading-relaxed">
        This total represents cash orders fulfilled through the application today. It does not account for offline manual sales.
      </p>
    </div>
  );
}
