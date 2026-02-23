"use client";

import { useEffect, useRef, useCallback } from "react";

interface Contributor {
  id: string;
  name: string;
  pledge?: string | null;
  _isNew?: boolean;
  timestamp: Date;
}

interface ContributorTickerProps {
  contributors: Contributor[];
}

export function ContributorTicker({ contributors }: ContributorTickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const rafRef = useRef<number>();
  const speedRef = useRef(0.8); // pixels per frame (~48px/sec at 60fps)

  // Animation loop using requestAnimationFrame — never resets on re-render
  const animate = useCallback(() => {
    const el = trackRef.current;
    if (!el) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    positionRef.current -= speedRef.current;

    // Half the total width = one copy of the duplicated list
    const halfWidth = el.scrollWidth / 2;

    // When we've scrolled past the first copy, seamlessly jump back
    if (halfWidth > 0 && Math.abs(positionRef.current) >= halfWidth) {
      positionRef.current += halfWidth;
    }

    el.style.transform = `translateX(${positionRef.current}px)`;
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // Start animation once on mount, clean up on unmount
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  if (contributors.length === 0) {
    return (
      <div className="w-full py-4 bg-gradient-to-r from-[#FAF7F0] via-[#4A6B5C]/5 to-[#FAF7F0] dark:from-[#1a1f2e] dark:via-[#4A6B5C]/10 dark:to-[#1a1f2e] overflow-hidden">
        <p className="text-center text-muted-foreground font-mono text-sm">
          Be the first to contribute!
        </p>
      </div>
    );
  }

  const getFirstName = (name: string) => name.split(" ")[0];

  // Duplicate the list for seamless infinite looping
  const duplicated = [...contributors, ...contributors];

  return (
    <div className="w-full py-4 bg-gradient-to-r from-[#FAF7F0] via-[#4A6B5C]/5 to-[#FAF7F0] dark:from-[#1a1f2e] dark:via-[#4A6B5C]/10 dark:to-[#1a1f2e] overflow-hidden relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#FAF7F0] dark:from-[#1a1f2e] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#FAF7F0] dark:from-[#1a1f2e] to-transparent z-10" />

      <div
        ref={trackRef}
        className="flex gap-6 whitespace-nowrap will-change-transform"
      >
        {duplicated.map((contributor, index) => (
          <div
            key={`${contributor.id}-${index}`}
            className={`inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/10 rounded-full border border-[#D4A574]/30 dark:border-[#D4A574]/20 shadow-sm flex-shrink-0${
              contributor._isNew ? " animate-fade-in" : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-[#C8E86C] flex-shrink-0"
            >
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.5 0 3-.3 4.3-.9-2.5-1.5-4.3-4.2-4.3-7.1 0-4.4 3.6-8 8-8 .3 0 .6 0 .9.1C19.5 3.5 16 2 12 2z" />
            </svg>
            <span className="font-mono text-sm text-[#2C2C2C] dark:text-gray-200">
              <strong>{getFirstName(contributor.name)}</strong>
              {contributor.pledge && (
                <span className="text-[#4A6B5C] dark:text-[#8BC68C]">
                  {" "}
                  pledged to: &quot;{contributor.pledge.toLowerCase()}&quot;
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
