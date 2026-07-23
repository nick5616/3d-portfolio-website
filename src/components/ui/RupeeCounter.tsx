import React from "react";
import { useRupeeStore } from "../../stores/rupeeStore";

export const RupeeCounter: React.FC = () => {
  const { totalValue } = useRupeeStore();

  return (
    <div className="fixed right-0 top-10 z-30 flex items-center gap-2 bg-[linear-gradient(115deg,rgba(0,0,0,0.85),rgba(0,0,0,0))] backdrop-blur-md rounded-l-full pl-1.5 pr-16 py-[0.50] shadow-lg">
      {/* Rupee Icon - protrudes above the top edge of the pill */}
      <div className="relative w-7 h-7 flex items-center justify-center">
        <img
          src="/favicon-32x32.png"
          alt="Rupee"
          className="absolute -top-3 w-9 h-9 object-contain drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]"
          style={{ rotate: "-33deg" }}
        />
      </div>

      {/* Rupee Count */}
      <span className="text-white font-bold font-medium text-xl tabular-nums tracking-wide">
        {totalValue.toLocaleString()}
      </span>
    </div>
  );
};
