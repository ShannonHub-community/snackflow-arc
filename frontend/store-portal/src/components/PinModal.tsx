import React, { useState } from "react";
import { X, Lock } from "lucide-react";
import { NumericKeypad } from "./NumericKeypad";
import { Button } from "./ui/button";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PinModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  title = "Manager Authorization",
  description = "Enter 4-digit PIN to authorize this action."
}: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleVerify = () => {
    if (pin.length === 4) {
      if (pin === ((import.meta as any).env?.VITE_SUDO_PIN || "1234")) { // PIN from env
        onSuccess();
        setPin("");
        setError(false);
      } else {
        setError(true);
        setPin("");
      }
    } else {
      setError(true);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        setPin("");
        setError(false);
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center relative border-b border-slate-100 bg-slate-50">
          <button 
            onClick={() => {
              setPin("");
              setError(false);
              onClose();
            }}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="mx-auto h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => (
              <div 
                key={index} 
                className={`w-4 h-4 rounded-full transition-all ${
                  pin.length > index 
                    ? "bg-slate-800 scale-100" 
                    : "bg-slate-200 scale-75"
                } ${error ? "bg-red-500" : ""}`}
              />
            ))}
          </div>
          
          {error && (
            <p className="text-center text-red-500 text-sm font-bold animate-pulse">
              Invalid PIN. Try again.
            </p>
          )}

          <NumericKeypad 
            value={pin} 
            onChange={(val) => {
              setError(false);
              setPin(val);
              if (val.length === 4) {
                // Auto-submit when 4 digits entered, or leave to manual button
              }
            }} 
            maxLength={4} 
          />
          
          <Button 
            className="w-full h-14 text-lg font-bold rounded-xl"
            onClick={handleVerify}
            disabled={pin.length !== 4}
          >
            Authorize
          </Button>
        </div>
      </div>
    </div>
  );
}
