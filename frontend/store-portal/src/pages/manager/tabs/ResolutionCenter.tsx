import React, { useState } from "react";
import { AlertTriangle, IndianRupee, CreditCard } from "lucide-react";
import { PinModal } from "../../../components/PinModal";

interface RefundTicket {
  id: string;
  amount: number;
  method: string;
  time: string;
  stale: boolean;
}

export default function ResolutionCenter() {
  const [tickets, setTickets] = useState<RefundTicket[]>([
    { id: "A12", amount: 150, method: "UPI", time: "2m ago", stale: false },
    { id: "B44", amount: 320, method: "Card", time: "35m ago", stale: true },
  ]);

  const [activeTicket, setActiveTicket] = useState<{id: string, action: "cash" | "api" | "all_api"} | null>(null);

  const handleActionClick = (id: string, action: "cash" | "api") => {
    setActiveTicket({ id, action });
  };

  const handleProcessAllOnline = () => {
    setActiveTicket({ id: "ALL", action: "all_api" });
  };

  const handleRefundSuccess = () => {
    if (activeTicket) {
      if (activeTicket.action === "all_api") {
        setTickets(tickets.filter(t => t.method === "Cash")); // Remove UPI and Card (online)
      } else {
        setTickets(tickets.filter(t => t.id !== activeTicket.id));
      }
      setActiveTicket(null);
    }
  };

  const hasOnlineRefunds = tickets.some(t => t.method !== "Cash");

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Resolution Center</h2>
          <p className="text-slate-500 mt-1">Process customer refunds and order cancellations.</p>
        </div>
        {hasOnlineRefunds && tickets.length > 0 && (
          <button 
            onClick={handleProcessAllOnline}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl transition-colors shrink-0"
          >
            <CreditCard className="w-5 h-5" />
            Process All Online API
          </button>
        )}
      </div>

      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-700">No Pending Resolutions</h3>
            <p className="text-slate-500">The queue is empty.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between ${
                ticket.stale ? "border-orange-500 shadow-orange-100" : "border-slate-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl ${
                  ticket.stale ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-700"
                }`}>
                  #{ticket.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-2xl text-slate-900">₹{ticket.amount}</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-md">
                      {ticket.method}
                    </span>
                  </div>
                  <div className={`text-sm font-medium mt-1 ${ticket.stale ? "text-orange-600 font-bold flex items-center gap-1" : "text-slate-500"}`}>
                    {ticket.stale && <AlertTriangle className="w-4 h-4" />}
                    Requested {ticket.time}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => handleActionClick(ticket.id, "cash")}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl transition-colors"
                >
                  <IndianRupee className="w-5 h-5" />
                  Cash Refund Given
                </button>
                <button 
                  onClick={() => handleActionClick(ticket.id, "api")}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                  Process Online API Refund
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <PinModal 
        isOpen={activeTicket !== null}
        onClose={() => setActiveTicket(null)}
        onSuccess={handleRefundSuccess}
        title={activeTicket?.action === "cash" ? "Authorize Cash Refund" : activeTicket?.action === "all_api" ? "Authorize All Online Refunds" : "Authorize API Refund"}
        description={`Enter PIN to authorize ${activeTicket?.action === "cash" ? "register opening" : activeTicket?.action === "all_api" ? "all online reversals" : "online reversal"} for ${activeTicket?.action === "all_api" ? "all pending online orders" : `order #${activeTicket?.id}`}.`}
      />
    </div>
  );
}
