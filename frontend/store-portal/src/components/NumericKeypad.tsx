import React from "react";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function NumericKeypad({ value, onChange, maxLength = 4 }: NumericKeypadProps) {
  const handlePress = (num: string) => {
    if (value.length < maxLength) {
      onChange(value + num);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const buttons = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "", "0", "del"
  ];

  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto">
      {buttons.map((btn, index) => {
        if (btn === "") {
          return <div key={index} />;
        }
        if (btn === "del") {
          return (
            <button
              key={index}
              type="button"
              onClick={handleDelete}
              className="h-16 flex items-center justify-center bg-slate-200 hover:bg-slate-300 active:bg-slate-400 rounded-xl transition-colors"
            >
              <Delete className="w-6 h-6 text-slate-700" />
            </button>
          );
        }
        return (
          <button
            key={index}
            type="button"
            onClick={() => handlePress(btn)}
            className="h-16 flex items-center justify-center bg-white border border-slate-200 shadow-sm hover:bg-slate-50 active:bg-slate-200 text-2xl font-bold rounded-xl transition-colors text-slate-800"
          >
            {btn}
          </button>
        );
      })}
    </div>
  );
}
