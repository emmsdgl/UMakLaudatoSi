'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf,
  BookOpen,
  Calculator,
  Star,
  Flame,
  Trophy,
  Gift,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOUR_STORAGE_KEY = 'laudato-si-tour-completed';

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
  /** Route to navigate to when this step is active */
  route: string;
}

const tourSteps: TourStep[] = [
  {
    icon: <Leaf className="w-8 h-8 text-green-600" />,
    title: 'Welcome to Laudato Si\'!',
    description:
      'This is your Home dashboard. Here you\'ll see your plant grow, your stats, and quick actions. Let us show you around the app!',
    gradient: 'from-green-400 to-emerald-500',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    route: '/home',
  },
  {
    icon: <BookOpen className="w-8 h-8 text-emerald-600" />,
    title: 'Make Daily Pledges',
    description:
      'This is the Pledges page. Commit to eco-friendly actions every day, upload proof photos, and earn points for each pledge you complete.',
    gradient: 'from-emerald-400 to-teal-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    route: '/pledges',
  },
  {
    icon: <Calculator className="w-8 h-8 text-teal-600" />,
    title: 'Carbon Footprint Calculator',
    description:
      'Take a quick quiz here to discover your personal carbon footprint. Based on your results, we\'ll recommend an eco-path tailored for you.',
    gradient: 'from-teal-400 to-cyan-500',
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    route: '/calculator',
  },
  {
    icon: <Gamepad2 className="w-8 h-8 text-purple-600" />,
    title: 'Eco Wordle Game',
    description:
      'Play our daily eco-themed word game! Guess the 5-letter eco word, earn seeds, and build your streak on the leaderboard.',
    gradient: 'from-purple-400 to-violet-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    route: '/wordle',
  },
  {
    icon: <Gift className="w-8 h-8 text-pink-600" />,
    title: 'Redeem Rewards',
    description:
      'Use your earned points to claim real rewards! Browse available items here and redeem them using a QR code at the canteen.',
    gradient: 'from-pink-400 to-rose-500',
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
    route: '/rewards',
  },
  {
    icon: <Trophy className="w-8 h-8 text-amber-600" />,
    title: 'Climb the Rankings',
    description:
      'This is the leaderboard! Compete with fellow students, check where you stand, and push for the top spot.',
    gradient: 'from-amber-400 to-yellow-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    route: '/ranks',
  },
  {
    icon: (
      <div className="flex gap-1">
        <Star className="w-7 h-7 text-yellow-500" />
        <Flame className="w-7 h-7 text-orange-500" />
      </div>
    ),
    title: 'You\'re All Set!',
    description:
      'Earn points for every pledge and action. Keep a daily streak going to watch your plant grow from a seed into a mighty tree. Let\'s get started!',
    gradient: 'from-yellow-400 to-orange-500',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    route: '/home',
  },
];

interface GuidedTourProps {
  /** Force the tour open (e.g. from a "Replay Tour" button). */
  forceOpen?: boolean;
  /** Called when the tour finishes or is dismissed. */
  onComplete?: () => void;
}

export function GuidedTour({ forceOpen, onComplete }: GuidedTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setCurrentStep(0);
      setIsOpen(true);
      return;
    }

    // Auto-show for first-time users
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  // Navigate to the step's route when step changes
  useEffect(() => {
    if (!isOpen) return;
    const step = tourSteps[currentStep];
    if (step.route && pathname !== step.route) {
      router.push(step.route);
    }
  }, [isOpen, currentStep, pathname, router]);

  /** Dismiss without marking complete — tour will reappear next visit */
  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    // Navigate back to home when dismissing
    router.push('/home');
    onComplete?.();
  }, [onComplete, router]);

  /** Complete the tour — only called on the final step's button */
  const handleFinish = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    router.push('/home');
    onComplete?.();
  }, [onComplete, router]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Last step — mark as completed
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const goToStep = (idx: number) => {
    setCurrentStep(idx);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep]);

  // Touch swipe support for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStart(null);
  };

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Semi-transparent overlay — lets user see the page behind */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/30 pointer-events-none"
          />

          {/* Floating card at the bottom */}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[101] p-3 sm:p-4 lg:pl-[272px]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Gradient accent bar */}
              <div className={`h-1.5 bg-gradient-to-r ${step.gradient}`} />

              <div className="p-4 sm:p-5">
                {/* Top row: step counter + dismiss */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold tracking-wider uppercase bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                    Step {currentStep + 1} of {tourSteps.length}
                  </span>
                  <button
                    onClick={handleDismiss}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Dismiss tour (will show again)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content row: icon + text */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-4 items-start"
                  >
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl ${step.iconBg} flex items-center justify-center flex-shrink-0`}>
                      {step.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Bottom row: dots + nav buttons */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  {/* Progress dots */}
                  <div className="flex items-center gap-1.5">
                    {tourSteps.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => goToStep(idx)}
                        className={`rounded-full transition-all duration-300 ${
                          idx === currentStep
                            ? 'w-5 h-2 bg-green-500'
                            : idx < currentStep
                              ? 'w-2 h-2 bg-green-300 dark:bg-green-700'
                              : 'w-2 h-2 bg-gray-300 dark:bg-gray-600'
                        }`}
                        aria-label={`Go to step ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Nav buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrev}
                      disabled={currentStep === 0}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-8 px-2"
                    >
                      <ChevronLeft className="w-4 h-4 mr-0.5" />
                      Back
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleNext}
                      className={`bg-gradient-to-r ${step.gradient} text-white hover:opacity-90 h-8 px-4`}
                    >
                      {isLastStep ? (
                        "Let's Go!"
                      ) : (
                        <>
                          Next
                          <ChevronRight className="w-4 h-4 ml-0.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
