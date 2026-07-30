import React, { useEffect, useRef, useState } from "react";
import { useRupeeStore } from "../../stores/rupeeStore";

// Tick speed scales with the size of the jump instead of a flat rate - a
// flat 1-per-64th-of-a-second rate finishes a +1 (a Green rupee) in a single
// frame, which reads as an instant snap rather than a dial-up. Small jumps
// get a slow, deliberate tick; big jumps ramp up toward the fastest rate.
const FASTEST_TICK_MS = 1000 / 64; // cap for large jumps (e.g. +300, Orange)
const SLOWEST_TICK_MS = 400; // cap for the smallest jump (+1, Green)
const TICK_BUDGET_MS = 500; // roughly how long the whole dial-up should take

// One character of the counter, clipped to its own line height so a new
// value slides down into place from above instead of just popping in.
// Keying the inner span by the character itself forces a remount - and
// therefore replays the drop-in animation - only when that digit actually
// changes, so unaffected digits (e.g. the leading "1" in 105 -> 106) stay put.
const AnimatedDigit: React.FC<{ char: string }> = ({ char }) => (
  <span className="relative inline-flex h-[1.2em] items-center justify-center overflow-hidden leading-none">
    <span
      key={char}
      className="inline-block animate-[rupee-digit-in_0.35s_ease-out]"
    >
      {char}
    </span>
  </span>
);

export const RupeeCounter: React.FC = () => {
  const { totalValue } = useRupeeStore();
  const [displayedValue, setDisplayedValue] = useState(totalValue);
  const displayedValueRef = useRef(displayedValue);
  displayedValueRef.current = displayedValue;

  // Dial the displayed count toward the real total instead of snapping to
  // it, so collecting a rupee reads as a counter ticking up like in Zelda.
  useEffect(() => {
    const start = displayedValueRef.current;
    if (start === totalValue) return;

    const delta = Math.abs(totalValue - start);
    const tickMs = Math.min(
      SLOWEST_TICK_MS,
      Math.max(FASTEST_TICK_MS, TICK_BUDGET_MS / delta)
    );

    const interval = setInterval(() => {
      setDisplayedValue((current) => {
        if (current === totalValue) {
          clearInterval(interval);
          return current;
        }
        return current < totalValue ? current + 1 : current - 1;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [totalValue]);

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

      {/* Rupee Count - each digit drops in from above when it changes */}
      <span className="inline-flex items-center text-white font-stretch-150% font-bold font-medium text-xl tabular-nums tracking-wide">
        {displayedValue
          .toLocaleString()
          .split("")
          .map((char, index) => (
            <AnimatedDigit key={index} char={char} />
          ))}
      </span>
    </div>
  );
};
