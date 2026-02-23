"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Heart } from "lucide-react";

interface Donation {
  id: string;
  donor_name: string;
  amount: number;
  campaign_name: string;
  verified_at: string;
  is_anonymous: boolean;
}

export function DonationTicker() {
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const rafRef = useRef<number>();
  const speedRef = useRef(0.6); // slightly slower than pledge ticker
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent verified donations
  useEffect(() => {
    async function fetchDonations() {
      try {
        const res = await fetch("/api/donations/recent");
        const data = await res.json();
        if (data.success) {
          setDonations(data.donations || []);
        }
      } catch (err) {
        console.error("Failed to fetch donations for ticker:", err);
      }
      setLoading(false);
    }

    fetchDonations();

    // Refresh every 30 seconds to pick up new verifications
    const interval = setInterval(fetchDonations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Animation loop using requestAnimationFrame
  const animate = useCallback(() => {
    const el = trackRef.current;
    if (!el) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    positionRef.current -= speedRef.current;

    const halfWidth = el.scrollWidth / 2;

    if (halfWidth > 0 && Math.abs(positionRef.current) >= halfWidth) {
      positionRef.current += halfWidth;
    }

    el.style.transform = `translateX(${positionRef.current}px)`;
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  if (loading || donations.length === 0) {
    return null; // Don't show anything if no verified donations yet
  }

  const getFirstName = (name: string) => name.split(" ")[0];

  // Duplicate for seamless infinite looping
  const duplicated = [...donations, ...donations];

  return (
    <div className="w-full py-3 bg-gradient-to-r from-[#FAF7F0] via-pink-50/50 to-[#FAF7F0] dark:from-[#1a1f2e] dark:via-pink-900/10 dark:to-[#1a1f2e] overflow-hidden relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#FAF7F0] dark:from-[#1a1f2e] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#FAF7F0] dark:from-[#1a1f2e] to-transparent z-10" />

      <div
        ref={trackRef}
        className="flex gap-6 whitespace-nowrap will-change-transform"
      >
        {duplicated.map((donation, index) => (
          <div
            key={`${donation.id}-${index}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/10 rounded-full border border-pink-200/50 dark:border-pink-800/30 shadow-sm flex-shrink-0"
          >
            <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400 flex-shrink-0" />
            <span className="font-mono text-sm text-[#2C2C2C] dark:text-gray-200">
              <strong>{getFirstName(donation.donor_name)}</strong>
              <span className="text-pink-600 dark:text-pink-400">
                {" "}donated{" "}
              </span>
              <strong className="text-pink-600 dark:text-pink-400">
                {"\u20B1"}{donation.amount.toLocaleString()}
              </strong>
              <span className="text-gray-500 dark:text-gray-400">
                {" "}to {donation.campaign_name}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
