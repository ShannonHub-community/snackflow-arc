import React, { useState } from "react";
import { UserCheck } from "lucide-react";
import { PinModal } from "../../../components/PinModal";

export default function ShiftControl() {
  const [storeState, setStoreState] = useState<"open" | "paused" | "closed">("open");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingState, setPendingState] = useState<"open" | "paused" | "closed" | null>(null);

  const activeStaff = [
    { username: "manager_anil", station: "Manager Portal", time: "8:00 AM" },
    { username: "dosa_chef_01", station: "Kitchen - Dosa Tawa", time: "8:15 AM" },
    { username: "counter_front", station: "Front Counter", time: "8:30 AM" }
  ];

  const handleStateChange = (newState: "open" | "paused" | "closed") => {
    if (newState !== storeState) {
      setPendingState(newState);
      setShowConfirm(true);
    }
  };

  const confirmStateChange = () => {
    setShowConfirm(false);
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    if (pendingState) {
      setStoreState(pendingState);
    }
    setShowPinModal(false);
    setPendingState(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Shift Control</h2>
        <p className="text-slate-500 mt-1">Master switch and live staff roster.</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-wider text-center">Master Switch</h3>
        <div className="flex bg-slate-100 p-2 rounded-2xl">
          <button
            onClick={() => handleStateChange("open")}
            className={`flex-1 py-4 text-lg font-bold rounded-xl transition-all ${
              storeState === "open" ? "bg-green-500 text-white shadow-md scale-100" : "text-slate-500 hover:bg-slate-200 scale-95"
            }`}
          >
            🟢 OPEN
          </button>
          <button
            onClick={() => handleStateChange("paused")}
            className={`flex-1 py-4 text-lg font-bold rounded-xl transition-all ${
              storeState === "paused" ? "bg-yellow-500 text-white shadow-md scale-100" : "text-slate-500 hover:bg-slate-200 scale-95"
            }`}
          >
            🟡 PAUSED
          </button>
          <button
            onClick={() => handleStateChange("closed")}
            className={`flex-1 py-4 text-lg font-bold rounded-xl transition-all ${
              storeState === "closed" ? "bg-red-500 text-white shadow-md scale-100" : "text-slate-500 hover:bg-slate-200 scale-95"
            }`}
          >
            🔴 CLOSED
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <UserCheck className="h-6 w-6 text-blue-500" />
          <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wider">Active Staff Roster</h3>
        </div>
        <div className="space-y-4">
          {activeStaff.map((staff, i) => (
            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <div className="font-bold text-slate-900 text-lg">{staff.username}</div>
                <div className="text-slate-500 text-sm font-medium mt-1">{staff.station}</div>
              </div>
              <div className="text-sm font-mono text-slate-400 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                Since {staff.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setShowConfirm(false);
            setPendingState(null);
          }}
        >
          <div 
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Are you sure?</h3>
            <p className="text-slate-500 mb-8">
              {pendingState === "closed" && "Are you sure you want to close the store? Customers will be blocked."}
              {pendingState === "paused" && "Are you sure you want to pause incoming orders? Customers will be blocked temporarily."}
              {pendingState === "open" && "Are you sure you want to open the store for orders?"}
            </p>
            <div className="space-y-3">
              <button 
                onClick={confirmStateChange}
                className={`w-full py-4 text-white font-bold text-lg rounded-xl transition-colors shadow-md ${
                  pendingState === "open" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                Yes, {pendingState === "closed" ? "Close Store" : pendingState === "paused" ? "Pause Orders" : "Open Store"}
              </button>
              <button 
                onClick={() => {
                  setShowConfirm(false);
                  setPendingState(null);
                }}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <PinModal 
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setPendingState(null);
        }}
        onSuccess={handlePinSuccess}
        title="Shift Authorization"
        description={`Enter PIN to authorize changing store state to ${pendingState?.toUpperCase()}.`}
      />
    </div>
  );
}
