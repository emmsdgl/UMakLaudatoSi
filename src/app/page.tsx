"use client";

/**
 * ============================================================================
 * MAIN HOMEPAGE - Public Landing & Guest Flow
 * ============================================================================
 * This page serves two purposes:
 * 1. Public landing page (unauthenticated users) - Shows plant, sign in CTA
 * 2. Guest flow (non-UMak users) - Can take 1-time pledge via modal
 * 
 * UMak users (@umak.edu.ph) are redirected to /home dashboard after sign in.
 * ============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/common/Header";
import { ThreePlant } from "@/components/plant/ThreePlant";
import { ContributorTicker } from "@/components/plant/ContributorTicker";
import { DonationTicker } from "@/components/plant/DonationTicker";
import { GrowthProgressBar } from "@/components/plant/GrowthProgressBar";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { DailyLimitMessage } from "@/components/common/DailyLimitMessage";
import { useRealtimeContributions, useRealtimePlantStats } from "@/hooks/useRealtime";
import { Flame, Trophy, Gift, Heart, Sparkles, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type PlantStage = "seed" | "sprout" | "plant" | "tree";
type Season = "Spring" | "Summer" | "Autumn" | "Winter";

function getRealSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

/**
 * Check if email is a UMak student/staff
 */
function isUMakUser(email: string | null | undefined): boolean {
  return email?.toLowerCase().endsWith('@umak.edu.ph') || false;
}

/**
 * Admin roles that should be redirected to admin dashboard
 */
const ADMIN_ROLES = ['admin', 'canteen_admin', 'finance_admin', 'sa_admin', 'super_admin'];

function getPlantStage(count: number): PlantStage {
  if (count >= 500) return 'tree';
  if (count >= 100) return 'plant';
  if (count >= 10) return 'sprout';
  return 'seed';
}

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { contributions: realtimeContributions, loading: contributionsLoading } = useRealtimeContributions();
  const { plantStats, loading: statsLoading } = useRealtimePlantStats();

  // Dev mode: activate with ?dev=true in URL
  const [isDevMode, setIsDevMode] = useState(false);
  const [devContributions, setDevContributions] = useState<number | null>(null);
  const [devSeason, setDevSeason] = useState<Season | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDevMode(params.get('dev') === 'true');
  }, []);

  const [showMilestone, setShowMilestone] = useState(false);

  // Time & Season State
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [season, setSeason] = useState<Season>("Spring");

  // Redirect authenticated users based on role
  // Admins → /admin dashboard
  // Regular users → /home dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any).role;
      
      // Check if user is admin
      if (userRole && ADMIN_ROLES.includes(userRole)) {
        router.push('/admin');
      } else {
        router.push('/home');
      }
    }
  }, [status, session, router]);

  // Initialize Time & Season
  useEffect(() => {
    setSeason(getRealSeason());
    const updateTime = () => {
      const now = new Date();
      setTimeOfDay(now.getHours() + now.getMinutes() / 60);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut({ callbackUrl: "/" });
  }, []);

  // Dev mode overrides real values for preview
  const realContributions = plantStats?.total_contributions || 0;
  const contributions = isDevMode && devContributions !== null ? devContributions : realContributions;
  const plantStage = isDevMode && devContributions !== null ? getPlantStage(devContributions) : (plantStats?.current_stage || "seed");
  const effectiveSeason = isDevMode && devSeason ? devSeason : season;
  const maxContributions = 1000;
  const milestones = [10, 50, 100, 200, 500];

  // Format contributors for display
  const formattedContributors = realtimeContributions.map((contrib: any) => ({
    id: contrib.id,
    name: contrib.users?.name || "Anonymous",
    pledge: contrib.pledge_text || null,
    _isNew: contrib._isNew || false,
    timestamp: new Date(contrib.created_at),
  }));

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading" || statsLoading || contributionsLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        userName={session?.user?.name || undefined} 
        onSignOut={isAuthenticated ? handleSignOut : undefined} 
      />

      <main className="flex-1 flex flex-col">
        {/* Plant Canvas Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative flex-shrink-0 h-[500px] w-full"
        >
          <ThreePlant
            contributions={contributions}
            contributors={formattedContributors}
            stage={plantStage as PlantStage}
            timeOfDay={timeOfDay}
            season={effectiveSeason}
          />

          {/* Stage indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-[#D4A574]/30 dark:border-[#D4A574]/20 shadow-sm"
            >
              <span className="font-display text-sm text-[#4A6B5C] dark:text-[#8BC68C] capitalize">
                Stage: {plantStage}
              </span>
            </motion.div>
          </div>
        </motion.section>

        {/* Progress Bar */}
        <section className="py-6 px-4">
          <GrowthProgressBar
            currentValue={contributions}
            maxValue={maxContributions}
            milestones={milestones}
          />
        </section>

        {/* Contributor Ticker */}
        <ContributorTicker contributors={formattedContributors} />

        {/* Donation Ticker */}
        <DonationTicker />

        {/* Main Content Area */}
        <section className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="w-12 h-12 border-4 border-[#81C784] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-muted-foreground">Loading...</p>
              </motion.div>
            ) : !isAuthenticated ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-md mx-auto text-center"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-8"
                >
                  <h2 className="font-display text-3xl md:text-4xl text-[#2C2C2C] dark:text-gray-100 mb-4">
                    Join the Growth
                  </h2>
                  <p className="font-body text-muted-foreground text-lg">
                    Answer eco-questions and help our campus plant thrive!
                  </p>
                </motion.div>

                <GoogleAuthButton />
              </motion.div>
            ) : (
              /* Authenticated user - redirecting to dashboard */
              <motion.div
                key="redirecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-12 h-12 border-4 border-[#81C784] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-muted-foreground">Redirecting to dashboard...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Footer */}
        <footer className="py-6 px-4 text-center">
          <p className="font-mono text-xs text-muted-foreground">
            Laudato Si&apos; — A UMak Environmental Initiative
          </p>
        </footer>
      </main>

      {/* Dev Controls Panel — activate with ?dev=true */}
      {isDevMode && (
        <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-white p-4 rounded-xl shadow-2xl w-72 font-mono text-xs space-y-3 border border-green-500/30">
          <div className="flex items-center justify-between">
            <span className="text-green-400 font-bold text-sm">DEV CONTROLS</span>
            <span className="text-gray-400">Stage: {plantStage}</span>
          </div>

          {/* Contributions slider */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Contributions</span>
              <span className="text-green-300">{contributions}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1200}
              value={devContributions ?? realContributions}
              onChange={(e) => setDevContributions(Number(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: "Seed (0)", val: 0 },
              { label: "Sprout (10)", val: 10 },
              { label: "Plant (100)", val: 100 },
              { label: "Tree (500)", val: 500 },
              { label: "Full (1000)", val: 1000 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setDevContributions(p.val)}
                className={`px-2 py-1 rounded text-xs border ${
                  contributions === p.val
                    ? "bg-green-600 border-green-400 text-white"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Season override */}
          <div>
            <span className="text-gray-400 block mb-1">Season</span>
            <div className="flex gap-1">
              {(["Spring", "Summer", "Autumn", "Winter"] as Season[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setDevSeason(s)}
                  className={`px-2 py-1 rounded text-xs border flex-1 ${
                    effectiveSeason === s
                      ? "bg-green-600 border-green-400 text-white"
                      : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={() => { setDevContributions(null); setDevSeason(null); }}
            className="w-full py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 border border-gray-500"
          >
            Reset to Live Data
          </button>
        </div>
      )}

      {/* Milestone celebration overlay */}
      <AnimatePresence>
        {showMilestone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            <div className="absolute inset-0 bg-gradient-radial from-[#C8E86C]/30 via-transparent to-transparent" />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-[#C8E86C] text-center">
                <h3 className="font-display text-3xl text-[#4A6B5C] dark:text-[#8BC68C] mb-2">
                  🎉 Thank You!
                </h3>
                <p className="font-body text-muted-foreground">
                  Your pledge helps our plant grow!
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
