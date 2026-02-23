"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";

interface GrowthProgressBarProps {
  currentValue: number;
  maxValue: number;
  milestones: number[];
}

export function GrowthProgressBar({ currentValue, maxValue, milestones }: GrowthProgressBarProps) {
  const percentage = Math.min((currentValue / maxValue) * 100, 100);
  const prevValueRef = useRef(currentValue);
  const [showPulse, setShowPulse] = useState(false);

  // Spring-animated progress for smooth, organic feel
  const springProgress = useSpring(0, { stiffness: 40, damping: 15, mass: 1 });
  const displayPercentage = useTransform(springProgress, (v) => `${v}%`);

  // Animate counter smoothly
  const springValue = useSpring(0, { stiffness: 50, damping: 20 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    springProgress.set(percentage);
  }, [percentage, springProgress]);

  useEffect(() => {
    springValue.set(currentValue);
    const unsub = springValue.on("change", (v) => setDisplayValue(Math.round(v)));
    return () => unsub();
  }, [currentValue, springValue]);

  // Detect value increase and trigger pulse effect
  useEffect(() => {
    if (currentValue > prevValueRef.current && prevValueRef.current > 0) {
      setShowPulse(true);
      const timeout = setTimeout(() => setShowPulse(false), 1500);
      prevValueRef.current = currentValue;
      return () => clearTimeout(timeout);
    }
    prevValueRef.current = currentValue;
  }, [currentValue]);

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-display text-lg text-[#4A6B5C] dark:text-[#8BC68C]">Growth Progress</span>
        <motion.span
          className="font-mono text-sm text-[#2C2C2C] dark:text-gray-200"
          animate={showPulse ? { scale: [1, 1.15, 1], color: ["#2C2C2C", "#4A6B5C", "#2C2C2C"] } : {}}
          transition={{ duration: 0.6 }}
        >
          {displayValue} / {maxValue}
        </motion.span>
      </div>

      <div className="relative h-4 bg-[#D4A574]/20 dark:bg-[#D4A574]/10 rounded-full overflow-hidden">
        {/* Progress fill — spring-animated for smooth growth */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#4A6B5C] to-[#C8E86C] rounded-full"
          style={{ width: displayPercentage }}
        />

        {/* Glow effect on value increase */}
        <AnimatePresence>
          {showPulse && (
            <motion.div
              className="absolute inset-0 bg-[#C8E86C]/30 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
            />
          )}
        </AnimatePresence>

        {/* Root-like texture overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 10px,
              rgba(74, 107, 92, 0.3) 10px,
              rgba(74, 107, 92, 0.3) 12px
            )`,
          }}
        />

        {/* Milestone markers */}
        {milestones.map((milestone) => {
          const milestonePercent = (milestone / maxValue) * 100;
          const isReached = currentValue >= milestone;
          return (
            <div
              key={milestone}
              className="absolute top-0 bottom-0 w-1"
              style={{ left: `${milestonePercent}%` }}
            >
              <div
                className={`w-full h-full ${
                  isReached ? "bg-[#C8E86C]" : "bg-[#D4A574]/50"
                }`}
              />
              <motion.div
                className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 ${
                  isReached
                    ? "bg-[#C8E86C] border-[#4A6B5C]"
                    : "bg-white dark:bg-gray-700 border-[#D4A574] dark:border-[#D4A574]/50"
                }`}
                animate={isReached ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          );
        })}
      </div>

      {/* Milestone labels */}
      <div className="relative mt-4 h-6">
        {milestones.map((milestone) => {
          const milestonePercent = (milestone / maxValue) * 100;
          const isReached = currentValue >= milestone;
          return (
            <div
              key={milestone}
              className="absolute text-center"
              style={{
                left: `${milestonePercent}%`,
                transform: "translateX(-50%)",
              }}
            >
              <span
                className={`font-mono text-xs ${
                  isReached ? "text-[#4A6B5C] dark:text-[#8BC68C] font-bold" : "text-muted-foreground"
                }`}
              >
                {milestone}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
